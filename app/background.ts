import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise.js";

/* =========================================================================
   Audio-reactive background

   A full-bleed field of particles + a wireframe shell that breathes with the
   track playing in the deck. Sits behind the whole page, both columns.

   Analysis taps the page's existing <audio> element rather than creating a
   second one, so there is exactly one thing playing and the visuals are driven
   by the audio the visitor actually hears.
   ========================================================================= */

/** Every tunable, per the reference scene's structure. */
const CONFIG = {
  maxPixelRatio: 1.75,

  shell: {
    radius: 3.4,
    detail: 14,
    /** Low: this sits directly behind body copy. */
    opacity: 0.1,
    noiseScale: 0.42,
    noiseTimeRate: 0.00035,
    /** Multiplied by smoothed bass. */
    displaceAmount: 0.8,
    /** Baseline wobble, so it is never perfectly still. */
    displaceFloor: 0.05,
    rotationSpeed: -0.045,
  },

  /** Drifting motes, so the field has depth behind the shell. */
  dust: {
    count: 900,
    spread: 16,
    depth: 12,
    size: 0.03,
    opacity: 0.3,
    /** Vertical drift, units/sec, scaled by mid. */
    rise: 0.16,
    twinkleRate: 1.7,
  },

  /**
   * Deliberately restrained. Bloom is what made text unreadable: it smears
   * bright pixels outward over the copy, and no amount of text shadow fixes
   * a glow blooming from behind the glyphs.
   */
  bloom: {
    strength: 0.22,
    /** Added at full bass — kept tight so it never strobes. */
    strengthBass: 0.18,
    radius: 0.6,
    threshold: 0.35,
  },

  /**
   * Colour. Saturation and lightness are held well below the disc-face values:
   * the field is a backdrop for text, not a light show, so it takes the disc's
   * hue but stays deep and desaturated.
   */
  palette: {
    shellSat: 0.4,
    /** Resting lightness, with nothing playing. */
    shellLight: 0.42,
    /** Added at full loudness — this is what makes it visibly brighten. */
    shellLightBoost: 0.4,
    dustSat: 0.3,
    dustLight: 0.5,
    dustLightBoost: 0.35,
  },

  /**
   * Grain strength, in 0..1 colour units. 3-5% is the band where it dithers
   * banding without reading as noise; above that it looks like a dirty lens.
   */
  grain: {
    amount: 0.04,
  },

  /**
   * Cursor parallax. The camera leans a couple of degrees toward the pointer,
   * heavily damped so it trails rather than tracks — instant response reads as
   * jitter, not depth.
   */
  parallax: {
    /** World units of camera offset at full deflection. */
    strength: 0.55,
    /** Per-frame approach rate toward the pointer target. Low = heavy. */
    damping: 0.035,
  },

  camera: {
    fov: 46,
    near: 0.1,
    far: 120,
    z: 9.5,
    /** A few degrees of sine orbit. */
    driftRadius: 0.5,
    driftHeight: 0.3,
    driftSpeed: 0.00009,
  },

  audio: {
    fftSize: 512,
    smoothing: 0.8,
    /** Manual lerp on top of the analyser's own smoothing. */
    lerp: 0.15,
    bassBins: [0, 12] as const,
    midBins: [12, 60] as const,
    trebleBins: [60, 160] as const,
  },

  /** Layered sines, so the scene is alive before anything is played. */
  fallback: {
    bass: [
      { rate: 0.00021, amp: 0.3 },
      { rate: 0.00047, amp: 0.16 },
      { rate: 0.00113, amp: 0.07 },
    ],
    mid: [
      { rate: 0.00037, amp: 0.26 },
      { rate: 0.00089, amp: 0.12 },
    ],
    treble: [
      { rate: 0.00061, amp: 0.2 },
      { rate: 0.00151, amp: 0.1 },
    ],
    base: 0.34,
  },
};

export type BackgroundHandle = {
  /** Hues of the loaded disc, so the field matches the current section. */
  setHues: (hueA: number, hueB: number) => void;
  /**
   * Current smoothed band levels, 0..1. The analyser lives here because this is
   * what owns the AudioContext, so other animated layers (the deck's speaker
   * cones) read the same numbers rather than each building their own graph off
   * the one audio element — createMediaElementSource can only be called once
   * per element, so a second graph is not even possible.
   */
  getLevels: () => { bass: number; mid: number; treble: number };
  /** Whether a track is actually playing — gates the reactive intensity. */
  setPlaying: (v: boolean) => void;
  /**
   * Attach the analyser to the page's audio element. Must be called from a
   * user gesture: constructing an AudioContext outside one leaves it
   * "suspended", and createMediaElementSource on a suspended context yields
   * silence with no error.
   */
  connectAudio: (el: HTMLAudioElement) => void;
  dispose: () => void;
};

type Layer = { rate: number; amp: number };

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * Mounts the background into `host` and returns a handle. Returns null when
 * WebGL is unavailable, so the caller can simply carry on without a backdrop.
 */
export function createBackground(host: HTMLElement): BackgroundHandle | null {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null; // No WebGL — the page keeps its flat background.
  }
  host.appendChild(canvas);

  const pixelRatio = Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  let width = Math.max(1, host.clientWidth);
  let height = Math.max(1, host.clientHeight);
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    CONFIG.camera.fov,
    width / height,
    CONFIG.camera.near,
    CONFIG.camera.far,
  );
  camera.position.set(0, 0, CONFIG.camera.z);

  /* --- the wireframe shell --------------------------------------------- */
  // Icosahedron rather than the reference's sphere-by-detail: at this scale the
  // triangle mesh reads as a lattice instead of a globe.
  const shellGeo = new THREE.IcosahedronGeometry(
    CONFIG.shell.radius,
    CONFIG.shell.detail,
  );
  const shellMat = new THREE.MeshBasicMaterial({
    color: 0x49d6ff,
    wireframe: true,
    transparent: true,
    opacity: CONFIG.shell.opacity,
    depthWrite: false,
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  scene.add(shell);

  // Cache the rest pose ONCE. Every frame recomputes each vertex from this
  // immutable copy, never from the live buffer — otherwise displacement
  // compounds frame over frame and the mesh inflates without bound.
  const shellPos = shellGeo.attributes.position;
  const restPositions = new Float32Array(shellPos.array as Float32Array);
  const noise = new ImprovedNoise();
  const vTmp = new THREE.Vector3();

  function displace(elapsedMs: number, bass: number) {
    if (reduceMotion) return;
    const arr = shellPos.array as Float32Array;
    const s = CONFIG.shell.noiseScale;
    const t = elapsedMs * CONFIG.shell.noiseTimeRate;
    const amount = CONFIG.shell.displaceFloor + bass * CONFIG.shell.displaceAmount;

    for (let i = 0; i < arr.length; i += 3) {
      const x = restPositions[i];
      const y = restPositions[i + 1];
      const z = restPositions[i + 2];
      // The rest pose is centred on the origin, so the normalized rest
      // position IS the surface normal — displace along it.
      vTmp.set(x, y, z).normalize();
      const n = noise.noise(x * s + t, y * s, z * s); // -1..1
      const d = n * amount * CONFIG.shell.radius * 0.35;
      arr[i] = x + vTmp.x * d;
      arr[i + 1] = y + vTmp.y * d;
      arr[i + 2] = z + vTmp.z * d;
    }
    shellPos.needsUpdate = true;
  }

  /* --- dust ------------------------------------------------------------ */
  const dustGeo = new THREE.BufferGeometry();
  const dustCount = CONFIG.dust.count;
  const dustPos = new Float32Array(dustCount * 3);
  // Per-particle phase, so twinkling is not synchronized across the field.
  const dustPhase = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * CONFIG.dust.spread;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * CONFIG.dust.spread;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * CONFIG.dust.depth;
    dustPhase[i] = Math.random() * Math.PI * 2;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0x8fd8ff,
    size: CONFIG.dust.size,
    transparent: true,
    opacity: CONFIG.dust.opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  /* --- post ------------------------------------------------------------ */
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(width, height);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    CONFIG.bloom.strength,
    CONFIG.bloom.radius,
    CONFIG.bloom.threshold,
  );
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  // Film grain, as the final pass. Dark gradients on an 8-bit display band into
  // visible steps, and a little per-pixel noise dithers those steps away — it is
  // the cheapest thing that stops a smooth dark field looking cheap.
  //
  // Applied in the shader rather than as a tiled PNG overlay: there is already a
  // composer pass running, so this costs one extra fullscreen draw and no
  // texture fetch, and the grain resamples every frame instead of sitting in a
  // fixed tile pattern that reads as a static texture.
  const grainPass = new ShaderPass({
    name: "GrainShader",
    uniforms: {
      tDiffuse: { value: null },
      uAmount: { value: CONFIG.grain.amount },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform sampler2D tDiffuse;
      uniform float uAmount;
      uniform float uTime;
      varying vec2 vUv;

      // Cheap hash — no texture, no trig.
      float hash(vec2 p){
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main(){
        vec4 src = texture2D(tDiffuse, vUv);
        // Offsetting the sample point by time makes the grain resample each
        // frame; without it the pattern freezes onto the pixels.
        float n = hash(vUv * 1024.0 + uTime) - 0.5;
        // Scaled by alpha so grain never shows on the fully transparent
        // regions, which would otherwise haze the page background around the
        // field's edges.
        gl_FragColor = vec4(src.rgb + n * uAmount, src.a);
      }
    `,
  });
  composer.addPass(grainPass);

  // EffectComposer's default target is opaque, which would paint a black sheet
  // over the page's own background. Both targets need alpha for the canvas to
  // composite over the page.
  composer.renderTarget1.texture.format = THREE.RGBAFormat;
  composer.renderTarget2.texture.format = THREE.RGBAFormat;

  /* --- audio ----------------------------------------------------------- */
  const levels = { bass: 0, mid: 0, treble: 0 };
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;
  // Explicitly backed by ArrayBuffer (not ArrayBufferLike): as of TS 5.7
  // Uint8Array is generic over its buffer, and getByteFrequencyData demands
  // the ArrayBuffer instantiation.
  let freqData: Uint8Array<ArrayBuffer> | null = null;
  let connectedEl: HTMLAudioElement | null = null;

  function bandAverage(range: readonly [number, number]) {
    if (!freqData) return 0;
    const [a, b] = range;
    const hi = Math.min(b, freqData.length);
    let sum = 0;
    let n = 0;
    for (let i = a; i < hi; i++) {
      sum += freqData[i];
      n++;
    }
    return n ? sum / n / 255 : 0;
  }

  function syntheticBand(layers: Layer[], t: number) {
    let v = CONFIG.fallback.base;
    for (const l of layers) v += Math.sin(t * l.rate) * l.amp;
    return Math.min(1, Math.max(0, v));
  }

  function updateLevels(elapsedMs: number) {
    let bass: number;
    let mid: number;
    let treble: number;
    const live =
      analyser && freqData && connectedEl && !connectedEl.paused;
    if (live) {
      analyser!.getByteFrequencyData(freqData!);
      bass = bandAverage(CONFIG.audio.bassBins);
      mid = bandAverage(CONFIG.audio.midBins);
      treble = bandAverage(CONFIG.audio.trebleBins);
    } else {
      bass = syntheticBand(CONFIG.fallback.bass, elapsedMs);
      mid = syntheticBand(CONFIG.fallback.mid, elapsedMs);
      treble = syntheticBand(CONFIG.fallback.treble, elapsedMs);
    }
    const k = CONFIG.audio.lerp;
    levels.bass = lerp(levels.bass, bass, k);
    levels.mid = lerp(levels.mid, mid, k);
    levels.treble = lerp(levels.treble, treble, k);
  }

  /* --- state driven from React ----------------------------------------- */
  let hueA = 195;
  let hueB = 280;
  let targetHueA = 195;
  let targetHueB = 280;
  let playing = false;

  const shellColor = new THREE.Color();
  const dustColor = new THREE.Color();

  /* --- cursor parallax -------------------------------------------------- */
  // Normalized to -1..1 across the viewport. Tracked on the window rather than
  // the canvas: the canvas is pointer-events-none, so it never sees a move.
  let pointerX = 0;
  let pointerY = 0;
  let parallaxX = 0;
  let parallaxY = 0;

  const onPointerMove = (e: PointerEvent) => {
    pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    // Inverted: moving the pointer up should raise the camera, and screen Y
    // grows downward.
    pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  // passive — this only reads coordinates and must never delay scrolling.
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  /* --- loop ------------------------------------------------------------ */
  const start = performance.now();
  let prev = start;
  let frame = 0;

  const animate = (now: number) => {
    frame = requestAnimationFrame(animate);
    const elapsed = now - start;
    const dt = Math.min(64, now - prev) / 1000;
    prev = now;

    updateLevels(elapsed);

    // Hues ease toward the loaded disc's, so swapping discs cross-fades the
    // whole backdrop instead of cutting to the new colour.
    hueA += (targetHueA - hueA) * Math.min(dt * 3, 1);
    hueB += (targetHueB - hueB) * Math.min(dt * 3, 1);
    // Idle keeps a low floor so the field never looks switched off; playing
    // opens it up and lets the bands actually drive it.
    const gate = playing ? 1 : 0.45;

    // Overall loudness, weighted toward bass and mids — that is where perceived
    // "louder" lives, and keying off treble alone makes the field flare on
    // hi-hats while ignoring the actual body of the track.
    const loud = levels.bass * 0.5 + levels.mid * 0.35 + levels.treble * 0.15;

    // Brightness is driven through HSL lightness, not just opacity: a more
    // opaque dim wireframe still looks dim, whereas raising lightness is what
    // actually reads as the geometry getting brighter. `loud` is gated so a
    // paused deck settles back to the resting palette.
    const pal = CONFIG.palette;
    const lift = loud * gate;
    shellColor.setHSL(
      ((((hueA % 360) + 360) % 360) / 360),
      pal.shellSat,
      Math.min(pal.shellLight + lift * pal.shellLightBoost, 0.95),
    );
    dustColor.setHSL(
      ((((hueB % 360) + 360) % 360) / 360),
      pal.dustSat,
      Math.min(pal.dustLight + lift * pal.dustLightBoost, 0.98),
    );
    shellMat.color.copy(shellColor);
    dustMat.color.copy(dustColor);

    shellMat.opacity =
      CONFIG.shell.opacity * gate * (0.7 + levels.treble * 0.9 + lift * 0.8);
    dustMat.opacity =
      CONFIG.dust.opacity * gate * (0.55 + levels.mid * 0.8 + lift * 0.6);

    // Resample the grain each frame. Wrapped so the value stays small enough
    // for mediump float in the shader to resolve it.
    grainPass.uniforms.uTime.value = (elapsed * 0.001) % 100;

    if (!reduceMotion) {
      shell.rotation.y += CONFIG.shell.rotationSpeed * dt;
      shell.rotation.x += CONFIG.shell.rotationSpeed * 0.35 * dt;
      displace(elapsed, levels.bass * gate);

      // Dust rises and wraps, faster with mids. Twinkle rides the per-particle
      // phase so the field shimmers rather than pulsing as one.
      const arr = dustGeo.attributes.position.array as Float32Array;
      const rise = CONFIG.dust.rise * (0.4 + levels.mid) * dt;
      const halfSpread = CONFIG.dust.spread / 2;
      for (let i = 0; i < dustCount; i++) {
        const yi = i * 3 + 1;
        arr[yi] += rise;
        if (arr[yi] > halfSpread) arr[yi] = -halfSpread;
      }
      dustGeo.attributes.position.needsUpdate = true;
      dustMat.size =
        CONFIG.dust.size *
        (1 + levels.treble * 0.5) *
        (0.9 +
          Math.sin(elapsed * 0.001 * CONFIG.dust.twinkleRate) * 0.1);

      // Camera drift — a slow sine orbit, plus a damped lean toward the cursor.
      // No OrbitControls: this canvas is a backdrop behind the page's own
      // controls and takes no pointer input, so the pointer is sampled from the
      // window instead of from canvas events.
      //
      // The parallax offset eases toward the pointer at a low rate, so the
      // camera trails the cursor by a beat. That lag is the whole effect: a
      // camera that tracks the pointer exactly reads as a stuck element, while
      // one that drifts after it reads as depth.
      parallaxX += (pointerX * CONFIG.parallax.strength - parallaxX) *
        CONFIG.parallax.damping;
      parallaxY += (pointerY * CONFIG.parallax.strength - parallaxY) *
        CONFIG.parallax.damping;

      const a = elapsed * CONFIG.camera.driftSpeed;
      camera.position.x =
        Math.sin(a) * CONFIG.camera.driftRadius + parallaxX;
      camera.position.y =
        Math.cos(a * 0.7) * CONFIG.camera.driftHeight + parallaxY;
      // Look at a point nudged opposite the lean, which turns a sideways slide
      // into a slight rotation — parallax between the shell and the dust behind
      // it, rather than the whole field panning as one flat layer.
      camera.lookAt(-parallaxX * 0.35, -parallaxY * 0.35, 0);
    }

    // Bloom breathes with overall loudness inside a deliberately narrow range —
    // the glow swelling with the track is most of what sells "brighter", but a
    // wide range here is what made the text unreadable, so the ceiling stays low.
    bloomPass.strength =
      CONFIG.bloom.strength + loud * CONFIG.bloom.strengthBass * gate;

    composer.render();
  };
  frame = requestAnimationFrame(animate);

  /* --- resize ---------------------------------------------------------- */
  const ro = new ResizeObserver(() => {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    bloomPass.setSize(width, height);
  });
  ro.observe(host);

  return {
    setHues: (a, b) => {
      targetHueA = a;
      targetHueB = b;
    },
    // Returns the live object, not a copy: it is read once per frame by the
    // deck's own render loop and allocating a fresh object every frame for it
    // would be pure garbage.
    getLevels: () => levels,
    setPlaying: (v) => {
      playing = v;
    },
    connectAudio: (el) => {
      // One source node per element for the lifetime of the context:
      // createMediaElementSource throws if called twice on the same element.
      if (connectedEl === el && sourceNode) {
        audioCtx?.resume().catch(() => {});
        return;
      }
      if (sourceNode) return; // Already bound to some element.
      try {
        const Ctx: typeof AudioContext =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctx) return;
        audioCtx = new Ctx();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = CONFIG.audio.fftSize;
        analyser.smoothingTimeConstant = CONFIG.audio.smoothing;
        freqData = new Uint8Array(
          new ArrayBuffer(analyser.frequencyBinCount),
        );
        sourceNode = audioCtx.createMediaElementSource(el);
        // Routing through the analyser diverts the element's output into the
        // graph. Connecting on to `destination` is what keeps it audible — omit
        // this and the track plays silently with no error anywhere.
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        connectedEl = el;
        audioCtx.resume().catch(() => {});
      } catch {
        // Analysis is optional; on failure the synthetic fallback drives the
        // scene and playback continues untouched through the element itself.
        analyser = null;
        freqData = null;
        sourceNode = null;
        connectedEl = null;
      }
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);

      try {
        sourceNode?.disconnect();
        analyser?.disconnect();
      } catch {
        // Already torn down.
      }
      // Closing the context releases the element from the graph so a later
      // mount can call createMediaElementSource on it again.
      audioCtx?.close().catch(() => {});
      audioCtx = null;
      analyser = null;
      sourceNode = null;
      freqData = null;
      connectedEl = null;

      shellGeo.dispose();
      shellMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      grainPass.dispose();
      bloomPass.dispose();
      composer.renderTarget1.dispose();
      composer.renderTarget2.dispose();
      composer.dispose();
      renderer.dispose();
      // Required as of Next 16 — dispose() alone does not release the context
      // across the App Router's remount cycle, and browsers cap live contexts.
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
