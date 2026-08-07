"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Disposables, buildBoombox, type ControlId } from "./boombox";
import { createBackground, type BackgroundHandle } from "./background";
import { createCase, type CaseHandle } from "./cdcase";

/* =========================================================================
   Disc data
   ========================================================================= */

/**
 * One song on a disc. `startAt` is a one-time cue applied when the track is
 * first reached — always inside the first minute, so the disc drops the
 * listener into the song rather than its intro. Once a track ends it loops
 * from 0:00; the offset is not a loop point.
 */
/**
 * A figure in the booklet — a screenshot, chart or diagram, printed as a
 * numbered plate with a caption the way a liner-notes insert would.
 */
type Plate = {
  src: string;
  /** Intrinsic pixel size, so the layout reserves the right box before load. */
  width: number;
  height: number;
  /** Alt text. Describes the figure, not the fact that it is a figure. */
  alt: string;
  /** Caption after the "PLATE NN — " prefix, which is generated. */
  caption: string;
  /**
   * Print the figure at its own size, centred, rather than bled to the full
   * measure. For logos and other small marks: a 200px square scaled up to a
   * 640px column is visibly soft, and a mark does not want to be a full plate.
   */
  inset?: boolean;
};

/** One line in the credits block: "code · demo · writeup" as liner notes. */
type Credit = {
  /** Left column, small caps — the role, e.g. "code", "written at". */
  role: string;
  /** Right column — the value. A URL renders as a link. */
  value: string;
  href?: string;
};

type Track = {
  /** Path under /public. Opus @ 64k VBR — see the note in README/AGENTS. */
  audio: string;
  /** Release title, as shown in the transport bar. */
  title: string;
  /** Seconds into the track where playback should begin on insert. */
  startAt: number;
  /**
   * Headline for this track's panel — the one thing this song stands for
   * (a single role, a single project, one half of the bio).
   */
  heading: string;
  /** One-line standfirst under the heading, set in italic serif. */
  standfirst?: string;
  /**
   * Artwork for the 3D case's front cover. Falls back to the first plate when
   * absent, so a track with a figure always has a cover without duplicating the
   * path in the data.
   */
  cover?: string;
  /**
   * How the cover art fills the case front. Defaults to "cover" (crop to fill),
   * which suits photographs. Use "contain" for a logo: cropping a mark's edges
   * or blowing a small square up to fill a landscape frame both read as broken.
   */
  coverFit?: "cover" | "contain";
  /** The panel shown on the right while this track is cued. */
  body: React.ReactNode;
  /** Figures, printed in order after the body. */
  plates?: Plate[];
  /** Credits block. Printed above the plates — see the Booklet layout. */
  credits?: Credit[];
};

type Disc = {
  id: string;
  title: string;
  /** Short label printed on the disc face. */
  short: string;
  /**
   * Catalogue number, as a small label would carry. Printed on the disc, in the
   * booklet corner and on the spine, so the same identifier follows a section
   * everywhere it appears.
   */
  catalog: string;
  /** Two hues driving the disc's iridescent sheen. */
  hueA: number;
  hueB: number;
  /**
   * The hue this disc contributes to the whole page — the backdrop blob, the
   * left panel's accents, the transport bar. Named separately from hueA/hueB
   * because the sheen pair is chosen to look iridescent, and the more
   * *identifiable* of the two is not always hueA: EXP reads pink in the tray
   * even though its hueA is orange. This is the one a visitor would name.
   */
  accent: number;
  /**
   * Songs on this disc, in order. Skip cycles within this list only —
   * changing discs is done by ejecting and loading another one. Each track
   * carries exactly one item of content, so skipping is how you page through
   * a disc's material.
   */
  tracks: Track[];
};

const DISCS: Disc[] = [
  {
    id: "about",
    title: "About Me",
    short: "ABOUT",
    catalog: "YR-001",
    hueA: 195,
    hueB: 280,
    accent: 195,
    tracks: [
      {
        audio: "/touch-my-face.ogg",
        title: "touch my face",
        startAt: 0,
        heading: "The Technical Side",
        cover: "/tech_side.JPG",
        body: (
          <>
            <p>
              I'm a second-year Applied Mathematics student at the University of Waterloo, specializing in Scientific Machine Learning.
            </p>
            <p>
              My approach is math-first: I take on projects that pose a mathematical problem.
            </p>
          </>
        ),
        plates: [
          {
            src: "/tech_side.JPG",
            width: 1800,
            height: 1013,
            alt:
              "A desk lit by a table lamp with three screens open — a large monitor and two laptops, each showing code and a terminal — and me sitting at the right of frame in a red shirt.",
            caption: "I thought I was super cool",
          },
        ],
      },
      {
        audio: "/hightideintermission.ogg",
        title: "High Tide",
        startAt: 24,
        heading: "The Personal Side",
        cover: "/personal_side.gif",
        body: (
          <>
            <p>
              TODO — who you are away from the editor. What you make, listen
              to, or keep coming back to.
            </p>
            <p>
              TODO — the rest of it: how you spend a good weekend, and what
              you&apos;d talk about for an hour unprompted.
            </p>
          </>
        ),
        plates: [
          {
            src: "/personal_side.gif",
            width: 774,
            height: 498,
            alt:
              "Animation of me dribbling a football across a park pitch on a clear day, with houses along the far edge and two more balls on the grass.",
            caption: "On the pitch — the other half of it.",
          },
        ],
      },
    ],
  },
  {
    id: "experience",
    title: "Experience",
    short: "EXP",
    catalog: "YR-002",
    hueA: 25,
    hueB: 330,
    accent: 330,
    tracks: [
      {
        audio: "/buzz-me-in.ogg",
        title: "BUZZ ME IN",
        startAt: 162, // 2:42
        heading: "Research Engineering Intern @ DeepIDV",
        cover: "/deepidv.jpg",
        coverFit: "contain",
        body: (
          <>
            <p className="font-mono text-[13px] text-zinc-400">
              DeepIDV · Apr - Aug 2026
            </p>
            <p>
              Co-Authored the TripleLock Encryption Algorithm
            </p>
            <ul>
              <li>Sole architecture reviewer of a three-party consent-gated decryption protocol requiring collaborative recovery across Client, HSM-backed Operator, and Relying Party</li>
              <li>Removed ArcFace embeddings from the encryption boundary and introduced fuzzy extraction to absorb biometric vector variance, eliminating hashing issues</li>
            </ul>
          </>
        ),
        plates: [
          {
            src: "/deepidv.jpg",
            width: 200,
            height: 200,
            alt: "DeepIDV logo — a chevron mark in two tones of blue.",
            caption: "DeepIDV.",
            inset: true,
          },
        ],
        credits: [
          {
            role: "triplelock",
            value: "github.com/Deep-Identity-Inc/deepidv-triplelock",
            href: "https://github.com/Deep-Identity-Inc/deepidv-triplelock",
          },
        ],
      },
      {
        audio: "/saudadefinalmm (1).ogg",
        title: "saudade (demo)",
        startAt: 51, // 0:51
        heading: "NLP Research @ Wat.AI",
        cover: "/wat_ai_logo.jpg",
        coverFit: "contain",
        body: (
          <>
            <p className="font-mono text-[13px] text-zinc-400">
              Wat.AI · Jan - Dec 2026
            </p>
            <p>
              Owned the sentiment analysis pipeline for the Macro scenario simulator InsightPulse
            </p>
            <ul>
              <li>Finetuning FinBERT to accurately predict sentiment on Macro headlines</li>
              <li>Working on Asset-conditioned financial sentiment research; predicting sentiment for assets not mentioned in the headline.</li>
            </ul>
          </>
        ),
        credits: [
          {
            role: "finbert",
            value: "github.com/ryousuf569/finbertfinetune",
            href: "https://github.com/ryousuf569/finbertfinetune",
          },
          {
            role: "insightpulse",
            value: "github.com/SharanyaBasu/InsightPulse",
            href: "https://github.com/SharanyaBasu/InsightPulse",
          },
        ],
        plates: [
          {
            src: "/wat_ai_logo.jpg",
            width: 200,
            height: 200,
            alt: "Wat.AI logo — a stylised yellow W drawn in a single line on black.",
            caption: "Wat.AI.",
            inset: true,
          },
        ],
      },
    ],
  },
  {
    id: "projects",
    title: "Projects",
    short: "PROJ",
    catalog: "YR-003",
    hueA: 140,
    hueB: 200,
    accent: 160,
    tracks: [
      {
        audio: "/forbearance-mm.ogg",
        title: "Solace",
        startAt: 45, // 0:45
        heading: "Lowblock RL",
        standfirst:
          "Teaching attackers to break a parked bus, using controlled space as the reward.",
        cover: "/lowblock_rl.png",
        body: (
          <>
            <p>
              A PPO agent learns to attack a low block in a simulated football
              match, rewarded by <em>pitch control</em> — William Spearman&apos;s
              model of which team would reach a given patch of grass first.
              Instead of rewarding goals alone, which are far too sparse to learn
              from, the agent is paid continuously for the space it takes.
            </p>
            <p>
              TODO — the rest: how the agent is trained, what the low block
              opponent does, and what the run actually produced.
            </p>
          </>
        ),
        plates: [
          {
            src: "/lowblock_rl.png",
            width: 1606,
            height: 1036,
            alt:
              "Pitch control surface over a football pitch. Red shading marks the attacking team's controlled space, green the defence's; twenty numbered players carry velocity arrows, with the defence massed in a low block around its own box.",
            caption:
              "Pitch control surface mid-possession. Shading is probability of winning the ball at each point; arrows are player velocities.",
          },
        ],
        credits: [
          {
            role: "code",
            value: "github.com/ryousuf569/haramball-hunter",
            href: "https://github.com/ryousuf569/haramball-hunter",
          },
          { role: "method", value: "Spearman pitch control · PPO" },
        ],
      },
      {
        audio: "/bound2breakmm1.ogg",
        title: "Bound 2 Break",
        startAt: 33, // 0:33
        heading: "TODO — Project Two",
        body: (
          <>
            <p className="font-mono text-[13px] text-zinc-400">
              TODO — Stack · Year
            </p>
            <p>
              TODO — what this project does, who it&apos;s for, and the problem
              it solves.
            </p>
            <ul>
              <li>TODO — the hard part, and how you handled it.</li>
              <li>TODO — outcome, scale, or what you learned.</li>
            </ul>
          </>
        ),
      },
      {
        audio: "/hilbert hotel - so far.ogg",
        title: "Hilbert Hotel (unreleased)",
        startAt: 12, // 0:12
        heading: "TODO — Project Three",
        body: (
          <>
            <p className="font-mono text-[13px] text-zinc-400">
              TODO — Stack · Year
            </p>
            <p>
              TODO — what this project does, who it&apos;s for, and the problem
              it solves.
            </p>
            <ul>
              <li>TODO — the hard part, and how you handled it.</li>
              <li>TODO — outcome, scale, or what you learned.</li>
            </ul>
          </>
        ),
      },
      {
        audio: "/idontwriteforyouanymorefinalmm11.ogg",
        title: "i don't write for you anymore",
        startAt: 47, // 0:47
        heading: "TODO — Project Four",
        body: (
          <>
            <p className="font-mono text-[13px] text-zinc-400">
              TODO — Stack · Year
            </p>
            <p>
              TODO — what this project does, who it&apos;s for, and the problem
              it solves.
            </p>
            <ul>
              <li>TODO — the hard part, and how you handled it.</li>
              <li>TODO — outcome, scale, or what you learned.</li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    id: "links",
    title: "Links",
    short: "LINKS",
    catalog: "YR-004",
    hueA: 45,
    hueB: 15,
    accent: 38,
    tracks: [
      {
        audio: "/ladybird-mm1.ogg",
        title: "lakeshore west (ladybird)",
        startAt: 42, // 0:42
        heading: "Professional",
        body: (
          <ul>
            <li>
              TODO — GitHub · <span className="text-zinc-400">your-url-here</span>
            </li>
            <li>
              TODO — LinkedIn ·{" "}
              <span className="text-zinc-400">your-url-here</span>
            </li>
            <li>
              TODO — Email ·{" "}
              <span className="text-zinc-400">you@example.com</span>
            </li>
            <li>
              TODO — Resume · <span className="text-zinc-400">your-url-here</span>
            </li>
          </ul>
        ),
      },
      {
        audio: "/allumettefinalmm.ogg",
        title: "Allumette Interlude",
        startAt: 18, // 0:18
        heading: "Personal",
        body: (
          <ul>
            <li>
              TODO — Music · <span className="text-zinc-400">your-url-here</span>
            </li>
            <li>
              TODO — Writing · <span className="text-zinc-400">your-url-here</span>
            </li>
            <li>
              TODO — Instagram ·{" "}
              <span className="text-zinc-400">your-url-here</span>
            </li>
            <li>
              TODO — Anything else ·{" "}
              <span className="text-zinc-400">your-url-here</span>
            </li>
          </ul>
        ),
      },
    ],
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

/** Smoothed analyser bands, 0..1. */
type Levels = { bass: number; mid: number; treble: number };

/**
 * @param hostRef Wrapper the stage mounts its canvas into.
 * @param getLevels Reads the current audio bands. Called once per frame to
 *   drive woofer excursion; returns silence when no analyser is attached.
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
  getLevels: () => Levels,
): React.RefObject<DiscStageHandle | null> {
  const handleRef = useRef<DiscStageHandle | null>(null);
  // Held in a ref so the effect below never re-runs (and never rebuilds the
  // whole WebGL scene) just because the caller passed a new closure. Updated in
  // its own effect rather than during render — a render-phase ref write is not
  // safe under concurrent rendering, which may discard the pass.
  const levelsRef = useRef(getLevels);
  useEffect(() => {
    levelsRef.current = getLevels;
  }, [getLevels]);

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
    // Follower for woofer excursion — see the render loop for why the raw bass
    // band is not used directly.
    let woofer = 0;

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

      // Woofer excursion. The cones ride the bass band: a real driver's cone
      // travels along its axis, so this is a Z offset on the cone and dust cap
      // only — the ring, bezel and surround stay bolted to the cabinet.
      //
      // Smoothed with its own follower rather than using the raw band value:
      // the analyser is already smoothed, but bass is spiky enough that feeding
      // it straight in makes the cones buzz instead of pump. Attack is faster
      // than release, which is how a cone actually behaves — it snaps out on the
      // transient and settles back.
      {
        const bass = playing ? levelsRef.current().bass : 0;
        const k = bass > woofer ? 0.35 : 0.12;
        woofer += (bass - woofer) * k;
        // Gentle knee: quiet passages barely move, loud ones travel most of the
        // budget. Excursion is small — 0.05 world units is already several
        // pixels of visible travel at this camera.
        const travel = Math.pow(Math.max(woofer, 0), 1.4) * 0.05;
        for (const w of rig.woofers) {
          w.cone.position.z = (w.cone.userData.restZ as number) + travel;
          // The cap sits proud of the cone and moves with it, slightly further
          // so the assembly doesn't look rigid.
          w.cap.position.z = (w.cap.userData.restZ as number) + travel * 1.15;
        }
      }

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

      // Idle motion: translation only, never rotation. The fascia buttons are
      // HTML hit targets pinned to percentage positions over the modelled caps,
      // so any yaw/pitch swings the caps out from under their labels — whereas
      // a translation slides cap and label the same way and only their small
      // difference shows. Budget: at this camera (fov 34, ~5.2 units to the
      // fascia) one world unit is ~176px on a 560px-tall deck, and the caps are
      // 30x66px, so the ~1.5px peak below stays comfortably on the cap face.
      // Keep total amplitude under ~0.01 — 0.018 is 3px+ and starts to show.
      if (!reduceMotion) {
        // Two periods that don't divide evenly, so the deck wanders instead of
        // pumping on a metronome.
        const bob = Math.sin(elapsed * 0.62) * 0.0075;
        const sway = Math.sin(elapsed * 0.41) * 0.005;
        // Playing adds a faster, smaller pulse on top, like it's resonating.
        const pulse = playing ? Math.sin(elapsed * 2.4) * 0.0022 : 0;
        rig.root.position.y = bob + pulse;
        rig.root.position.x = sway;
      }

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

/**
 * Mounts the audio-reactive backdrop into `hostRef` for the life of the page.
 *
 * Same canvas-ownership reasoning as useDiscStage: the module creates and
 * removes its own canvas, because teardown calls forceContextLoss() and the
 * element that context died with must not be reused on remount.
 */
function useBackground(
  hostRef: React.RefObject<HTMLDivElement | null>,
): React.RefObject<BackgroundHandle | null> {
  const handleRef = useRef<BackgroundHandle | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const bg = createBackground(host);
    handleRef.current = bg;
    return () => {
      handleRef.current = null;
      bg?.dispose();
    };
  }, [hostRef]);

  return handleRef;
}

/** Hue used with nothing loaded — the page's resting cool blue. */
const IDLE_ACCENT = 210;

/**
 * Eases a hue toward `target` over ~800ms and re-renders as it goes, so every
 * CSS-driven accent on the page (text, rules, the progress line) crossfades on
 * a disc swap instead of cutting.
 *
 * Interpolates the short way around the wheel: 350 -> 10 must travel 20 degrees
 * through red, not 340 back through green.
 */
function useAccentHue(target: number): number {
  const [hue, setHue] = useState(target);
  const hueRef = useRef(target);

  useEffect(() => {
    const from = hueRef.current;
    // Shortest signed arc from `from` to `target`: 350 -> 10 travels 20 degrees
    // forward through red, not 340 backward through green.
    let delta = ((target - from + 540) % 360) - 180;
    if (delta === -180) delta = 180;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Snap instead of animating when motion is reduced, or when the hop is too
    // small to be worth a tween.
    const duration = reduceMotion || Math.abs(delta) < 0.5 ? 0 : 800;

    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = duration === 0 ? 1 : Math.min((now - start) / duration, 1);
      // easeInOutCubic — matches the unhurried feel of the deck's transitions.
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const v = (((from + delta * e) % 360) + 360) % 360;
      hueRef.current = v;
      setHue(v);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    // Always routed through rAF, never set synchronously here: a setState in an
    // effect body triggers an extra render pass before paint.
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return hue;
}

/* =========================================================================
   Page
   ========================================================================= */

type Status = "empty" | "loaded" | "playing";

const SILENT: Levels = { bass: 0, mid: 0, treble: 0 };

export default function Home() {
  // The backdrop owns the AudioContext and analyser, so it is created first and
  // the deck reads its levels. Only one graph can exist per audio element —
  // createMediaElementSource throws on a second call — so this is the single
  // source of band data for everything on the page.
  const bgHostRef = useRef<HTMLDivElement>(null);
  const background = useBackground(bgHostRef);

  const stageHostRef = useRef<HTMLDivElement>(null);
  const stage = useDiscStage(
    stageHostRef,
    // Deliberately not memoized: useDiscStage stores this in a ref and calls it
    // from its render loop, so a fresh closure each render costs nothing and
    // never retriggers the effect. Wrapping it in useCallback would only add a
    // ref read that the compiler cannot verify.
    //
    // Falls back to silence until the analyser is attached on first play, so
    // the cones sit at rest rather than jittering on undefined data.
    () => background.current?.getLevels() ?? SILENT,
  );
  const audioRef = useRef<HTMLAudioElement>(null);

  // Which disc is selected in the rack. Null = tray is empty.
  const [loaded, setLoaded] = useState<number | null>(null);
  // Which song on that disc is cued. Skip/Prev move this; only eject-and-load
  // changes `loaded`, so the transport can never walk off the current disc.
  const [trackIndex, setTrackIndex] = useState(0);
  const [status, setStatus] = useState<Status>("empty");
  // Tray open state drives both the CSS drawer and the WebGL eject offset.
  const [trayOpen, setTrayOpen] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  // Index of the disc currently being dragged out of the rack, and whether the
  // pointer is over the deck. Both are presentation-only.
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOverDeck, setDragOverDeck] = useState(false);

  const disc = loaded === null ? null : DISCS[loaded];
  // Clamped, because a disc swap can land here for a render before the index
  // reset commits — a shorter disc would otherwise index past its track list.
  const track = disc
    ? disc.tracks[Math.min(trackIndex, disc.tracks.length - 1)]
    : null;

  // The page's single accent hue, eased on every disc swap. Everything that
  // used to be hardcoded cyan reads from this, so both columns and the backdrop
  // share one colour identity.
  const accentHue = useAccentHue(disc ? disc.accent : IDLE_ACCENT);
  const accent = (s: number, l: number, a = 1) =>
    `hsl(${accentHue.toFixed(1)} ${s}% ${l}% / ${a})`;

  // Which track's booklet is open as a modal, or null for none. Separate from
  // `trackIndex`: reading a booklet does not change what the deck is playing,
  // so you can read about one track while another is audible.
  const [openTrack, setOpenTrack] = useState<number | null>(null);

  // Playback position, for the transport bar. Driven by timeupdate rather than
  // a rAF loop: the browser fires it ~4x/sec, which is plenty for a progress
  // line and costs nothing while paused.
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);

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

  // Same identity/play state, pushed to the backdrop so the whole page shifts
  // colour with the loaded disc.
  // Listed as a dependency, matching the stage effect above: the ref identity
  // is stable, so this costs nothing and keeps exhaustive-deps satisfied
  // without a suppression.
  useEffect(() => {
    const bg = background.current;
    if (!bg) return;
    // Driven by the disc's accent, not its sheen pair, so the blob is the colour
    // the tray disc reads as. The second hue is offset a little for depth.
    const a = disc ? disc.accent : IDLE_ACCENT;
    bg.setHues(a, (a + 40) % 360);
    bg.setPlaying(status === "playing");
  }, [background, disc, status]);

  /**
   * Runs a control's action and depresses its 3D cap. Deliberately not
   * memoized: it reads stage.current, which a useCallback can't track, and
   * five button handlers don't justify the ceremony.
   */
  const pressControl = (id: ControlId, action: () => void) => {
    stage.current?.pressControl(id);
    action();
  };

  /**
   * Load a disc from the rack: close the tray and cue it up, stopped. Which
   * song you land on is random, so re-inserting a disc isn't the same listen
   * twice — Skip then walks the rest of the disc in order from there.
   */
  const insert = useCallback((index: number) => {
    setLoaded(index);
    setTrackIndex(Math.floor(Math.random() * DISCS[index].tracks.length));
    setStatus("loaded");
    setTrayOpen(false);
    setAudioError(null);
    // A booklet from the previous disc must not survive the swap — its index
    // would point into a different (possibly shorter) track list.
    setOpenTrack(null);
  }, []);

  const eject = useCallback(() => {
    const el = audioRef.current;
    if (el) el.pause();
    setTrayOpen(true);
    setStatus("empty");
    setLoaded(null);
    setTrackIndex(0);
    setAudioError(null);
    // Nothing loaded means nothing to read.
    setOpenTrack(null);
  }, []);

  const play = useCallback(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    setTrayOpen(false);

    // Attach the analyser here rather than in an effect: this runs inside the
    // click, and an AudioContext built outside a user gesture starts suspended
    // — which yields a silent graph rather than an error.
    background.current?.connectAudio(el);

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
        if (track.startAt > 0 && track.startAt < el.duration) {
          el.currentTime = track.startAt;
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
    // `background` is a ref, so reading .current here is not a reactive
    // dependency — exactly like `audioRef` above, which the rule does not flag
    // because it is a direct useRef rather than one returned from a custom hook.
    // Listing it instead is an error under preserve-manual-memoization, so the
    // two rules cannot both be satisfied; omitting is the correct half.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  /**
   * Cue a specific song on the loaded disc and play it — what clicking a case
   * on the shelf does.
   *
   * Deliberately does NOT call `play()`. That callback closes over `track`,
   * which is derived from `trackIndex`, so calling it in the same handler that
   * moves the index would start the track we just navigated away from. Instead
   * this sets the index and declares the intent to play; the track-change effect
   * below sees the new src, fetches it, cues it to its start offset and — because
   * statusRef now reads "playing" — starts it. That is the same path Skip and
   * Prev already take mid-listen.
   *
   * The one thing that must happen inside the click is the analyser hookup: an
   * AudioContext constructed outside a user gesture starts suspended, which
   * yields a silent graph rather than an error.
   */
  const selectTrack = useCallback((index: number) => {
    const el = audioRef.current;
    if (!el || !disc) return;
    if (index < 0 || index >= disc.tracks.length) return;

    background.current?.connectAudio(el);
    setTrayOpen(false);
    setAudioError(null);

    // Same song, currently playing: treat the click as a no-op rather than
    // restarting it from the cue point mid-listen.
    if (index === trackIndex && statusRef.current === "playing") return;

    setTrackIndex(index);
    // statusRef is updated here as well as through state, because the effect
    // reads the ref synchronously when the src change lands — which can happen
    // before the status state has committed.
    statusRef.current = "playing";
    setStatus("playing");

    // Already the cued track, so the src does not change and the track-change
    // effect will not re-run — start it here instead.
    if (index === trackIndex) {
      const t = disc.tracks[index];
      const start = () => {
        if (t.startAt > 0 && t.startAt < el.duration) {
          el.currentTime = t.startAt;
        }
        el.play().catch((err: unknown) => {
          setAudioError(describeMediaError(err, el));
          setStatus("loaded");
        });
      };
      if (el.readyState === 0) {
        // Nothing fetched yet (preload="none"): play() before metadata lands
        // fails with "no supported sources", so wait for the load.
        el.addEventListener("loadedmetadata", start, { once: true });
        el.load();
      } else {
        start();
      }
    }
    // `background` is a ref; see the note on `play` above for why it is not
    // listed as a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disc, trackIndex]);

  /** Pause holds position; Stop rewinds to the current song's cue point. */
  const pause = useCallback(() => {
    const el = audioRef.current;
    if (el) el.pause();
    setStatus(disc ? "loaded" : "empty");
  }, [disc]);

  const stop = useCallback(() => {
    const el = audioRef.current;
    if (el && track) {
      el.pause();
      el.currentTime = track.startAt;
    }
    setStatus(disc ? "loaded" : "empty");
  }, [disc, track]);

  /**
   * Skip and Prev move between songs on the loaded disc and wrap within it —
   * they never change discs. Swapping discs is a physical act: eject, then
   * drag or click another one in. With nothing loaded there's nothing to skip.
   */
  const skip = useCallback(() => {
    if (!disc) return;
    setTrackIndex((i) => (i + 1) % disc.tracks.length);
    setAudioError(null);
    // Keep playing across a skip if we were already playing; the effect below
    // starts the new track once the element has swapped sources.
  }, [disc]);

  const prevTrack = useCallback(() => {
    if (!disc) return;
    setTrackIndex((i) => (i - 1 + disc.tracks.length) % disc.tracks.length);
    setAudioError(null);
  }, [disc]);

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
    if (!el || !track) return;

    const shouldResume = statusRef.current === "playing";
    let cancelled = false;

    const onMeta = () => {
      if (cancelled) return;
      if (track.startAt > 0 && track.startAt < el.duration) {
        el.currentTime = track.startAt;
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
    // Keyed on the audio source only: re-running on every status change would
    // re-cue mid-listen. statusRef carries the latest status without
    // retriggering. Skipping to another song on the same disc changes this key,
    // so the new song is fetched and cued exactly like a fresh insert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.audio]);

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
    /* No background colour on this wrapper: it would paint over the fixed
       backdrop, which is its own child. The page colour lives on <body> in
       globals.css so the canvas composites on top of it instead. */
    <div className="relative flex min-h-full flex-1 flex-col font-sans text-zinc-200 lg:flex-row">
      {/* ================= BACKGROUND: one field for the whole page ========= */}
      {/* Spans both columns. Fixed, not absolute: on the mobile layout the two
          sections stack and the document grows taller than the viewport, and an
          absolute host would stretch to that full height — scaling the scene to
          a very tall aspect and scrolling away with the content. Fixed keeps it
          locked to the viewport at a sane aspect ratio.

          pointer-events-none throughout: the deck's drag-and-drop and every
          control sit above this, and the backdrop must never take a click. */}
      <div
        ref={bgHostRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
      />

      {/* ================= LEFT: the deck and the disc rack ================= */}
      {/* No divider of any kind. The reactive field now spans the whole page
          rather than living in the right column, so there are no longer two
          backgrounds to reconcile — the columns are just content over one
          continuous space. */}
      <section className="relative z-10 flex shrink-0 flex-col items-center gap-6 px-6 py-8 lg:w-[720px] lg:py-10">
        {/* Instructions. First thing read on the page — the deck is only
            obvious once you know a disc has to go into it. */}
        <div className="w-full max-w-[640px]">
          <h2 className="text-2xl font-semibold leading-snug tracking-tight text-white sm:text-[28px]">
            Drag a disc into the player.
          </h2>
          <p className="mt-2 text-base leading-relaxed text-zinc-400 sm:text-lg">
            Hit{" "}
            <span
              className="font-semibold"
              style={{ color: accent(85, 70) }}
            >
              Play
            </span>{" "}
            to hear it,{" "}
            <span
              className="font-semibold"
              style={{ color: accent(85, 70) }}
            >
              Next
            </span>{" "}
            for another track, and read along on the right.
          </p>
        </div>

        {/* The deck. The 3D model carries the controls; the overlay keeps them
            reachable by keyboard and screen reader, and the wrapper is the drop
            target for discs dragged out of the rack. */}
        <div
          className="relative mt-2 h-[480px] w-full max-w-[720px] rounded-2xl ring-2 transition-colors sm:mt-4 sm:h-[560px]"
          style={{
            // Drop-target highlight, in the hue of whichever disc is in hand —
            // so the feedback matches the thing being dragged.
            backgroundColor: dragOverDeck
              ? `hsl(${dragging !== null ? DISCS[dragging].accent : accentHue} 85% 55% / 0.08)`
              : "transparent",
            // Tailwind's ring-<color> can't take a computed value, so the ring
            // colour is set here alongside the fill it belongs with.
            "--tw-ring-color": dragOverDeck
              ? `hsl(${dragging !== null ? DISCS[dragging].accent : accentHue} 85% 60% / 0.6)`
              : "transparent",
          } as React.CSSProperties}
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
          {/* Shadow pool, so the deck sits on a surface. Drawn before the
              colour wash so the wash is not muted by it. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-16 bottom-6 h-10 rounded-[50%] bg-black/70 blur-2xl"
          />
          {/* Colour wash behind the deck, tinted by the loaded disc's own two
              hues so each section lights the room differently. Stays mounted at
              opacity 0 when idle so loading a disc fades the colour up rather
              than popping it in; playing brightens it and starts the breath.
              Two layers: a broad ambient bloom, and a tighter core behind the
              deck itself. Alphas are deliberately high — against the near-black
              #0e0f13 page a subtle wash reads as nothing at all. */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute -inset-8 transition-opacity duration-700 ${
              status === "playing"
                ? "opacity-100 motion-safe:animate-[glowPulse_4.5s_ease-in-out_infinite]"
                : disc
                  ? "opacity-50"
                  : "opacity-0"
            }`}
            style={{
              background: disc
                ? `radial-gradient(58% 44% at 50% 56%, hsl(${disc.hueA} 90% 58% / 0.55) 0%, hsl(${disc.hueB} 85% 52% / 0.3) 42%, transparent 70%)`
                : undefined,
              filter: "blur(46px)",
            }}
          />
          {/* The stage appends its own canvas here — see useDiscStage. */}
          <div ref={stageHostRef} className="absolute inset-0" />

          {/* Floor spill: a hot elliptical pool directly under the deck, so the
              colour looks like it is coming off the machine rather than
              floating behind it. */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-24 bottom-10 h-16 rounded-[50%] transition-opacity duration-700 ${
              status === "playing" ? "opacity-90" : "opacity-0"
            }`}
            style={{
              background: disc
                ? `radial-gradient(closest-side, hsl(${disc.hueA} 95% 60% / 0.5), transparent)`
                : undefined,
              filter: "blur(30px)",
            }}
          />

          {/* Bloom over the deck. Screen blending means it only brightens where
              the shell already catches light, so it reads as the machine
              glowing rather than a coloured sheet laid over it. Above the
              canvas, unlike the washes, which the deck would otherwise hide. */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${
              status === "playing"
                ? "opacity-100 motion-safe:animate-[glowPulse_4.5s_ease-in-out_infinite]"
                : "opacity-0"
            }`}
            style={{
              background: disc
                ? `radial-gradient(46% 34% at 50% 52%, hsl(${disc.hueA} 95% 62% / 0.34) 0%, hsl(${disc.hueB} 90% 58% / 0.16) 50%, transparent 75%)`
                : undefined,
              mixBlendMode: "screen",
              filter: "blur(22px)",
            }}
          />

          {/* Drop hint, shown only while a disc is being dragged. */}
          {dragging !== null && (
            <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
              <span
                className="rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors"
                style={
                  dragOverDeck
                    ? {
                        backgroundColor: `hsl(${dragging !== null ? DISCS[dragging].accent : accentHue} 85% 55% / 0.2)`,
                        color: `hsl(${dragging !== null ? DISCS[dragging].accent : accentHue} 90% 80%)`,
                      }
                    : {
                        backgroundColor: "rgb(255 255 255 / 0.05)",
                        color: "rgb(161 161 170)",
                      }
                }
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
              label="Skip to next song on this disc"
              glyph="▶▶"
              caption="Next"
              disabled={!disc || disc.tracks.length < 2}
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
              label="Previous song on this disc"
              glyph="◀◀"
              caption="Prev"
              disabled={!disc || disc.tracks.length < 2}
              onClick={() => pressControl("next", prevTrack)}
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

        {/* Transport bar. The deck's own controls are modelled geometry with no
            readout, so this is the only place the machine says what it is
            playing and how far in. Monospace, small, low contrast — it reads as
            equipment labelling rather than UI chrome. */}
        <TransportBar
          title={track ? track.title : null}
          discTitle={disc ? disc.title : null}
          trackNumber={
            disc ? Math.min(trackIndex, disc.tracks.length - 1) + 1 : 0
          }
          trackCount={disc ? disc.tracks.length : 0}
          elapsed={elapsed}
          duration={duration}
          playing={status === "playing"}
          accentHue={accentHue}
        />

        {/* Disc rack — draggable CDs. Clicking still loads, so the deck is
            fully usable without ever dragging. */}
        <div className="flex w-full max-w-[640px] flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-4">
            {DISCS.map((d, i) => (
              <RackDisc
                key={d.id}
                disc={d}
                loaded={loaded === i}
                spinning={loaded === i && status === "playing"}
                // Spread the four discs across the 5s float cycle.
                floatDelay={i * 1.25}
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
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            Drag a disc into the deck — or click it
          </p>
        </div>

        {audioError && (
          <div className="w-full max-w-[640px] font-mono text-[11px] text-amber-400/80">
            Audio: {audioError}
          </div>
        )}
      </section>

      {/* ================= RIGHT: the booklet =============================== */}
      {/* The section is the positioning context and does NOT scroll: an
          absolutely-positioned child of a scroll container is anchored to the
          content box, so anything pinned inside it would stretch to the full
          content height and scroll away. Scrolling moves to the inner wrapper. */}
      <section className="relative z-10 flex flex-1 overflow-hidden">
        {/* A shelf of jewel cases, one per track on the loaded disc. The case is
            the thing you browse; the booklet inside it is the thing you read, and
            it opens over the page rather than living beside it. */}
        <div className="relative z-10 flex w-full flex-col overflow-y-auto py-6 pl-4 pr-10 sm:py-10 sm:pl-8 sm:pr-14 lg:py-14 lg:pl-10 lg:pr-16">
          {disc ? (
            <div className="m-auto w-full max-w-3xl">
              <div className="mb-1 flex items-baseline justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.24em]">
                <span style={{ color: accent(75, 66, 0.95) }}>
                  {disc.title}
                </span>
                <span className="text-zinc-500">{disc.catalog}</span>
              </div>
              <p className="mb-7 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                {disc.tracks.length} track
                {disc.tracks.length === 1 ? "" : "s"} · click a case to play it
                and open its booklet
              </p>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {disc.tracks.map((t, i) => (
                  <CaseCard
                    key={t.audio}
                    track={t}
                    disc={disc}
                    trackNumber={i + 1}
                    accentHue={accentHue}
                    // The case for the cued track is marked, so the shelf and
                    // the transport agree on what the deck is playing.
                    current={i === Math.min(trackIndex, disc.tracks.length - 1)}
                    onOpen={() => {
                      // Clicking a case does both: cues and plays that song, and
                      // opens its booklet. The case is the record — picking one
                      // up is how you put it on.
                      selectTrack(i);
                      setOpenTrack(i);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="m-auto max-w-md text-center">
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-400">
                No disc
              </div>
              <p className="text-lg text-zinc-400">
                Load a disc to see its cases.
              </p>
            </div>
          )}
        </div>

        {/* Spine strip down the far edge, as a jewel case spine: section name
            set vertically in small caps plus the catalogue number. Always
            visible, and it gives the dead margin a job. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 z-20 hidden w-10 items-center justify-center border-l border-white/10 bg-black/40 sm:flex"
        >
          <div
            className="flex items-center gap-6 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em]"
            style={{
              // Reads bottom-to-top, like a spine on a shelf.
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
            }}
          >
            <span style={{ color: accent(70, 68, 0.9) }}>
              {disc ? disc.title : "No disc"}
            </span>
            <span className="text-zinc-500">
              {disc ? disc.catalog : "YR-000"}
            </span>
          </div>
        </div>
      </section>

      {/* The booklet, opened over the page. Everything behind it dims and
          blurs, so the paper is unambiguously the thing in focus. */}
      {disc && openTrack !== null && disc.tracks[openTrack] && (
        <BookletModal
          disc={disc}
          track={disc.tracks[openTrack]}
          trackNumber={openTrack + 1}
          trackCount={disc.tracks.length}
          accentHue={accentHue}
          onClose={() => setOpenTrack(null)}
        />
      )}

      {/* preload="none" — the library shouldn't be fetched until a disc is
          actually loaded into the deck. */}
      <audio
        ref={audioRef}
        src={track ? track.audio : undefined}
        onError={() => {
          const el = audioRef.current;
          if (el) setAudioError(describeMediaError(null, el));
        }}
        onEnded={onEnded}
        onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
        // Duration is only known once metadata lands, and it changes with every
        // track swap — read it here rather than caching per track.
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          setDuration(Number.isFinite(d) ? d : 0);
          setElapsed(e.currentTarget.currentTime);
        }}
        preload="none"
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }
        /* Colour wash behind the deck, breathing while a track plays. */
        @keyframes glowPulse {
          0%, 100% { opacity: 0.62; transform: scale(0.97); }
          50%      { opacity: 1;    transform: scale(1.04); }
        }
        /* Idle float for the rack discs. Each disc offsets its own delay so
           the row drifts out of phase instead of bobbing in lockstep. */
        @keyframes discFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }
        /* The loaded disc turns while its track runs. */
        @keyframes discSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        /* The booklet coming out of the case: scales up from slightly small and
           lifts, so it reads as the insert being pulled toward you rather than a
           panel fading in. */
        @keyframes bookletOpen {
          from { opacity: 0; transform: scale(0.965) translateY(10px); }
          to   { opacity: 1; transform: none; }
        }
        /* Serif stack for booklet body copy. No webfont: the booklet wants a
           book face, and every platform already ships one that suits — loading
           another file for it would cost a request and a layout shift. */
        .booklet-page :is(.font-serif, p, li, dd) {
          font-feature-settings: "kern" 1, "liga" 1, "onum" 1;
        }
        @media (prefers-reduced-motion: reduce) {
          .rack-disc, .rack-disc-platter { animation: none !important; }
          .booklet-page { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/**
 * One jewel case on the shelf — a real 3D object, and the button that opens the
 * track's booklet.
 *
 * The <button> owns all interaction; the WebGL canvas inside it is decorative
 * and pointer-transparent. That split is deliberate: the case has to be
 * keyboard-reachable and announce itself to a screen reader, and none of that
 * comes free from a canvas. It also means hover/focus state is driven by real
 * DOM events rather than raycasting.
 */
function CaseCard({
  track,
  disc,
  trackNumber,
  accentHue,
  current,
  onOpen,
}: {
  track: Track;
  disc: Disc;
  trackNumber: number;
  accentHue: number;
  current: boolean;
  onOpen: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<CaseHandle | null>(null);
  // Falls back to the first plate when no explicit cover is set, so a track
  // with a figure never needs the path written twice.
  const cover = track.cover ?? track.plates?.[0]?.src ?? null;
  const eyebrow = `${disc.catalog} · ${String(trackNumber).padStart(2, "0")}`;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const h = createCase(host, {
      title: track.heading,
      eyebrow,
      cover,
      coverFit: track.coverFit ?? "cover",
      accentHue,
    });
    handleRef.current = h;
    return () => {
      handleRef.current = null;
      h?.dispose();
    };
    // Rebuilt only when the printed content changes. accentHue is pushed
    // through setAccent below instead, because rebuilding the whole case (and
    // its WebGL context) on every frame of the 800ms hue tween would be absurd.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.heading, eyebrow, cover, track.coverFit]);

  useEffect(() => {
    handleRef.current?.setAccent(accentHue);
  }, [accentHue]);

  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerEnter={() => handleRef.current?.setHover(true)}
      onPointerLeave={() => handleRef.current?.setHover(false)}
      onFocus={() => handleRef.current?.setHover(true)}
      onBlur={() => handleRef.current?.setHover(false)}
      aria-label={`${track.heading} — play “${track.title}” and open booklet`}
      className="group relative block w-full cursor-pointer rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
    >
      {/* Fixed aspect box for the canvas. The case model is framed to fill it. */}
      <div
        ref={hostRef}
        aria-hidden="true"
        className="pointer-events-none relative aspect-[4/3.4] w-full"
      />
      {/* Text label under the case. The cover art carries the title in 3D, but
          that is a texture — this is the accessible, selectable, always-legible
          version, and it is what a screen reader and a text search will find.
          The CUED flag leads rather than trails: as a trailing item a long title
          truncating beside it pushed the flag away from its own case, which read
          as belonging to the neighbouring one. */}
      <div className="mt-1 flex items-baseline gap-2 px-1">
        {current && (
          <span
            className="shrink-0 font-mono text-[9px] uppercase tracking-[0.16em]"
            style={{ color: accent2(accentHue, 80, 68) }}
          >
            Cued
          </span>
        )}
        <span className="min-w-0 truncate font-mono text-[11px] text-zinc-300 transition-colors group-hover:text-white">
          {track.heading}
        </span>
      </div>
    </button>
  );
}

/** hsl() helper for components that receive a hue rather than the page's own. */
function accent2(hue: number, s: number, l: number, a = 1) {
  return `hsl(${hue.toFixed(1)} ${s}% ${l}% / ${a})`;
}

/**
 * The booklet as a modal card: the paper over a dimmed, blurred page.
 *
 * Focus is moved into the dialog on open and the page behind is inert to
 * scrolling, because a scrollable backdrop under an open modal is the classic
 * way this pattern goes wrong.
 */
function BookletModal({
  disc,
  track,
  trackNumber,
  trackCount,
  accentHue,
  onClose,
}: {
  disc: Disc;
  track: Track;
  trackNumber: number;
  trackCount: number;
  accentHue: number;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes, and the body stops scrolling while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the close button rather than the panel: it is the action a keyboard
    // user most likely wants, and it makes the dismissal discoverable.
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${track.heading} booklet`}
    >
      {/* Backdrop. Blur plus a heavy dim: the field behind keeps moving, and
          without the blur it competes with the paper for attention. */}
      <div
        className="fixed inset-0 animate-[fadeIn_260ms_ease-out] bg-black/78 backdrop-blur-md"
        // A click on the backdrop dismisses, which is the expected affordance.
        // aria-hidden + no button role: Escape and the X are the accessible
        // paths, and a focusable backdrop would just be a trap.
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className="relative my-auto w-full max-w-[48rem]"
        // Stops a click inside the paper from reaching the backdrop handler.
        onClick={(e) => e.stopPropagation()}
      >
        <Booklet
          disc={disc}
          track={track}
          trackNumber={trackNumber}
          trackCount={trackCount}
          accentHue={accentHue}
        />

        {/* Close control, top right of the paper. Sits above the page edge so it
            reads as attached to the booklet rather than floating. */}
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close booklet"
          className="absolute right-3 top-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-[#e4ddd0] text-[15px] leading-none text-[#3a352d] outline-none transition-colors hover:bg-[#d8cfbf] hover:text-black focus-visible:ring-2 focus-visible:ring-black/40 sm:right-5 sm:top-5"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </div>
  );
}

/**
 * The liner-notes booklet: one printed page per track.
 *
 * Set on bone paper because it is the only warm, light surface on an otherwise
 * black page — the contrast is what makes the eye go to the content instead of
 * the hardware, and it gives the asymmetric layout a reason to exist beyond
 * "leftover space".
 *
 * Everything here is print furniture rather than web chrome: monospace credits,
 * hairline rules, numbered plates with captions, a catalogue number in the
 * corner. The accent hue is allowed in only as small marks (the rule above the
 * heading, link underlines), so the paper stays paper.
 */
function Booklet({
  disc,
  track,
  trackNumber,
  trackCount,
  accentHue,
}: {
  disc: Disc;
  track: Track;
  trackNumber: number;
  trackCount: number;
  accentHue: number;
}) {
  const accent = (s: number, l: number, a = 1) =>
    `hsl(${accentHue.toFixed(1)} ${s}% ${l}% / ${a})`;

  const platesBlock =
    track.plates && track.plates.length > 0 ? (
      <div className="relative mt-9 space-y-8">
        {track.plates.map((plate, i) => (
          <figure key={plate.src}>
            {/* Thin dark frame + inner hairline, the way a plate is mounted on a
                page. The image itself carries no rounding: printed figures have
                square corners. */}
            <div
              className={`border border-[#b9b1a2] bg-[#e4ddd0] p-[5px] ${
                // An inset figure is centred at its own size instead of filling
                // the measure, so the frame shrinks to fit the mark.
                plate.inset ? "mx-auto w-fit" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={plate.src}
                width={plate.width}
                height={plate.height}
                alt={plate.alt}
                loading="lazy"
                decoding="async"
                className={
                  plate.inset
                    ? // Capped at its intrinsic width so it is never upscaled,
                      // and allowed to shrink on a narrow screen.
                      "block h-auto max-w-full"
                    : "block h-auto w-full"
                }
                style={
                  plate.inset
                    ? { width: `${plate.width}px`, maxWidth: "100%" }
                    : undefined
                }
              />
            </div>
            <figcaption
              className={`mt-2.5 flex gap-3 font-mono text-[10.5px] leading-relaxed text-[#6b655c] ${
                plate.inset ? "justify-center" : ""
              }`}
            >
              <span
                className="shrink-0 uppercase tracking-[0.16em]"
                style={{ color: accent(55, 38) }}
              >
                Plate {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[#5c564d]">— {plate.caption}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    ) : null;

  const creditsBlock =
    track.credits && track.credits.length > 0 ? (
      <div className="relative mt-9">
        {/* Titled and boxed rather than a bare list of rows. Links are the one
            thing on the page a visitor is actively hunting for, and as unlabelled
            11px monospace they read as a colophon — something to skim past. The
            heading names them, and the tinted panel makes the block findable
            without scanning. */}
        <div
          className="border-t-2 pt-4"
          style={{ borderColor: accent(60, 45) }}
        >
          <h2
            className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.24em]"
            style={{ color: accent(55, 34) }}
          >
            Links &amp; Credits
          </h2>
          {/* A dl keeps the role/value pairing semantic, and dt/dd stay direct
              children of it — so the anchor goes inside the dd rather than
              wrapping the pair, which would be invalid. The anchor is block-level
              so the whole row is still one large target. */}
          <dl className="space-y-1">
            {track.credits.map((c) => (
              <div key={c.role + c.value} className="flex gap-3">
                <dt className="w-[6.5rem] shrink-0 pt-[7px] font-mono text-[10px] uppercase tracking-[0.16em] text-[#6b655c]">
                  {c.role}
                </dt>
                <dd className="min-w-0 flex-1">
                  {c.href ? (
                    // Bumped to 14px semibold in the accent colour with an
                    // arrow: a link has to look clickable at a glance, and at
                    // 11px grey with a hairline underline it did not.
                    <a
                      href={c.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="-mx-2 flex items-baseline gap-1.5 rounded px-2 py-1.5 text-[14px] font-semibold break-words underline decoration-2 underline-offset-[3px] transition-colors hover:bg-[#e3dbcb] focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{
                        color: accent(60, 34),
                        textDecorationColor: accent(70, 62),
                        outlineColor: accent(60, 45),
                      }}
                    >
                      <span className="min-w-0 break-words">{c.value}</span>
                      <span aria-hidden="true" className="shrink-0 text-[11px]">
                        ↗
                      </span>
                    </a>
                  ) : (
                    <span className="block py-1.5 font-mono text-[12px] text-[#2a2823]">
                      {c.value}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    ) : null;

  return (
    <article
      className="booklet-page relative mx-auto w-full max-w-[46rem] animate-[bookletOpen_380ms_cubic-bezier(0.22,1,0.36,1)] px-7 py-9 text-[#1a1917] sm:px-12 sm:py-12"
      style={{
        // Bone, very slightly warm — not white, which reads as a browser
        // default rather than stock.
        background: "#efe9dd",
        // The fold: a soft crease down the gutter edge where the page comes off
        // the spine, plus a hairline of shadow so the paper has a thickness.
        backgroundImage:
          "linear-gradient(90deg, rgb(0 0 0 / 0.13) 0px, rgb(0 0 0 / 0.04) 7px, rgb(0 0 0 / 0) 22px)",
        boxShadow:
          "0 24px 60px -12px rgb(0 0 0 / 0.75), 0 2px 0 rgb(255 255 255 / 0.35) inset",
      }}
    >
      {/* Paper grain. A tiny inline SVG feTurbulence tiled by the browser —
          no asset to ship, and it multiplies over the bone so the surface has
          tooth instead of reading as flat #efe9dd fill. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
          opacity: 0.055,
          mixBlendMode: "multiply",
        }}
      />

      {/* --- masthead ---------------------------------------------------- */}
      <header className="relative">
        <div className="flex items-baseline justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.24em] text-[#6b655c]">
          <span>
            {disc.title}
            {trackCount > 1 && (
              <>
                <span className="mx-2 text-[#a8a196]">·</span>
                Track {String(trackNumber).padStart(2, "0")} /{" "}
                {String(trackCount).padStart(2, "0")}
              </>
            )}
          </span>
          {/* Catalogue number in the corner, as a printed insert carries it. */}
          <span className="tabular-nums">{disc.catalog}</span>
        </div>

        {/* Accent rule — the one place the disc's colour touches the paper. */}
        <div
          className="mt-4 h-[2px] w-16"
          style={{ background: accent(65, 45) }}
        />

        <h1 className="mt-5 text-[2rem] font-semibold leading-[1.1] tracking-tight text-[#12110f] sm:text-[2.6rem]">
          {track.heading}
        </h1>
        {track.standfirst && (
          <p className="mt-3 font-serif text-[17px] italic leading-snug text-[#4a453d]">
            {track.standfirst}
          </p>
        )}
        {/* The song this page is printed against — the booklet is per-track, so
            naming the track ties the paper to what is audible. */}
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8a8377]">
          Printed against &ldquo;{track.title}&rdquo;
        </p>
      </header>

      <hr className="relative my-7 border-0 border-t border-[#c9c1b2]" />

      {/* --- body ------------------------------------------------------- */}
      {/* Serif at a generous measure: this is the one place on the page meant
          for sustained reading, and it should not look like UI text. */}
      <div className="relative space-y-4 font-serif text-[16.5px] leading-[1.72] text-[#26241f] [&_em]:italic [&_li]:mb-2 [&_strong]:font-semibold [&_strong]:text-[#12110f] [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {track.body}
      </div>

      {/* --- credits, then plates --------------------------------------- */}
      {/* Credits lead. The links are what a visitor is actually hunting for, and
          below a full-width figure they sit past the fold on every panel — the
          figures are supporting material and can follow. */}
      {creditsBlock}
      {platesBlock}

      {/* --- colophon --------------------------------------------------- */}
      {trackCount > 1 && (
        <p className="relative mt-9 font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#a09889]">
          Press Next on the deck for {disc.catalog} track{" "}
          {String((trackNumber % trackCount) + 1).padStart(2, "0")}
        </p>
      )}
    </article>
  );
}

/** mm:ss. Guards against the NaN duration an unloaded element reports. */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * The deck's readout: what is playing, how far in, and a progress line.
 *
 * Purely presentational — it reports state and offers no controls, because the
 * transport already lives on the modelled fascia and a second set of buttons
 * would split the metaphor. The progress line is not seekable for the same
 * reason: a real deck of this vintage has no scrub.
 */
function TransportBar({
  title,
  discTitle,
  trackNumber,
  trackCount,
  elapsed,
  duration,
  playing,
  accentHue,
}: {
  title: string | null;
  discTitle: string | null;
  trackNumber: number;
  trackCount: number;
  elapsed: number;
  duration: number;
  playing: boolean;
  accentHue: number;
}) {
  const pct = duration > 0 ? Math.min((elapsed / duration) * 100, 100) : 0;
  const accent = (s: number, l: number, a = 1) =>
    `hsl(${accentHue.toFixed(1)} ${s}% ${l}% / ${a})`;

  return (
    <div className="w-full max-w-[640px]">
      <div className="flex items-baseline justify-between gap-4 font-mono text-[11px]">
        {/* Track name. Raised well above the old 20%-opacity labels: this sits
            over a moving field and has to stay readable. */}
        <div className="min-w-0 flex-1 truncate">
          {title ? (
            <>
              <span
                className="tabular-nums"
                style={{ color: accent(70, 62, 0.9) }}
              >
                {trackCount > 1
                  ? `${String(trackNumber).padStart(2, "0")}`
                  : "01"}
              </span>
              <span className="mx-2 text-zinc-600">·</span>
              <span className="text-zinc-200">{title}</span>
              {discTitle && (
                <span className="ml-2 text-zinc-500">— {discTitle}</span>
              )}
            </>
          ) : (
            <span className="uppercase tracking-[0.18em] text-zinc-500">
              No disc loaded
            </span>
          )}
        </div>
        <div className="shrink-0 tabular-nums text-zinc-400">
          {title ? `${formatTime(elapsed)} / ${formatTime(duration)}` : "--:--"}
        </div>
      </div>

      {/* Progress line. A 1px rule that fills — the thinnest thing that still
          reads as a transport. */}
      <div
        className="relative mt-2 h-px w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label="Track progress"
      >
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-200 ease-linear"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accent(70, 45, 0.5)}, ${accent(85, 65, 1)})`,
            boxShadow: playing ? `0 0 8px ${accent(90, 60, 0.8)}` : "none",
          }}
        />
      </div>
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
  spinning,
  dragging,
  floatDelay,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  disc: Disc;
  loaded: boolean;
  /** The deck is playing this disc — the platter turns to match. */
  spinning: boolean;
  dragging: boolean;
  /** Seconds of negative delay, so each disc sits at a different phase. */
  floatDelay: number;
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
      {/* Everything visual floats inside this wrapper rather than on the button
          itself. Animating the button would leave the hit target in perpetual
          motion — which is not just a mouse annoyance: an element that never
          settles never becomes "stable", so automated clicks (Playwright, and
          tooling that waits on settled layout) time out against it. The button
          keeps a fixed box; only the pixels move. */}
      <span
        aria-hidden="true"
        className="rack-disc absolute inset-0 motion-safe:animate-[discFloat_5s_ease-in-out_infinite] motion-safe:group-hover:[animation-play-state:paused]"
        // Negative delay starts each disc mid-cycle, so the row is already
        // spread across the animation on first paint rather than easing into
        // formation together.
        style={{ animationDelay: `-${floatDelay}s` }}
      >
        {/* Iridescent platter. The conic gradient is the rainbow sweep; the
            repeating radial is the data-track banding. Spins while this disc is
            the one playing — the conic gradient makes the rotation legible.
            The spin is a separate element from the float because both are
            transforms, and one element can only carry one. */}
        <span
          className={`rack-disc-platter absolute inset-0 rounded-full ${
            spinning ? "motion-safe:animate-[discSpin_3.4s_linear_infinite]" : ""
          }`}
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
          className="absolute inset-0 rounded-full opacity-70 transition-opacity group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(115deg, rgba(255,255,255,0) 32%, rgba(255,255,255,0.55) 48%, rgba(255,255,255,0) 62%)",
          }}
        />
        {/* Glow ring, lit only while this disc is the one playing. */}
        <span
          className={`absolute -inset-1 rounded-full transition-opacity duration-500 ${
            spinning ? "opacity-100" : "opacity-0"
          }`}
          style={{
            boxShadow: `0 0 18px 2px hsl(${disc.hueA} 90% 60% / 0.55), 0 0 34px 6px hsl(${disc.hueB} 85% 55% / 0.3)`,
          }}
        />
        {/* Label hub + spindle hole. */}
        <span
          className="absolute left-1/2 top-1/2 h-[34px] w-[34px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-100"
          style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.35)" }}
        />
        <span className="absolute left-1/2 top-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#15171d]" />
      </span>
      {/* Short code, printed on the hub like a real disc label. Outside the
          floating wrapper's aria-hidden so it stays in the accessibility tree. */}
      <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[14px] font-mono text-[8px] font-semibold uppercase tracking-wider text-zinc-700">
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
