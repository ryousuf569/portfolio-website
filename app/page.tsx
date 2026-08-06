"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Disposables, buildBoombox, type ControlId } from "./boombox";

/* =========================================================================
   Disc data
   ========================================================================= */

type Disc = {
  id: string;
  title: string;
  /** Short label printed on the disc face. */
  short: string;
  /** Two hues driving the disc's iridescent sheen. */
  hueA: number;
  hueB: number;
  /** Path under /public. Opus @ 64k VBR — see the note in README/AGENTS. */
  audio: string;
  /** Seconds into the track where playback should begin on insert. */
  startAt: number;
  body: React.ReactNode;
};

const DISCS: Disc[] = [
  {
    id: "about",
    title: "About Me",
    short: "ABOUT",
    hueA: 195,
    hueB: 280,
    audio: "/touch-my-face.ogg",
    startAt: 0,
    body: (
      <>
        <p>
          TODO — replace with your bio. A paragraph on who you are, what you
          build, and what you&apos;re drawn to.
        </p>
        <p>
          TODO — a second paragraph: background, what you&apos;re currently
          focused on, or what you&apos;re looking for next.
        </p>
      </>
    ),
  },
  {
    id: "experience",
    title: "Experience",
    short: "EXP",
    hueA: 25,
    hueB: 330,
    audio: "/buzz-me-in.ogg",
    startAt: 162, // 2:42
    body: (
      <ul>
        <li>
          <strong>TODO — Role</strong> · Company · Year–Year
          <br />
          What you did and what it changed.
        </li>
        <li>
          <strong>TODO — Role</strong> · Company · Year–Year
          <br />
          What you did and what it changed.
        </li>
        <li>
          <strong>TODO — Role</strong> · Company · Year–Year
          <br />
          What you did and what it changed.
        </li>
      </ul>
    ),
  },
  {
    id: "projects",
    title: "Projects",
    short: "PROJ",
    hueA: 140,
    hueB: 200,
    audio: "/forbearance-mm.ogg",
    startAt: 45, // 0:45
    body: (
      <ul>
        <li>
          <strong>TODO — Project name</strong>
          <br />
          One line on what it does and what you used to build it.
        </li>
        <li>
          <strong>TODO — Project name</strong>
          <br />
          One line on what it does and what you used to build it.
        </li>
        <li>
          <strong>TODO — Project name</strong>
          <br />
          One line on what it does and what you used to build it.
        </li>
      </ul>
    ),
  },
  {
    id: "links",
    title: "Links",
    short: "LINKS",
    hueA: 45,
    hueB: 15,
    audio: "/ladybird-mm1.ogg",
    startAt: 42, // 0:42
    body: (
      <ul>
        <li>
          TODO — GitHub · <span className="opacity-60">your-url-here</span>
        </li>
        <li>
          TODO — LinkedIn · <span className="opacity-60">your-url-here</span>
        </li>
        <li>
          TODO — Email · <span className="opacity-60">you@example.com</span>
        </li>
        <li>
          TODO — Resume · <span className="opacity-60">your-url-here</span>
        </li>
      </ul>
    ),
  },
];

/* =========================================================================
   WebGL disc
   ========================================================================= */

const discVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Single-pass procedural CD face: data-track rings, an iridescent sheen that
// sweeps with rotation, a label hub and a centre hole. No textures, no render
// targets — one quad, a few dozen ALU ops per pixel.
const discFragmentShader = /* glsl */ `
  precision mediump float;

  uniform float uAngle;
  uniform float uHueA;
  uniform float uHueB;
  uniform float uSheen;
  varying vec2 vUv;

  vec3 hsl2rgb(vec3 c){
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  void main(){
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);

    // Outside the disc / inside the spindle hole -> fully transparent.
    if (r > 1.0 || r < 0.115) discard;

    float a = atan(p.y, p.x);

    // Rotate the sheen with the disc so the highlight sweeps while spinning.
    float sweep = a + uAngle;

    // Iridescence: two hues interfering, banded by radius so the rainbow
    // walks outward the way it does on a real pressed disc.
    float band = sin(r * 46.0 - uAngle * 0.6) * 0.5 + 0.5;
    float hue = mix(uHueA, uHueB, band) / 360.0;
    hue += sin(sweep * 2.0) * 0.04;

    vec3 base = hsl2rgb(vec3(fract(hue), 0.55, 0.42));

    // Fine concentric data tracks.
    float tracks = sin(r * 420.0) * 0.5 + 0.5;
    base *= 0.88 + tracks * 0.12;

    // Two specular lobes 180 degrees apart, as a real disc catches light.
    float lobe = pow(abs(cos(sweep)), 8.0);
    base += vec3(1.0) * lobe * 0.42 * uSheen;

    // Label hub: flat, brighter, with a thin boundary ring.
    float hub = smoothstep(0.34, 0.325, r);
    vec3 hubColor = mix(base, vec3(0.93, 0.93, 0.95), 0.88);
    base = mix(base, hubColor, hub);
    base = mix(base, vec3(0.25), smoothstep(0.006, 0.0, abs(r - 0.33)));

    // Outer rim darkening + soft antialiased edge.
    base *= 1.0 - smoothstep(0.93, 1.0, r) * 0.5;
    float alpha = smoothstep(1.0, 0.985, r) * smoothstep(0.115, 0.125, r);

    gl_FragColor = vec4(base, alpha);
  }
`;

/**
 * A rejected play() promise says little on its own. When the element also
 * carries a MediaError, that code is the more specific diagnosis — in
 * particular SRC_NOT_SUPPORTED, which is what a codec/container mismatch
 * surfaces as.
 */
function describeMediaError(err: unknown, el: HTMLAudioElement): string {
  const me = el.error;
  if (me) {
    switch (me.code) {
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return "This browser can't play Opus in an Ogg container. Try Chrome, Firefox, or Edge.";
      case MediaError.MEDIA_ERR_DECODE:
        return "The audio file appears to be corrupt.";
      case MediaError.MEDIA_ERR_NETWORK:
        return "Network error while loading the track.";
      case MediaError.MEDIA_ERR_ABORTED:
        return "Loading was aborted.";
    }
  }
  if (err instanceof Error) {
    // NotAllowedError is the autoplay policy, not a file problem.
    if (err.name === "NotAllowedError") {
      return "Playback needs a click first (browser autoplay policy).";
    }
    return err.message;
  }
  return "Playback failed.";
}

type DiscStageHandle = {
  /** 0 = lid closed, 1 = lid fully open with the disc raised. */
  setEject: (v: number) => void;
  setSpinning: (v: boolean) => void;
  setDisc: (hueA: number, hueB: number) => void;
  setVisible: (v: boolean) => void;
  /** Drives the LCD backlight and the play LED. */
  setPlaying: (v: boolean) => void;
  /** Depresses a fascia button cap, for click feedback. */
  pressControl: (id: ControlId) => void;
};

/**
 * @param hostRef Wrapper the stage mounts its canvas into.
 *
 * The canvas is created here rather than rendered by React on purpose.
 * Cleanup has to call `forceContextLoss()` (see the Next 16 WebGL guide), and
 * that permanently kills the context bound to the canvas element. React reuses
 * the same DOM node across Strict Mode's unmount/remount, so a JSX-owned
 * canvas would hand mount #2 a dead context and render nothing. Owning the
 * element means it's discarded with the context that died with it.
 */
function useDiscStage(
  hostRef: React.RefObject<HTMLDivElement | null>,
): React.RefObject<DiscStageHandle | null> {
  const handleRef = useRef<DiscStageHandle | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    host.appendChild(canvas);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
    } catch {
      canvas.remove(); // No WebGL — leave the host empty.
      return;
    }
    renderer.setClearAlpha(0);
    // Physically-shaded plastic needs tone mapping, otherwise the speculars on
    // the gloss-black shell clip to flat white.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    // Framed slightly above and in front, matching the reference's 3/4 view.
    // Pulled back far enough that the raised antenna stays in frame.
    // Front-on with the top deck just visible, like the reference product shot.
    // A lower camera hides the upper deck entirely (the CD lid, spindle and
    // knobs all sit up there); a much higher one turns it into a plan view.
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 2.6, 5.2);
    camera.lookAt(0, 0.05, 0);

    // Disposal registry for every geometry/material the rig allocates.
    const d = new Disposables();

    // Gloss black is only glossy because it mirrors an environment. With bare
    // directional lights the clearcoat has nothing to reflect and the CD lid
    // renders as a flat black void, so build a small procedural env map: a
    // bright band above (a softbox) over a dark floor.
    const envScene = new THREE.Scene();
    const envGeo = new THREE.SphereGeometry(10, 24, 16);
    const envMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: /* glsl */ `
        varying vec3 vPos;
        void main(){
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        varying vec3 vPos;
        void main(){
          vec3 dir = normalize(vPos);
          // Bright overhead softbox falling off to a dim floor. The floor is
          // lifted off pure black on purpose: the CD lid tilts to face downward
          // when it swings open, and a black lower hemisphere renders it as an
          // unlit void.
          float up = smoothstep(-0.1, 0.75, dir.y);
          vec3 col = mix(vec3(0.10, 0.11, 0.14), vec3(0.85, 0.9, 1.0), up);
          // A brighter streak just above the horizon reads as a studio strip
          // light and gives the shell its long highlight.
          col += vec3(0.5, 0.55, 0.62) * smoothstep(0.16, 0.0, abs(dir.y - 0.26));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    envScene.add(new THREE.Mesh(envGeo, envMat));

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(envScene);
    scene.environment = envRT.texture;
    // The generator and its source scene are done once the cubemap exists.
    pmrem.dispose();
    envGeo.dispose();
    envMat.dispose();
    d.track(envRT);

    /* --- lighting ------------------------------------------------------- */
    // Gloss black reads as a flat silhouette under diffuse light alone; it
    // needs bright, well-separated sources to make the plastic look wet.
    // The env map above supplies most of the ambient and all the reflections,
    // so these are lower than they'd need to be on their own — they're here for
    // directional shaping and the crisp speculars, not overall exposure.
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3.2, 4.5, 5.0);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xbcd4ff, 0.5);
    fill.position.set(-4.5, 1.4, 3.0);
    scene.add(fill);

    // Rim from behind picks out the top edge of the shell and the handle.
    const rim = new THREE.DirectionalLight(0x9fd8ff, 1.1);
    rim.position.set(-1.5, 3.0, -4.5);
    scene.add(rim);

    /* --- the deck ------------------------------------------------------- */
    const rig = buildBoombox(d);
    scene.add(rig.root);

    /* --- the disc ------------------------------------------------------- */
    const uniforms = {
      uAngle: { value: 0 },
      uHueA: { value: 195 },
      uHueB: { value: 280 },
      uSheen: { value: 1 },
    };

    // Sized to sit inside the lid well's trim ring rather than overhang it.
    const discGeo = d.track(new THREE.PlaneGeometry(1.24, 1.24));
    const discMat = d.track(
      new THREE.ShaderMaterial({
        vertexShader: discVertexShader,
        fragmentShader: discFragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const disc = new THREE.Mesh(discGeo, discMat);
    rig.discMount.add(disc);


    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let spinning = false;
    let playing = false;
    let visible = false;
    let eject = 0;
    let angle = 0;
    let spinRate = 0;
    let lidAngle = 0;
    let discLift = 0;
    let elapsed = 0;

    // Hues tween toward their target so swapping discs cross-fades.
    let hueA = 195;
    let hueB = 280;
    let targetHueA = 195;
    let targetHueB = 280;

    // Press animations, keyed by control. Value counts down to 0.
    const pressed = new Map<ControlId, number>();

    handleRef.current = {
      setEject: (v) => {
        eject = v;
      },
      setSpinning: (v) => {
        spinning = v;
      },
      setDisc: (a, b) => {
        targetHueA = a;
        targetHueB = b;
      },
      setVisible: (v) => {
        visible = v;
      },
      setPlaying: (v) => {
        playing = v;
      },
      pressControl: (id) => {
        pressed.set(id, 0.16);
      },
    };

    let frame = 0;
    let last = performance.now();

    const animate = () => {
      frame = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      // Note: no early-out on `visible` here. The deck itself is always on
      // screen — only the disc comes and goes.

      // Spin up / coast down rather than snapping between rates.
      const target = spinning && !reduceMotion ? 3.4 : 0;
      spinRate += (target - spinRate) * Math.min(dt * 2.2, 1);
      angle += spinRate * dt;

      hueA += (targetHueA - hueA) * Math.min(dt * 4, 1);
      hueB += (targetHueB - hueB) * Math.min(dt * 4, 1);

      uniforms.uAngle.value = angle;
      uniforms.uHueA.value = hueA;
      uniforms.uHueB.value = hueB;
      // Sheen dims slightly while parked so a stopped disc looks inert.
      uniforms.uSheen.value = 0.55 + Math.min(spinRate / 3.4, 1) * 0.45;

      // The disc only exists when one is loaded.
      disc.visible = visible;
      disc.rotation.z = angle;
      // Sit the disc proud of the deck whenever one is loaded. A real deck
      // swallows the disc once the lid shuts, but here the disc art is what
      // tells you which section is playing, so it stays readable. discMount is
      // rotated -90° about X, so its local +Z is world +Y.
      discLift += ((visible ? 0.3 : 0) - discLift) * Math.min(dt * 4, 1);
      disc.position.z = discLift + eject * 0.12;

      // Lid swings open on its rear hinge, easing toward the target.
      lidAngle += (eject * -1.15 - lidAngle) * Math.min(dt * 5, 1);
      rig.lid.rotation.x = lidAngle;

      // Tip the raised disc toward the camera so its sheen reads instead of
      // presenting edge-on. Keyed to the lift so it tilts as it rises.
      rig.discMount.rotation.x = -Math.PI / 2 + (discLift / 0.3) * 0.62;

      // LCD brightens while playing, with a faint flicker the way a backlit
      // segment display wavers under load.
      const lcdTarget = playing ? 1.45 : 0.8;
      rig.lcdMaterial.emissiveIntensity +=
        (lcdTarget - rig.lcdMaterial.emissiveIntensity) * Math.min(dt * 3, 1);
      if (playing && !reduceMotion) {
        rig.lcdMaterial.emissiveIntensity += Math.sin(elapsed * 9) * 0.03;
      }

      const ledTarget = playing ? 2.4 : 0;
      rig.ledMaterial.emissiveIntensity +=
        (ledTarget - rig.ledMaterial.emissiveIntensity) * Math.min(dt * 4, 1);

      // Button caps sink while their press animation runs.
      for (const [id, remaining] of pressed) {
        const next = remaining - dt;
        const mesh = rig.controls[id];
        if (next <= 0) {
          pressed.delete(id);
          mesh.position.z = mesh.userData.restZ as number;
        } else {
          pressed.set(id, next);
          mesh.position.z = (mesh.userData.restZ as number) - 0.022;
        }
      }

      // The deck is held square to the camera on purpose. The fascia buttons
      // are HTML hit targets positioned over the modelled caps, and an idle
      // sway would slide the caps out from under their labels every frame.
      // The env map still gives the shell moving highlights as the disc spins.

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      handleRef.current = null;
      // Renderer disposal does not cascade to scene contents.
      d.disposeAll();
      renderer.dispose();
      // Required as of Next 16 — dispose() alone does not release the context
      // across the App Router's remount cycle, and browsers cap live contexts.
      renderer.forceContextLoss();
      // The context above is now unusable, so the element goes with it. The
      // next mount builds a fresh canvas.
      canvas.remove();
    };
  }, [hostRef]);

  return handleRef;
}

/* =========================================================================
   Page
   ========================================================================= */

type Status = "empty" | "loaded" | "playing";

export default function Home() {
  const stageHostRef = useRef<HTMLDivElement>(null);
  const stage = useDiscStage(stageHostRef);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Which disc is selected in the rack. Null = tray is empty.
  const [loaded, setLoaded] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("empty");
  // Tray open state drives both the CSS drawer and the WebGL eject offset.
  const [trayOpen, setTrayOpen] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  // Index of the disc currently being dragged out of the rack, and whether the
  // pointer is over the deck. Both are presentation-only.
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOverDeck, setDragOverDeck] = useState(false);

  const disc = loaded === null ? null : DISCS[loaded];

  // Mirrors `status` so the disc-change effect can read it without listing it
  // as a dependency (which would re-cue the track on every play/pause).
  const statusRef = useRef<Status>(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Push disc identity + spin state down to the WebGL layer.
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    s.setVisible(loaded !== null);
    if (disc) s.setDisc(disc.hueA, disc.hueB);
    s.setSpinning(status === "playing");
    s.setPlaying(status === "playing");
    s.setEject(trayOpen ? 1 : 0);
  }, [stage, loaded, disc, status, trayOpen]);

  /**
   * Runs a control's action and depresses its 3D cap. Deliberately not
   * memoized: it reads stage.current, which a useCallback can't track, and
   * five button handlers don't justify the ceremony.
   */
  const pressControl = (id: ControlId, action: () => void) => {
    stage.current?.pressControl(id);
    action();
  };

  /** Load a disc from the rack: close the tray and cue it up, stopped. */
  const insert = useCallback((index: number) => {
    setLoaded(index);
    setStatus("loaded");
    setTrayOpen(false);
    setAudioError(null);
  }, []);

  const eject = useCallback(() => {
    const el = audioRef.current;
    if (el) el.pause();
    setTrayOpen(true);
    setStatus("empty");
    setLoaded(null);
    setAudioError(null);
  }, []);

  const play = useCallback(() => {
    const el = audioRef.current;
    if (!el || !disc) return;
    setTrayOpen(false);

    // No cueing here — the disc-change effect already positions a freshly
    // inserted disc at its start offset, and Stop rewinds to it. Re-cueing on
    // every Play would drag the listener forward to the offset after the
    // track had looped back to 0:00.
    // If the element hasn't fetched anything yet (preload="none", or a src
    // swap that hasn't resolved), kick off the load and cue once metadata
    // lands. play() on an unloaded element is what produced the "no supported
    // sources" error — the source was fine, it just hadn't been fetched.
    if (el.readyState === 0) {
      const onMeta = () => {
        if (disc.startAt > 0 && disc.startAt < el.duration) {
          el.currentTime = disc.startAt;
        }
        el.play()
          .then(() => {
            setStatus("playing");
            setAudioError(null);
          })
          .catch((err: unknown) => setAudioError(describeMediaError(err, el)));
      };
      el.addEventListener("loadedmetadata", onMeta, { once: true });
      el.load();
      return;
    }

    el.play()
      .then(() => {
        setStatus("playing");
        setAudioError(null);
      })
      .catch((err: unknown) => {
        setAudioError(describeMediaError(err, el));
      });
  }, [disc]);

  /** Pause holds position; Stop rewinds to the disc's cue point. */
  const pause = useCallback(() => {
    const el = audioRef.current;
    if (el) el.pause();
    setStatus(disc ? "loaded" : "empty");
  }, [disc]);

  const stop = useCallback(() => {
    const el = audioRef.current;
    if (el && disc) {
      el.pause();
      el.currentTime = disc.startAt;
    }
    setStatus(disc ? "loaded" : "empty");
  }, [disc]);

  const skip = useCallback(() => {
    if (loaded === null) {
      insert(0);
      return;
    }
    const next = (loaded + 1) % DISCS.length;
    setLoaded(next);
    setAudioError(null);
    // Keep playing across a skip if we were already playing; the effect below
    // starts the new track once the element has swapped sources.
  }, [loaded, insert]);

  // When the source changes, cue to the new disc's offset. If we were
  // playing, continue playing the new track.
  //
  // Seeking has to wait for metadata: with preload="none" a freshly-swapped
  // src has readyState 0 and no known duration, so assigning currentTime
  // immediately is silently dropped and play() races the loader. Calling
  // load() starts the fetch, and loadedmetadata is the first point at which
  // the element can actually be positioned.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !disc) return;

    const shouldResume = statusRef.current === "playing";
    let cancelled = false;

    const onMeta = () => {
      if (cancelled) return;
      if (disc.startAt > 0 && disc.startAt < el.duration) {
        el.currentTime = disc.startAt;
      }
      if (shouldResume) {
        el.play().catch((err: unknown) => {
          if (!cancelled) setAudioError(describeMediaError(err, el));
        });
      }
    };

    el.addEventListener("loadedmetadata", onMeta, { once: true });
    el.load();

    return () => {
      cancelled = true;
      el.removeEventListener("loadedmetadata", onMeta);
    };
    // Keyed on the disc only: re-running on every status change would re-cue
    // mid-listen. statusRef carries the latest status without retriggering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disc?.id]);

  // Loop back to 0:00 when a track runs out, per the brief — the start offset
  // is a one-time cue, not a loop point.
  const onEnded = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().catch(() => {
      setStatus("loaded");
    });
  }, []);

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-[#0e0f13] font-sans text-zinc-200 lg:flex-row">
      {/* ================= LEFT: the deck and the disc rack ================= */}
      <section className="flex shrink-0 flex-col items-center gap-6 border-white/10 px-6 py-8 lg:w-[720px] lg:border-r lg:py-10">
        {/* The deck. The 3D model carries the controls; the overlay keeps them
            reachable by keyboard and screen reader, and the wrapper is the drop
            target for discs dragged out of the rack. */}
        <div
          className={`relative h-[400px] w-full max-w-[640px] rounded-2xl transition-colors sm:h-[460px] ${
            dragOverDeck
              ? "bg-cyan-400/[0.07] ring-2 ring-cyan-400/60"
              : "ring-2 ring-transparent"
          }`}
          onDragOver={(e) => {
            // Preventing default is what marks this element as a valid drop
            // target; without it the browser refuses the drop outright.
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (!dragOverDeck) setDragOverDeck(true);
          }}
          onDragLeave={(e) => {
            // Fires for children too, so ignore moves that stay inside.
            if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
            setDragOverDeck(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverDeck(false);
            const id = e.dataTransfer.getData("text/x-disc-id");
            const index = DISCS.findIndex((d) => d.id === id);
            if (index >= 0) insert(index);
          }}
        >
          {/* Shadow pool, so the deck sits on a surface. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-16 bottom-6 h-10 rounded-[50%] bg-black/70 blur-2xl"
          />
          {/* The stage appends its own canvas here — see useDiscStage. */}
          <div ref={stageHostRef} className="absolute inset-0" />

          {/* Drop hint, shown only while a disc is being dragged. */}
          {dragging !== null && (
            <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
              <span
                className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                  dragOverDeck
                    ? "bg-cyan-400/20 text-cyan-200"
                    : "bg-white/5 text-zinc-500"
                }`}
              >
                {dragOverDeck ? "Release to load" : "Drop disc here"}
              </span>
            </div>
          )}

          {/* Focusable hit targets aligned to the modelled fascia buttons.
              pointer-events-none on the wrapper is essential: it spans the
              whole deck, and without it the group swallows every drag/drop
              over the canvas. The buttons re-enable pointer events. */}
          <div
            className="pointer-events-none absolute inset-0 [&>button]:pointer-events-auto"
            role="group"
            aria-label="CD deck transport controls"
          >
            {/* Positions are the modelled caps' own projected screen
                coordinates (measured, not eyeballed) expressed as percentages,
                so the labels stay on their caps at every deck size. The deck is
                held square to the camera for the same reason — see the render
                loop. Each label is bound to the cap it physically sits on. */}
            <FasciaButton
              className="left-[42.33%] top-[56.61%] h-[30px] w-[66px] -translate-x-1/2 -translate-y-1/2"
              label={status === "playing" ? "Pause" : "Play"}
              glyph={status === "playing" ? "❚❚" : "▶"}
              caption={status === "playing" ? "Pause" : "Play"}
              disabled={!disc}
              onClick={() =>
                pressControl("power", status === "playing" ? pause : play)
              }
            />
            <FasciaButton
              className="left-[57.67%] top-[56.61%] h-[30px] w-[66px] -translate-x-1/2 -translate-y-1/2"
              label="Skip to next disc"
              glyph="▶▶"
              caption="Next"
              onClick={() => pressControl("play", skip)}
            />
            <FasciaButton
              className="left-[42.44%] top-[61.38%] h-[30px] w-[66px] -translate-x-1/2 -translate-y-1/2"
              label="Stop"
              glyph="■"
              caption="Stop"
              disabled={!disc}
              onClick={() => pressControl("prev", stop)}
            />
            <FasciaButton
              className="left-[57.56%] top-[61.38%] h-[30px] w-[66px] -translate-x-1/2 -translate-y-1/2"
              label="Previous disc"
              glyph="◀◀"
              caption="Prev"
              onClick={() =>
                pressControl("next", () => {
                  const prev =
                    loaded === null
                      ? DISCS.length - 1
                      : (loaded - 1 + DISCS.length) % DISCS.length;
                  insert(prev);
                })
              }
            />
            {/* Eject lives on the deck itself, on the centre cap below the
                display. Disabled with nothing loaded so it can't imply an
                action it won't perform. */}
            <FasciaButton
              className="left-1/2 top-[66.28%] h-[28px] w-[70px] -translate-x-1/2 -translate-y-1/2"
              label="Eject disc"
              glyph="⏏"
              caption="Eject"
              disabled={loaded === null}
              onClick={() => pressControl("eject", eject)}
            />
          </div>
        </div>

        {/* Readout */}
        <div className="flex w-full max-w-[640px] items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
              {status === "playing"
                ? "Playing"
                : status === "loaded"
                  ? "Ready"
                  : "Standby"}
            </div>
            <div className="mt-1 truncate font-mono text-sm text-cyan-300">
              {disc ? disc.title : "—"}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === "playing" ? "animate-pulse bg-cyan-400" : "bg-zinc-700"
              }`}
            />
            <span className="font-mono text-[10px] text-zinc-600">
              {trayOpen ? "LID OPEN" : "LID CLOSED"}
            </span>
          </div>
        </div>

        {/* Disc rack — draggable CDs. Clicking still loads, so the deck is
            fully usable without ever dragging. */}
        <div className="flex w-full max-w-[640px] flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-4">
            {DISCS.map((d, i) => (
              <RackDisc
                key={d.id}
                disc={d}
                loaded={loaded === i}
                dragging={dragging === i}
                onClick={() => insert(i)}
                onDragStart={() => setDragging(i)}
                onDragEnd={() => {
                  setDragging(null);
                  setDragOverDeck(false);
                }}
              />
            ))}
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Drag a disc into the deck — or click it
          </p>
        </div>

        {audioError && (
          <div className="w-full max-w-[640px] font-mono text-[11px] text-amber-400/80">
            Audio: {audioError}
          </div>
        )}
      </section>

      {/* ================= RIGHT: the content display ====================== */}
      <section className="relative flex flex-1 items-start overflow-y-auto px-6 py-10 lg:px-12 lg:py-16">
        <div className="w-full max-w-2xl">
          {disc ? (
            <article key={disc.id} className="animate-[fadeIn_420ms_ease-out]">
              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-400/80">
                Now showing
              </div>
              <h1 className="mb-8 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {disc.title}
              </h1>
              <div className="space-y-4 text-[15px] leading-7 text-zinc-400 [&_li]:mb-4 [&_strong]:text-zinc-200 [&_ul]:space-y-1">
                {disc.body}
              </div>
            </article>
          ) : (
            <div className="pt-10">
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-600">
                No disc
              </div>
              <p className="text-lg text-zinc-500">
                Drag a disc into the deck to begin.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* preload="none" — four tracks shouldn't be fetched until one is
          actually loaded into the deck. */}
      <audio
        ref={audioRef}
        src={disc ? disc.audio : undefined}
        onError={() => {
          const el = audioRef.current;
          if (el) setAudioError(describeMediaError(null, el));
        }}
        onEnded={onEnded}
        preload="none"
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

/**
 * A physical-looking CD in the rack, draggable into the deck.
 *
 * Drawn with CSS gradients rather than a second WebGL context: four extra
 * contexts would eat into the browser's cap for no visual gain, and a real
 * <button> keeps click, keyboard and screen-reader behaviour for free. The
 * hues match the disc's shader uniforms so the platter you drag is the platter
 * that appears on the spindle.
 */
function RackDisc({
  disc,
  loaded,
  dragging,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  disc: Disc;
  loaded: boolean;
  dragging: boolean;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onClick={onClick}
      onDragStart={(e) => {
        // The id is the payload; the deck looks it up in DISCS on drop.
        e.dataTransfer.setData("text/x-disc-id", disc.id);
        // Also expose a plain-text flavour so dragging somewhere else (a text
        // field, another app) yields something sensible rather than nothing.
        e.dataTransfer.setData("text/plain", disc.title);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      aria-pressed={loaded}
      // The visible label is a terse code ("PROJ"), so name the button
      // explicitly — otherwise that code is all a screen reader announces.
      aria-label={`${disc.title} disc — drag into the deck or click to load`}
      title={`${disc.title} — drag into the deck or click to load`}
      className={`group relative h-[88px] w-[88px] shrink-0 rounded-full transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
        dragging ? "scale-90 opacity-40" : "hover:-translate-y-1 hover:scale-105"
      } ${loaded ? "ring-2 ring-cyan-400/70" : ""}`}
      style={{ cursor: dragging ? "grabbing" : "grab" }}
    >
      {/* Iridescent platter. The conic gradient is the rainbow sweep; the
          repeating radial is the data-track banding. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background: `
            repeating-radial-gradient(circle at 50% 50%,
              rgba(255,255,255,0.10) 0px,
              rgba(0,0,0,0.10) 1px,
              rgba(255,255,255,0.10) 2px),
            conic-gradient(from 210deg,
              hsl(${disc.hueA} 70% 52%),
              hsl(${disc.hueB} 72% 56%),
              hsl(${disc.hueA} 65% 44%),
              hsl(${disc.hueB} 70% 58%),
              hsl(${disc.hueA} 70% 52%))
          `,
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.22), 0 6px 14px rgba(0,0,0,0.55)",
        }}
      />
      {/* Specular sweep, brightened on hover so the disc feels grabbable. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full opacity-70 transition-opacity group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(115deg, rgba(255,255,255,0) 32%, rgba(255,255,255,0.55) 48%, rgba(255,255,255,0) 62%)",
        }}
      />
      {/* Label hub + spindle hole. */}
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[34px] w-[34px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-100"
        style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.35)" }}
      />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#15171d]"
      />
      {/* Short code, printed on the hub like a real disc label. */}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[14px] font-mono text-[8px] font-semibold uppercase tracking-wider text-zinc-700">
        {disc.short}
      </span>
    </button>
  );
}

/**
 * A hit target sitting over one of the modelled fascia buttons. The 3D cap is
 * the button face; this supplies the accessible name, keyboard focus, the
 * pointer target and a printed label.
 *
 * `glyph` is drawn over the cap so the control is identifiable at a glance —
 * a bare chrome rectangle gives the user nothing to read. It's rendered with a
 * dark text shadow because the caps are light chrome.
 */
function FasciaButton({
  label,
  glyph,
  caption,
  onClick,
  disabled,
  className,
}: {
  label: string;
  glyph: React.ReactNode;
  caption?: string;
  onClick: () => void;
  disabled?: boolean;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`absolute flex cursor-pointer flex-col items-center justify-center rounded-md outline-none ring-cyan-300/90 transition-shadow focus-visible:ring-2 disabled:cursor-default disabled:opacity-40 ${className}`}
    >
      <span
        aria-hidden="true"
        className="text-[13px] font-semibold leading-none text-zinc-900"
        style={{ textShadow: "0 1px 0 rgba(255,255,255,0.45)" }}
      >
        {glyph}
      </span>
      {caption && (
        <span
          aria-hidden="true"
          className="mt-[3px] font-mono text-[7px] font-semibold uppercase tracking-[0.06em] text-zinc-800/90"
        >
          {caption}
        </span>
      )}
    </button>
  );
}
