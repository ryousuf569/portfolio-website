import * as THREE from "three";

/* =========================================================================
   Jewel case

   One 3D CD case per track: front cover art with the title set over it, a
   printed spine, and a clear-plastic shell. Clicking it opens the track's
   booklet.

   The cover is drawn into a 2D canvas and uploaded as a texture rather than
   using a text-geometry or an HTML overlay. Text geometry needs a font file and
   gives no control over wrapping; an HTML overlay would not tilt with the case.
   A canvas gives real typography that lives on the surface and tilts with it.
   ========================================================================= */

/** Case proportions, in world units. A CD jewel case is 142 x 125 x 10 mm. */
const CASE = {
  width: 1.42,
  height: 1.25,
  depth: 0.1,
  /** Printed spine width as a fraction of the cover. */
  spineFrac: 0.055,
};

const COVER_PX = { w: 768, h: 676 };

export type CaseHandle = {
  /** Hover/press feedback, driven from React. */
  setHover: (v: boolean) => void;
  /** 0 = idle, 1 = fully lifted toward the viewer. */
  setOpen: (v: number) => void;
  setAccent: (hue: number) => void;
  dispose: () => void;
};

type CaseSpec = {
  title: string;
  /** Small line above the title, catalogue number and track position. */
  eyebrow: string;
  /** Cover artwork URL, or null for a type-only cover. */
  cover: string | null;
  /**
   * How the artwork fills the cover. "cover" crops to fill, which is right for
   * photographs. "contain" fits the whole image inside the frame, necessary for
   * a logo, where cropping the mark's edges or upscaling a small square to fill
   * a landscape frame both look like mistakes.
   */
  coverFit: "cover" | "contain";
  accentHue: number;
};

/**
 * Draws the front cover into a canvas: artwork bled to the edges with a scrim,
 * then the eyebrow and title over it. Returns the canvas so the caller can wrap
 * it in a texture and refresh it once the image loads.
 */
function paintCover(
  ctx: CanvasRenderingContext2D,
  spec: CaseSpec,
  img: HTMLImageElement | null,
) {
  const { w, h } = COVER_PX;
  ctx.clearRect(0, 0, w, h);

  // Ground: near-black, so a cover with no art still reads as a printed sleeve.
  ctx.fillStyle = "#0d0f14";
  ctx.fillRect(0, 0, w, h);

  if (img) {
    // Fit the artwork without ever distorting it: cover crops the overflow,
    // contain leaves the ground colour showing around it.
    const fit =
      spec.coverFit === "contain"
        ? // Held well clear of the edges and lifted above the title block, so a
          // logo reads as a mark printed on a sleeve rather than a stretched
          // photo. Capped at 1 so a small logo is never upscaled.
          Math.min(
            (w * 0.52) / img.naturalWidth,
            (h * 0.52) / img.naturalHeight,
            1,
          )
        : Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * fit;
    const dh = img.naturalHeight * fit;
    // Contained art sits in the upper part of the cover, out of the way of the
    // title; covered art fills the frame and is centred.
    const dy = spec.coverFit === "contain" ? h * 0.1 : (h - dh) / 2;
    ctx.drawImage(img, (w - dw) / 2, dy, dw, dh);

    // Gradient scrim from the bottom, so the title always has something to sit
    // on regardless of what the artwork does down there. Confined to the lower
    // third and kept off the top entirely: a scrim spread over the whole cover
    // buries the artwork, which is the one thing the cover is for.
    //
    // Only for covered art. Contained art is already clear of the title block,
    // and a scrim there would just fog the ground colour it sits on.
    if (spec.coverFit !== "contain") {
      const g = ctx.createLinearGradient(0, h * 0.52, 0, h);
      g.addColorStop(0, "rgba(6,8,12,0)");
      g.addColorStop(0.5, "rgba(6,8,12,0.66)");
      g.addColorStop(1, "rgba(6,8,12,0.93)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  const pad = Math.round(w * 0.075);

  // Accent hairline above the type block.
  ctx.fillStyle = `hsl(${spec.accentHue} 75% 58%)`;
  ctx.fillRect(pad, h - Math.round(h * 0.3), Math.round(w * 0.11), 4);

  // Eyebrow, catalogue number, letterspaced by hand since canvas has no
  // letter-spacing property in older engines.
  ctx.fillStyle = "rgba(228,232,240,0.72)";
  ctx.font = `500 ${Math.round(w * 0.026)}px ui-monospace, "SFMono-Regular", Menlo, monospace`;
  ctx.textBaseline = "alphabetic";
  {
    let x = pad;
    const y = h - Math.round(h * 0.245);
    for (const ch of spec.eyebrow.toUpperCase()) {
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch).width + w * 0.008;
    }
  }

  // Title, wrapped to the cover width and set as large as fits in two lines.
  ctx.fillStyle = "#f4f6fa";
  const maxWidth = w - pad * 2;
  let size = Math.round(w * 0.105);
  let lines: string[] = [];
  // Shrink until the title fits in at most three lines.
  for (; size > Math.round(w * 0.05); size -= 2) {
    ctx.font = `600 ${size}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
    lines = [];
    let line = "";
    for (const word of spec.title.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= 3) break;
  }
  const lineHeight = size * 1.12;
  // Bottom-aligned block, so covers with different title lengths still line up
  // along the base of the sleeve.
  let ty = h - pad - (lines.length - 1) * lineHeight;
  for (const l of lines) {
    ctx.fillText(l, pad, ty);
    ty += lineHeight;
  }
}

/** Paints the narrow printed spine: title and catalogue, rotated. */
function paintSpine(ctx: CanvasRenderingContext2D, spec: CaseSpec) {
  const w = 512;
  const h = 64;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#101319";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = `hsl(${spec.accentHue} 70% 55%)`;
  ctx.fillRect(0, 0, 6, h);
  ctx.fillStyle = "#e8ebf2";
  ctx.font = `600 ${Math.round(h * 0.42)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(spec.title, 22, h / 2);
  ctx.fillStyle = "rgba(220,226,238,0.6)";
  ctx.font = `500 ${Math.round(h * 0.32)}px ui-monospace, Menlo, monospace`;
  const cat = spec.eyebrow.split("·")[0].trim();
  const tw = ctx.measureText(cat).width;
  ctx.fillText(cat, w - tw - 18, h / 2);
}

/**
 * The studio environment every case reflects, built once and shared.
 *
 * Previously each case ran its own PMREMGenerator over a procedural sky scene.
 * That convolution is the single most expensive thing in case setup; it produced
 * a byte-identical result every time, and it ran once per case on every disc
 * switch, four cases meant four redundant convolutions before anything drew.
 *
 * A PMREM render target belongs to the renderer that produced it, so it cannot
 * be shared between contexts. This is plain CPU-side pixel data instead: an
 * equirectangular DataTexture is valid in any context, and three.js will use it
 * as `scene.environment` directly.
 */
let envTexture: THREE.DataTexture | null = null;

/**
 * Decoded cover art, keyed by URL and kept for the page's lifetime.
 *
 * Cases are destroyed and rebuilt on every disc switch, so without this the same
 * artwork is re-fetched and re-decoded each time you return to a disc. The
 * browser HTTP cache spares the network but not the decode, and decode is what
 * stalls the first frames. A handful of Image objects is a cheap thing to hold.
 */
const imageCache = new Map<string, HTMLImageElement>();

function getEnvTexture(): THREE.DataTexture {
  if (envTexture) return envTexture;

  const W = 64;
  const H = 32;
  // Half-float, because an environment map wants values above 1.0 for the
  // highlight to read as a light source rather than a grey patch.
  const data = new Uint16Array(W * H * 4);
  const toHalf = (v: number) => {
    // Minimal float32 -> float16 via DataView; only used 8192 times at startup.
    const f = new Float32Array(1);
    const i = new Uint32Array(f.buffer);
    f[0] = v;
    const x = i[0];
    const sign = (x >>> 16) & 0x8000;
    const exp = ((x >>> 23) & 0xff) - 112;
    const mant = x & 0x7fffff;
    if (exp <= 0) return sign;
    if (exp >= 31) return sign | 0x7c00;
    return sign | (exp << 10) | (mant >> 13);
  };

  for (let y = 0; y < H; y++) {
    // v runs 0 at the top of the sphere to 1 at the bottom.
    const dy = 1 - (y + 0.5) / H * 2;
    for (let x = 0; x < W; x++) {
      // Same gradient the old shader described: bright softbox above falling to
      // a dark floor, with a brighter strip just above the horizon that gives
      // the shell its long highlight.
      const up = Math.max(0, Math.min(1, (dy + 0.2) / 1.05));
      const s = up * up * (3 - 2 * up); // smoothstep
      const strip = Math.max(0, 1 - Math.abs(dy - 0.34) / 0.18);
      const r = 0.05 + (0.72 - 0.05) * s + 0.4 * strip;
      const g = 0.06 + (0.78 - 0.06) * s + 0.44 * strip;
      const b = 0.08 + (0.9 - 0.08) * s + 0.52 * strip;
      const o = (y * W + x) * 4;
      data[o] = toHalf(r);
      data[o + 1] = toHalf(g);
      data[o + 2] = toHalf(b);
      data[o + 3] = toHalf(1);
    }
  }

  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  envTexture = tex;
  return tex;
}

/**
 * Builds a jewel case into `host`. Returns null when WebGL is unavailable, so
 * the caller can fall back to a plain HTML card.
 */
export function createCase(
  host: HTMLElement,
  spec: CaseSpec,
): CaseHandle | null {
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
      alpha: true,
      // No MSAA. Several of these run side by side, and a multisampled
      // backbuffer per case is a real cost on switch; the case is a big flat
      // slab whose only hard edges are its own silhouette, and the pixel ratio
      // below already supersamples those on any HiDPI display.
      antialias: false,
      // The case never reads its own buffer back, so the driver is free to skip
      // preserving it between frames.
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  host.appendChild(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  // A wider lens than a product shot would use, brought in close: the
  // perspective divergence across the case is what makes it read as an object
  // rather than a flat card. At 30deg from further back the faces stay nearly
  // parallel on screen and the whole thing looks printed on.
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  camera.position.set(0, 0, 3.1);

  /* --- environment ----------------------------------------------------- */
  // Clear plastic needs something to reflect, same reasoning as the deck.
  // Shared across every case, see buildEnvTexture.
  scene.environment = getEnvTexture();

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(2.4, 3.0, 4.0);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbcd4ff, 0.7);
  fill.position.set(-3.0, 0.6, 2.0);
  scene.add(fill);

  /* --- textures -------------------------------------------------------- */
  const coverCanvas = document.createElement("canvas");
  coverCanvas.width = COVER_PX.w;
  coverCanvas.height = COVER_PX.h;
  const coverCtx = coverCanvas.getContext("2d")!;
  paintCover(coverCtx, spec, null);
  const coverTex = new THREE.CanvasTexture(coverCanvas);
  coverTex.colorSpace = THREE.SRGBColorSpace;
  coverTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const spineCanvas = document.createElement("canvas");
  spineCanvas.width = 512;
  spineCanvas.height = 64;
  const spineCtx = spineCanvas.getContext("2d")!;
  paintSpine(spineCtx, spec);
  const spineTex = new THREE.CanvasTexture(spineCanvas);
  spineTex.colorSpace = THREE.SRGBColorSpace;

  // Artwork loads async; repaint the cover once it arrives.
  let coverImg: HTMLImageElement | null = null;
  // Detaches the pending load listener if this case unmounts mid-flight.
  let coverCleanup: (() => void) | null = null;
  // An animated cover has to be repainted every frame, because drawImage of an
  // <img> only ever samples whatever frame the browser is currently showing,
  // painting once would freeze it. Detected by extension rather than by decoding
  // the file: this only decides whether to re-upload the texture each frame.
  const coverAnimated = /\.gif($|\?)/i.test(spec.cover ?? "");
  if (spec.cover) {
    const cached = imageCache.get(spec.cover);
    if (cached?.complete && cached.naturalWidth > 0) {
      // Already decoded on a previous visit to this disc: paint immediately so
      // the case never shows a bare type-only cover on the way back.
      coverImg = cached;
      paintCover(coverCtx, spec, coverImg);
      coverTex.needsUpdate = true;
    } else {
      const img = cached ?? new Image();
      if (!cached) {
        img.decoding = "async";
        imageCache.set(spec.cover, img);
      }
      const onReady = () => {
        coverImg = img;
        paintCover(coverCtx, spec, coverImg);
        coverTex.needsUpdate = true;
      };
      // An in-flight image from a previous mount still needs this mount's
      // repaint, so attach either way rather than only on a fresh Image.
      img.addEventListener("load", onReady, { once: true });
      coverCleanup = () => img.removeEventListener("load", onReady);
      if (!cached) img.src = spec.cover;
    }
  }

  /* --- geometry -------------------------------------------------------- */
  const group = new THREE.Group();
  scene.add(group);

  const { width: W, height: H, depth: D } = CASE;

  // The printed insert: a thin card just inside the front face. Separate from
  // the shell so the plastic can be transparent over it.
  const insertMat = new THREE.MeshStandardMaterial({
    map: coverTex,
    roughness: 0.72,
    metalness: 0.0,
  });
  const insert = new THREE.Mesh(
    new THREE.PlaneGeometry(W * (1 - CASE.spineFrac), H),
    insertMat,
  );
  insert.position.set(W * CASE.spineFrac * 0.5, 0, D / 2 - 0.004);
  group.add(insert);

  // Printed spine strip along the hinge edge.
  const spineMat = new THREE.MeshStandardMaterial({
    map: spineTex,
    roughness: 0.72,
  });
  const spine = new THREE.Mesh(
    new THREE.PlaneGeometry(W * CASE.spineFrac, H),
    spineMat,
  );
  spine.position.set(-W / 2 + (W * CASE.spineFrac) / 2, 0, D / 2 - 0.004);
  group.add(spine);

  // The shell. Transmissive so the insert reads through it, with a strong
  // clearcoat for the glassy edge highlight a jewel case has.
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0xdce3ee,
    roughness: 0.06,
    metalness: 0.0,
    transparent: true,
    // Low: the shell has to read as clear plastic, and every point of opacity
    // here is a veil over the artwork underneath. The glassy look comes from the
    // clearcoat highlight and the env map, not from the fill.
    opacity: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    side: THREE.DoubleSide,
  });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), shellMat);
  group.add(shell);

  // Back plate: opaque dark tray behind the insert, so the case is not
  // see-through to the page.
  const backMat = new THREE.MeshStandardMaterial({
    color: 0x0a0b0f,
    roughness: 0.55,
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), backMat);
  back.position.z = -D / 2 + 0.002;
  back.rotation.y = Math.PI;
  group.add(back);

  /* --- interaction state ------------------------------------------------ */
  let hover = false;
  let open = 0;
  let hoverEase = 0;
  let openEase = 0;
  // Resting pose: turned far enough that the spine edge and the case's thickness
  // are both visible. A shallower angle hides the depth entirely and the case
  // reads as artwork rather than an object you could pick up.
  const REST_Y = -0.52;
  const REST_X = 0.13;

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  let frame = 0;
  let last = performance.now();
  let elapsed = 0;
  // Countdown to the next animated-cover repaint.
  let coverRepaint = 0;

  const animate = () => {
    frame = requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;

    hoverEase += ((hover ? 1 : 0) - hoverEase) * Math.min(dt * 8, 1);
    openEase += (open - openEase) * Math.min(dt * 7, 1);

    // Animated cover: re-sample the <img> so the case shows the moving artwork
    // rather than the single frame that happened to be current when it loaded.
    // Throttled to ~12fps, GIFs rarely run faster, and a full canvas repaint
    // plus texture upload every rAF tick is a lot of bandwidth for artwork the
    // size of a thumbnail.
    if (coverAnimated && coverImg && !reduceMotion) {
      coverRepaint -= dt;
      if (coverRepaint <= 0) {
        coverRepaint = 1 / 12;
        paintCover(coverCtx, spec, coverImg);
        coverTex.needsUpdate = true;
      }
    }

    // Hover turns the case toward the viewer and lifts it; opening carries that
    // further. Expressed as a 0..1 fraction of the way to square-on so the two
    // inputs cannot together over-rotate past the front face.
    const straighten = Math.min(hoverEase * 0.55 + openEase * 0.45, 1);
    group.rotation.y = REST_Y * (1 - straighten);
    group.rotation.x = REST_X * (1 - straighten);
    group.position.y = hoverEase * 0.045 + openEase * 0.02;
    group.position.z = hoverEase * 0.12 + openEase * 0.3;

    if (!reduceMotion) {
      // A slow idle sway, so a shelf of cases is not perfectly static. Small
      // enough that it never fights the hover pose.
      group.rotation.y += Math.sin(elapsed * 0.5) * 0.028;
      group.rotation.x += Math.cos(elapsed * 0.37) * 0.016;
    }

    renderer.render(scene, camera);
  };
  animate();

  return {
    setHover: (v) => {
      hover = v;
    },
    setOpen: (v) => {
      open = v;
    },
    setAccent: (hue) => {
      if (hue === spec.accentHue) return;
      spec.accentHue = hue;
      paintCover(coverCtx, spec, coverImg);
      coverTex.needsUpdate = true;
      paintSpine(spineCtx, spec);
      spineTex.needsUpdate = true;
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      coverCleanup?.();
      insert.geometry.dispose();
      insertMat.dispose();
      spine.geometry.dispose();
      spineMat.dispose();
      shell.geometry.dispose();
      shellMat.dispose();
      back.geometry.dispose();
      backMat.dispose();
      coverTex.dispose();
      spineTex.dispose();
      // The environment texture is intentionally NOT disposed: it is shared by
      // every case and outlives any one of them.
      renderer.dispose();
      // Required as of Next 16: dispose() alone does not release the context
      // across the App Router's remount cycle, and browsers cap live contexts.
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
