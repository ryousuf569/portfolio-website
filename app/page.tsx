"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Disposables, buildBoombox, type ControlId } from "./boombox";
import { createBackground, type BackgroundHandle } from "./background";

/* =========================================================================
   Disc data

   One disc per section, one song per disc. The song is the section's theme:
   it is not a carrier for content, so there is no track list to page through
   and the transport's Next/Prev move between *cards* instead.

   The content lives in `cards`: small panels you flip through in the right
   column. They are deliberately not jewel cases. A case is furniture that
   frames content, and the content is the point.
   ========================================================================= */

/**
 * A figure on a card, a screenshot, chart or logo.
 */
type Figure = {
  src: string;
  /** Intrinsic pixel size, so the layout reserves the right box before load. */
  width: number;
  height: number;
  /** Alt text. Describes the figure, not the fact that it is a figure. */
  alt: string;
  /** Optional caption, set small under the image. */
  caption?: string;
  /**
   * Show the figure at its own size, centred, rather than bled to the card's
   * full width. For logos and other small marks: a 200px square scaled up to a
   * 640px column is visibly soft.
   */
  inset?: boolean;
  /**
   * Cap an inset figure's displayed width, in px. Needed when the source is
   * large but should still be printed small: a 1242px square portrait is not a
   * full-bleed plate, and without a cap `inset` alone would let it fill the
   * card exactly like one.
   */
  maxWidth?: number;
};

/** One line in a card's link list. */
type Link = {
  /** Left column, small caps, the role, e.g. "code", "github". */
  role: string;
  /** Right column, the value. A URL renders as a link. */
  value: string;
  href?: string;
};

/**
 * One card in a section's stack. Each carries exactly one item of content: a
 * single role, a single project, one half of the bio.
 */
type Card = {
  /** Stable key. Also the fragment a card could be linked by later. */
  id: string;
  /** Headline, the one thing this card stands for. */
  heading: string;
  /** Small line above the heading: a company, a stack, a date range. */
  eyebrow?: string;
  /** One-line standfirst under the heading, set in italic serif. */
  standfirst?: string;
  /** The card's body copy. */
  body: React.ReactNode;
  /** Figures, shown in order after the body. */
  figures?: Figure[];
  /** Links block, shown after the body and before the figures. */
  links?: Link[];
};

/**
 * The disc's song. `startAt` is a one-time cue applied on insert, always
 * inside the first three minutes, so the disc drops the listener into the song
 * rather than its intro. When the song ends it loops from 0:00; the offset is
 * not a loop point.
 */
type Song = {
  /** Path under /public. Opus @ 64k VBR, see the note in README/AGENTS. */
  audio: string;
  /** Release title, as shown in the transport bar. */
  title: string;
  /** Seconds into the song where playback should begin on insert. */
  startAt: number;
};

type Disc = {
  id: string;
  title: string;
  /** Short label printed on the disc face. */
  short: string;
  /**
   * Catalogue number, as a small label would carry. Printed on the disc, on
   * the cards and on the spine, so the same identifier follows a section
   * everywhere it appears.
   */
  catalog: string;
  /**
   * One line naming what is on this disc, for the empty-state picker. Written
   * as the contents of the section, not as a pitch for it, a visitor deciding
   * where to start wants to know what they'd be reading.
   */
  blurb: string;
  /** Two hues driving the disc's iridescent sheen. */
  hueA: number;
  hueB: number;
  /**
   * The hue this disc contributes to the whole page, the backdrop blob, the
   * left panel's accents, the transport bar. Named separately from hueA/hueB
   * because the sheen pair is chosen to look iridescent, and the more
   * *identifiable* of the two is not always hueA: EXP reads pink in the tray
   * even though its hueA is orange. This is the one a visitor would name.
   */
  accent: number;
  /** The one song on this disc. */
  song: Song;
  /** The section's content, as cards you flip through. */
  cards: Card[];
};

const DISCS: Disc[] = [
  {
    id: "about",
    title: "About Me",
    short: "ABOUT",
    catalog: "YR-001",
    blurb: "Applied Math at Waterloo, and what I do when I'm not at a screen.",
    hueA: 195,
    hueB: 280,
    accent: 195,
    song: {
      audio: "/hightideintermission.ogg",
      title: "High Tide",
      startAt: 24,
    },
    cards: [
      {
        id: "technical",
        heading: "About me",
        eyebrow: "University of Waterloo",
        body: (
          <>
            <p>
              I&apos;m a second-year Applied Mathematics student at the
              University of Waterloo, specializing in Scientific Machine
              Learning.
            </p>
            <p>
              I take a math-first approach: I don&apos;t write code before I
              understand the theory behind the model I&apos;m building. Whether
              it&apos;s sport analytics, quant modeling, physics, or natural
              language processing, I open up 3Blue1Brown or StatQuest before I
              start on the problem.
            </p>
            <p>
              Outside of math and work, I make music (press play on the CD
              player) and run soccer intramurals with my boys at Waterloo.
            </p>
          </>
        ),
        figures: [
          {
            // 1242x1242. The declared size has to match the file, or the
            // layout reserves a box of the wrong shape and the portrait is
            // distorted until it loads.
            src: "/headshot.JPG",
            width: 1242,
            height: 1242,
            alt:
              "Yousuf Rashid, smiling, in front of a window overlooking a rooftop.",
            caption: "Last time I was happy during finals season",
            // Shown small and centred rather than bled to the full measure: a
            // square portrait at card width would tower over the copy.
            inset: true,
            maxWidth: 300,
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
    blurb: "Research engineering at DeepIDV, NLP research at Wat.AI.",
    hueA: 25,
    hueB: 330,
    accent: 330,
    song: {
      audio: "/buzz-me-in.ogg",
      title: "BUZZ ME IN",
      startAt: 162, // 2:42
    },
    cards: [
      {
        id: "deepidv",
        heading: "Research Engineering Intern @ DeepIDV",
        eyebrow: "DeepIDV · Apr – Aug 2026",
        body: (
          <>
            <p>Co-Authored the Architecture Encryption Algorithm (Patent Pending)</p>
            <ul>
              <li>
                Sole architecture reviewer of a three-party consent-gated
                decryption protocol requiring collaborative recovery across
                Client, HSM-backed Operator, and Relying Party
              </li>
              <li>
                Removed ArcFace embeddings from the encryption boundary and
                introduced fuzzy extraction to absorb biometric vector variance,
                eliminating hashing issues
              </li>
              <li>
                Generated <strong>2500+</strong> synthetic IDs across 100+
                document types with YOLO and PIL, powering a TensorFlow
                classifier that reached <strong>99.8%</strong> accuracy
              </li>
            </ul>
          </>
        ),
        figures: [
          {
            src: "/deepidv.jpg",
            width: 200,
            height: 200,
            alt: "DeepIDV logo, a chevron mark in two tones of blue.",
            inset: true,
          },
        ],
      },
      {
        id: "watai",
        heading: "NLP Research @ Wat.AI",
        eyebrow: "Wat.AI · Jan – Dec 2026",
        body: (
          <>
            <p>
              Owned the sentiment analysis pipeline for the Macro scenario
              simulator InsightPulse
            </p>
            <ul>
              <li>
                Finetuning FinBERT to accurately predict sentiment on Macro
                headlines unfreezing the top 6 encoder blocks to gain +29.8 macro F1 
                without a full retrain
              </li>
              <li>
                Working on Asset-conditioned financial sentiment research;
                predicting sentiment for assets not mentioned in the headline.
              </li>
            </ul>
          </>
        ),
        links: [
          {
            role: "finbert-macro",
            value: "huggingface.co/ryousuf569/finbert-macro",
            href: "https://huggingface.co/ryousuf569/finbert-macro",
          },
          {
            role: "insightpulse",
            value: "github.com/SharanyaBasu/InsightPulse",
            href: "https://github.com/SharanyaBasu/InsightPulse",
          },
        ],
        figures: [
          {
            src: "/wat_ai_logo.jpg",
            width: 200,
            height: 200,
            alt:
              "Wat.AI logo, a stylised yellow W drawn in a single line on black.",
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
    blurb:
      "Reinforcement learning on a football pitch, draft policies, and overfit detection.",
    hueA: 140,
    hueB: 200,
    accent: 160,
    song: {
      audio: "/ladybird-mm1.ogg",
      title: "lakeshore west (ladybird)",
      startAt: 42, // 0:42
    },
    cards: [
      {
        id: "lowblock-rl",
        heading: "Constrained Multi-Agent RL for Spatial Control Tasks",
        eyebrow: "Soccer based environments · CUDA · PyTorch",
        standfirst:
          "Ten agents learning to take space under constraints, on a spatial-control model rewritten to run 5x faster.",
        body: (
          <>
            <p>
              Agents are rewarded by <em>pitch control</em>, William
              Spearman&apos;s model of which team would reach a given patch of
              grass first. Rewarding goals alone is far too sparse to learn
              from, so the agents are paid continuously for the space they take.
            </p>
            <ul>
              <li>
                Rewrote the spatial-control model as{" "}
                <strong>a custom CUDA kernel in C++</strong>, delivering a{" "}
                <strong>5.44x</strong> throughput gain at 0.0009 max deviation
                from a known NumPy implementation.
              </li>
              <li>
                Implemented Lagrangian-constrained PPO (Roy et al., 2022) in
                PyTorch over a 10-agent MultiDiscrete action space,
                outperforming a 10M-step unconstrained PPO baseline after just{" "}
                <strong>2.5M</strong> steps.
              </li>
              <li>
                Calibrated a correlated-Gaussian generative model of
                multi-agent formations against real-world tracking data.
              </li>
              <li>
                Found that patching an emergent side effect in
                Lagrangian-constrained PPO cost <strong>15pp</strong> of task
                success, isolating a real trade-off in multi-constraint RL.
              </li>
            </ul>
          </>
        ),
        links: [
          {
            role: "code",
            value: "github.com/ryousuf569/haramball-hunter",
            href: "https://github.com/ryousuf569/haramball-hunter",
          },
          {
            role: "method",
            value: "Lagrangian-constrained PPO · Spearman pitch control",
          },
        ],
        figures: [
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
      },
      {
        id: "nba-draft-policy",
        heading: "Sequential Ranking Policy with Counterfactual Evaluation",
        eyebrow: "NBA fantasy drafts · XGBoost · Cox · Monte Carlo",
        standfirst:
          "A two-stage drafting policy, and the harness that proved its win was noise.",
        body: (
          <>
            <p>
              A <strong>two-stage ranking</strong> system: XGBoost scores
              candidates, and a <strong>Monte Carlo</strong> rollout policy
              decides the order to take them in. Candidate availability is
              modelled with a <strong>Cox survival</strong> model, reaching{" "}
              <strong>0.935</strong> concordance.
            </p>
            <ul>
              <li>
                Counterfactual evaluation over <strong>4,400</strong> paired
                drafts, controlling for season, league size, slot and seed.
              </li>
              <li>
                At small sample the policy looked like a <strong>+2.35</strong>{" "}
                pt lift. The confidence interval rejected it as noise. At full
                scale it underperformed the ADP baseline by{" "}
                <strong>−0.14</strong> pts. The harness is the result.
              </li>
            </ul>
          </>
        ),
        links: [
          {
            role: "code",
            value: "github.com/ryousuf569/espn-draft-sequential-optimization",
            href:
              "https://github.com/ryousuf569/espn-draft-sequential-optimization",
          },
          {
            role: "paper",
            value: "Does draft-order modeling beat expert consensus? (PDF)",
            href: "/backtest.pdf",
          },
        ],
        figures: [
          {
            src: "/nba_draft_paired.png",
            width: 1776,
            height: 1000,
            alt:
              "Histogram of paired per-draft differences between the sequencing policy and the VORP-greedy baseline, centred on zero: median −0.44 with a 5th–95th range of −14.2 to +14.6, beating the baseline in 45.7% of drafts.",
            caption:
              "Sequencing on identical inputs, draft by draft. The per-draft spread is two orders of magnitude wider than the effect being measured, which is why the +2.35 did not survive.",
          },
        ],
      },
      {
        id: "sonarql",
        heading: "Overfit Detection on Trading Strategies",
        eyebrow: "SonarQL · bootstrap · Monte Carlo",
        standfirst:
          "A query layer that tells you when a backtest is only luck.",
        body: (
          <>
            <p>
              Distribution diagnostics built on{" "}
              <strong>bootstrap sampling</strong> and{" "}
              <strong>Monte Carlo</strong> simulation, to catch p-hacked and
              overfit trading strategies, flagging false positives with{" "}
              <strong>68%</strong> accuracy and avoiding{" "}
              <strong>$2,000</strong> in paper-trading losses.
            </p>
            <ul>
              <li>
                Optimized the simulation engine for{" "}
                <strong>10,000+</strong> simulations per query, estimating
                price-change distributions conditioned on technical indicators
                (RSI, moving averages, volatility).
              </li>
              <li>
                Built a query layer with regex parsing that translates
                SQL-inspired syntax into executable logic.
              </li>
            </ul>
          </>
        ),
        links: [
          {
            role: "code",
            value: "github.com/ryousuf569/SonarQL",
            href: "https://github.com/ryousuf569/SonarQL",
          },
        ],
        figures: [
          {
            src: "/sonarql.png",
            width: 1156,
            height: 654,
            alt:
              "The SonarQL interface: a query reading SELECT SMA20 FROM NQ WHERE CHANGE=0.5 SIM=1000, with result tiles for mean and median percent change, sample size, p-value 0.15, a 5th/95th band, a panel reading “P-hack value looks safe”, and a ranked list of the strongest indicators for NQ.",
            caption:
              "A query and its verdict: 1,000 simulations, p = 0.15, and the strongest indicators ranked by correlation and R².",
          },
        ],
      },
    ],
  },
  {
    id: "links",
    title: "Links",
    short: "LINKS",
    catalog: "YR-004",
    blurb: "Email, GitHub, LinkedIn, resume, and the music.",
    hueA: 45,
    hueB: 15,
    accent: 38,
    song: {
      audio: "/forbearance-mm.ogg",
      title: "solace (forbearance)",
      startAt: 45, // 0:45
    },
    cards: [
      {
        id: "professional",
        heading: "Get in touch",
        eyebrow: "Waterloo, ON",
        body: (
          <p>
            Email is the surest way to reach me. The resume below is the
            general ML one; ask if you want the version aimed at something more
            specific.
          </p>
        ),
        links: [
          {
            role: "email",
            value: "y2rashid@uwaterloo.ca",
            href: "mailto:y2rashid@uwaterloo.ca",
          },
          {
            role: "github",
            value: "github.com/ryousuf569",
            href: "https://github.com/ryousuf569",
          },
          {
            role: "linkedin",
            value: "linkedin.com/in/yousuf-rashid-2730122a5",
            href: "https://www.linkedin.com/in/yousuf-rashid-2730122a5/",
          },
          {
            role: "resume",
            value: "General ML resume (PDF)",
            href: "/GENERAL_ML_RESUME.pdf",
          },
          {
            role: "spotify",
            value: "The music, on Spotify",
            href:
              "https://open.spotify.com/artist/46yz0crerAYXpWiSYpkfN7?si=tqfIUnBISKGDMKhqprsBbQ",
          },
        ],
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
// targets: one quad, a few dozen ALU ops per pixel.
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
 * carries a MediaError, that code is the more specific diagnosis; in
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
  // its own effect rather than during render, a render-phase ref write is not
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
      canvas.remove(); // No WebGL, so leave the host empty.
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
    // so these are lower than they'd need to be on their own. They're here for
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
    // Follower for woofer excursion, see the render loop for why the raw bass
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
      // screen, only the disc comes and goes.

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
      // only: the ring, bezel and surround stay bolted to the cabinet.
      //
      // Smoothed with its own follower rather than using the raw band value:
      // the analyser is already smoothed, but bass is spiky enough that feeding
      // it straight in makes the cones buzz instead of pump. Attack is faster
      // than release, which is how a cone actually behaves: it snaps out on the
      // transient and settles back.
      {
        const bass = playing ? levelsRef.current().bass : 0;
        const k = bass > woofer ? 0.35 : 0.12;
        woofer += (bass - woofer) * k;
        // Gentle knee: quiet passages barely move, loud ones travel most of the
        // budget. Excursion is small, 0.05 world units is already several
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
      // so any yaw/pitch swings the caps out from under their labels, whereas
      // a translation slides cap and label the same way and only their small
      // difference shows. Budget: at this camera (fov 34, ~5.2 units to the
      // fascia) one world unit is ~176px on a 560px-tall deck, and the caps are
      // 30x66px, so the ~1.5px peak below stays comfortably on the cap face.
      // Keep total amplitude under ~0.01; 0.018 is 3px+ and starts to show.
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
      // Required as of Next 16: dispose() alone does not release the context
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

/** Hue used with nothing loaded, the page's resting cool blue. */
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
      // easeInOutCubic, matches the unhurried feel of the deck's transitions.
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
  // the deck reads its levels. Only one graph can exist per audio element,
  // createMediaElementSource throws on a second call, so this is the single
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
  // Which card of that disc is face-up. Next/Prev move this: with one song per
  // disc there is nothing to skip *to* musically, so the transport pages
  // through the section's content instead, which is the thing a visitor
  // actually wants to advance.
  const [cardIndex, setCardIndex] = useState(0);
  const [status, setStatus] = useState<Status>("empty");
  // Tray open state drives both the CSS drawer and the WebGL eject offset.
  const [trayOpen, setTrayOpen] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  // Index of the disc currently being dragged out of the rack, and whether the
  // pointer is over the deck. Both are presentation-only.
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOverDeck, setDragOverDeck] = useState(false);
  // Which section the pointer is over in the empty-state picker. Lights the
  // matching disc in the rack, so a visitor sees that the named card and the
  // small iridescent disc are the same thing, which is what makes the rack
  // legible as a control afterwards.
  const [hoveredDisc, setHoveredDisc] = useState<number | null>(null);

  const disc = loaded === null ? null : DISCS[loaded];
  const song = disc ? disc.song : null;
  // Clamped, because a disc swap can land here for a render before the index
  // reset commits, a shorter disc would otherwise index past its card list.
  const card = disc
    ? disc.cards[Math.min(cardIndex, disc.cards.length - 1)]
    : null;
  const safeCardIndex = disc
    ? Math.min(cardIndex, disc.cards.length - 1)
    : 0;

  // The page's single accent hue, eased on every disc swap. Everything that
  // used to be hardcoded cyan reads from this, so both columns and the backdrop
  // share one colour identity.
  const accentHue = useAccentHue(disc ? disc.accent : IDLE_ACCENT);
  const accent = (s: number, l: number, a = 1) =>
    `hsl(${accentHue.toFixed(1)} ${s}% ${l}% / ${a})`;

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
   * Load a disc from the rack: close the tray and cue it up, stopped. Always
   * lands on the section's first card, because a section reads in order and starting
   * anywhere else would drop the visitor mid-argument.
   */
  const insert = useCallback((index: number) => {
    setLoaded(index);
    setCardIndex(0);
    setStatus("loaded");
    setTrayOpen(false);
    setAudioError(null);
    // Return to the top of the document. On a phone the picker is a tall
    // scrolling block, so a visitor is usually part-way down it when they tap a
    // section; the browser preserves that scroll offset across the swap and the
    // card, which is shorter than the picker was, ends up above the viewport.
    // The result looks like tapping did nothing. Desktop is unaffected: the
    // columns sit side by side and the page does not scroll.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, []);

  const eject = useCallback(() => {
    const el = audioRef.current;
    if (el) el.pause();
    setTrayOpen(true);
    setStatus("empty");
    setLoaded(null);
    setCardIndex(0);
    setAudioError(null);
  }, []);

  const play = useCallback(() => {
    const el = audioRef.current;
    if (!el || !song) return;
    setTrayOpen(false);

    // Attach the analyser here rather than in an effect: this runs inside the
    // click, and an AudioContext built outside a user gesture starts
    // suspended, which yields a silent graph rather than an error.
    background.current?.connectAudio(el);

    // No cueing here: the disc-change effect already positions a freshly
    // inserted disc at its start offset, and Stop rewinds to it. Re-cueing on
    // every Play would drag the listener forward to the offset after the
    // song had looped back to 0:00.
    // If the element hasn't fetched anything yet (preload="none", or a src
    // swap that hasn't resolved), kick off the load and cue once metadata
    // lands. play() on an unloaded element is what produced the "no supported
    // sources" error; the source was fine, it just hadn't been fetched.
    if (el.readyState === 0) {
      const onMeta = () => {
        if (song.startAt > 0 && song.startAt < el.duration) {
          el.currentTime = song.startAt;
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
    // dependency, exactly like `audioRef` above, which the rule does not flag
    // because it is a direct useRef rather than one returned from a custom hook.
    // Listing it instead is an error under preserve-manual-memoization, so the
    // two rules cannot both be satisfied; omitting is the correct half.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song]);

  /** Pause holds position; Stop rewinds to the song's cue point. */
  const pause = useCallback(() => {
    const el = audioRef.current;
    if (el) el.pause();
    setStatus(disc ? "loaded" : "empty");
  }, [disc]);

  const stop = useCallback(() => {
    const el = audioRef.current;
    if (el && song) {
      el.pause();
      el.currentTime = song.startAt;
    }
    setStatus(disc ? "loaded" : "empty");
  }, [disc, song]);

  /**
   * Next and Prev flip through the loaded disc's cards and wrap within it,
   * they never change discs, and they never touch playback. The song is the
   * section's backing track: it keeps running while you read.
   */
  const nextCard = useCallback(() => {
    if (!disc) return;
    setCardIndex((i) => (i + 1) % disc.cards.length);
  }, [disc]);

  const prevCard = useCallback(() => {
    if (!disc) return;
    setCardIndex((i) => (i - 1 + disc.cards.length) % disc.cards.length);
  }, [disc]);

  // When the source changes, cue the new disc's song to its offset. If we were
  // playing, keep playing across the swap.
  //
  // Seeking has to wait for metadata: with preload="none" a freshly-swapped
  // src has readyState 0 and no known duration, so assigning currentTime
  // immediately is silently dropped and play() races the loader. Calling
  // load() starts the fetch, and loadedmetadata is the first point at which
  // the element can actually be positioned.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !song) return;

    const shouldResume = statusRef.current === "playing";
    let cancelled = false;

    const onMeta = () => {
      if (cancelled) return;
      if (song.startAt > 0 && song.startAt < el.duration) {
        el.currentTime = song.startAt;
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
    // re-cue mid-listen, and flipping cards must not disturb playback at all.
    // statusRef carries the latest status without retriggering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.audio]);

  // Loop back to 0:00 when the song runs out, per the brief, the start offset
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
          absolute host would stretch to that full height, scaling the scene to
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
          backgrounds to reconcile. The columns are just content over one
          continuous space. */}
      {/* Always order-2 on mobile: the content leads and the deck follows.
          Stacked, this column is a screenful of hardware, so putting it first
          (which an earlier revision did once a disc was loaded) pushed the card
          you are meant to read entirely below the fold. The deck is the
          instrument; the cards are the point. Desktop (lg) puts them
          side-by-side, where the question does not arise. */}
      <section
        className="relative z-10 order-2 flex shrink-0 flex-col items-center gap-6 px-6 py-8 lg:order-1 lg:w-[720px] lg:py-10"
      >
        {/* Who this is, then what to do. The old heading led with "Drag a disc
            into the player". Drag is the fiddliest way in, and putting it
            first made the page look like it demanded a knack. The picker on the
            right is now the instruction; this is identification. */}
        <div className="w-full max-w-[640px]">
          <h1 className="text-2xl font-semibold leading-snug tracking-tight text-white sm:text-[28px]">
            Yousuf Rashid
          </h1>
          {/* Two states. With nothing loaded this says who I am, because the
              picker on the right is already saying what to do and two
              instructions competing for the same moment is how a visitor ends
              up reading neither. Once a disc is in, it becomes the legend for
              the controls they now have. */}
          {disc ? (
            /* Desktop only. On a phone the fascia buttons this sentence names
               are hidden and the deck sits far below the fold, so naming them
               here points the visitor at controls they cannot see. The touch
               transport up beside the card is self-labelling, so the phone gets
               the deck as an object to look at rather than a legend. */
            <p className="mt-2 hidden text-base leading-relaxed text-zinc-400 sm:block sm:text-lg">
              Hit{" "}
              <span className="font-semibold" style={{ color: accent(85, 70) }}>
                {status === "playing" ? "Pause" : "Play"}
              </span>{" "}
              for the song,{" "}
              <span className="font-semibold" style={{ color: accent(85, 70) }}>
                Next
              </span>{" "}
              to flip through the cards, and{" "}
              <span className="font-semibold" style={{ color: accent(85, 70) }}>
                Eject
              </span>{" "}
              to change section.
            </p>
          ) : (
            <p className="mt-2 text-base leading-relaxed text-zinc-400 sm:text-lg">
              Applied Mathematics at Waterloo, specializing in scientific machine learning.
              Every section comes with a song.
            </p>
          )}
        </div>

        {/* The deck. The 3D model carries the controls; the overlay keeps them
            reachable by keyboard and screen reader, and the wrapper is the drop
            target for discs dragged out of the rack. */}
        {/* isolate + the clip below: the glow washes inside bleed past this box
            by design (-inset-8), which on a narrow viewport pushed the document
            8px wider than the screen and left the whole page scrollable
            sideways. Clipping the bleed here keeps the effect and kills the
            scroll; the washes are all decorative, so nothing is lost. */}
        <div
          // 320px on a phone, not 480: at 480 the deck alone was more than half
          // an 844px screen, which is what buried the content. The model is
          // framed by the camera rather than cropped, so a shorter box just
          // shows a smaller deck.
          className="relative isolate mt-2 h-[320px] w-full max-w-[720px] overflow-hidden rounded-2xl ring-2 transition-colors sm:mt-4 sm:h-[480px] lg:h-[560px]"
          style={{
            // Drop-target highlight, in the hue of whichever disc is in hand,
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
              deck itself. Alphas are deliberately high. Against the near-black
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
          {/* The stage appends its own canvas here, see useDiscStage. */}
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
          {/* Hidden below sm: these are pinned to the modelled caps as
              percentages, so on a 320px-tall deck they shrink to roughly
              20x40px, well under the 44px minimum touch target, and they sit
              on a canvas a thumb cannot aim at precisely. Phones get the
              TouchTransport bar below the deck instead, which is the same five
              actions at a tappable size. */}
          <div
            className="pointer-events-none absolute inset-0 hidden [&>button]:pointer-events-auto sm:block"
            role="group"
            aria-label="CD deck transport controls"
          >
            {/* Positions are the modelled caps' own projected screen
                coordinates (measured, not eyeballed) expressed as percentages,
                so the labels stay on their caps at every deck size. The deck is
                held square to the camera for the same reason, see the render
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
              label="Next card on this disc"
              glyph="▶▶"
              caption="Next"
              disabled={!disc || disc.cards.length < 2}
              onClick={() => pressControl("play", nextCard)}
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
              label="Previous card on this disc"
              glyph="◀◀"
              caption="Prev"
              disabled={!disc || disc.cards.length < 2}
              onClick={() => pressControl("next", prevCard)}
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

        {/* Phone transport. The modelled fascia is unusable at thumb size, so
            below sm the same five actions get real buttons. */}
        <TouchTransport
          playing={status === "playing"}
          hasDisc={!!disc}
          accentHue={accentHue}
          onPlayPause={() =>
            pressControl("power", status === "playing" ? pause : play)
          }
          onStop={() => pressControl("prev", stop)}
          onEject={() => pressControl("eject", eject)}
        />

        {/* Transport bar. The deck's own controls are modelled geometry with no
            readout, so this is the only place the machine says what it is
            playing and how far in. Monospace, small, low contrast, it reads as
            equipment labelling rather than UI chrome. */}
        <TransportBar
          title={song ? song.title : null}
          discTitle={disc ? disc.title : null}
          elapsed={elapsed}
          duration={duration}
          playing={status === "playing"}
          accentHue={accentHue}
        />

        {/* Disc rack, draggable CDs. Clicking still loads, so the deck is
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
                // Lit while its section is hovered in the picker, so the named
                // card and this disc read as the same object.
                highlighted={hoveredDisc === i}
                onClick={() => insert(i)}
                onPointerEnter={() => setHoveredDisc(i)}
                onPointerLeave={() => setHoveredDisc(null)}
                onDragStart={() => setDragging(i)}
                onDragEnd={() => {
                  setDragging(null);
                  setDragOverDeck(false);
                }}
              />
            ))}
          </div>
          {/* Names the rack rather than repeating the instruction: with the
              picker on the right carrying the call to action, a third "drag a
              disc" line was just noise. Once a disc is loaded this is the only
              visible way to switch, so it says so then. */}
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            {disc ? "Click another disc to switch" : "The rack: click or drag"}
          </p>
        </div>

        {audioError && (
          <div className="w-full max-w-[640px] font-mono text-[11px] text-amber-400/80">
            Audio: {audioError}
          </div>
        )}
      </section>

      {/* ================= RIGHT: the cards ================================ */}
      {/* The section is the positioning context and does NOT scroll: an
          absolutely-positioned child of a scroll container is anchored to the
          content box, so anything pinned inside it would stretch to the full
          content height and scroll away. Scrolling moves to the inner wrapper. */}
      <section className="relative z-10 order-1 flex flex-1 overflow-hidden lg:order-2">
        {/* The loaded disc's content, one card at a time. Reading happens here,
            beside the deck, not in a modal over it. */}
        <div className="relative z-10 flex w-full flex-col overflow-y-auto py-6 pl-4 pr-10 sm:py-10 sm:pl-8 sm:pr-14 lg:py-14 lg:pl-10 lg:pr-16">
          {disc && card ? (
            <CardDeck
              disc={disc}
              index={safeCardIndex}
              accentHue={accentHue}
              onNext={nextCard}
              onPrev={prevCard}
              onSelect={setCardIndex}
            />
          ) : (
            /* Nothing loaded. This half of the page used to say "Load a disc"
               and stop there, a instruction with nothing to act on, in the
               largest empty area on screen. It is now the primary call to
               action: the four sections, named, with what is inside them, each
               one loading its disc on click. The rack below the deck still
               works and still drags; this is the obvious path for a visitor
               who has not realised those small discs are buttons. */
            <SectionPicker
              accentHue={accentHue}
              onPick={insert}
              hoveredDisc={hoveredDisc}
              onHoverDisc={setHoveredDisc}
            />
          )}
        </div>

        {/* Spine strip down the far edge, like the spine of a case on a shelf:
            section name set vertically in small caps plus the catalogue
            number. Always visible, and it gives the dead margin a job. */}
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
            <span className="text-zinc-400">
              {disc ? disc.catalog : "YR-000"}
            </span>
          </div>
        </div>
      </section>

      {/* preload="none", the library shouldn't be fetched until a disc is
          actually loaded into the deck. */}
      <audio
        ref={audioRef}
        src={song ? song.audio : undefined}
        onError={() => {
          const el = audioRef.current;
          if (el) setAudioError(describeMediaError(null, el));
        }}
        onEnded={onEnded}
        onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
        // Duration is only known once metadata lands, and it changes with every
        // disc swap, read it here rather than caching per song.
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
        /* The loaded disc turns while its song runs. */
        @keyframes discSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        /* A card coming to the top of the stack: rises and settles, so a flip
           reads as the next card being dealt rather than the text swapping in
           place. Short, this fires on every flip, and anything slower makes
           paging through a section feel sluggish. */
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(10px) scale(0.99); }
          to   { opacity: 1; transform: none; }
        }
        /* Old-style figures and proper kerning for the card's serif standfirst.
           No webfont: every platform already ships a book face that suits, and
           loading one would cost a request and a layout shift. */
        .portfolio-card :is(.font-serif, p, li, dd) {
          font-feature-settings: "kern" 1, "liga" 1, "onum" 1;
        }
        @media (prefers-reduced-motion: reduce) {
          .rack-disc, .rack-disc-platter { animation: none !important; }
          .portfolio-card { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/**
 * The empty state, and the page's primary call to action.
 *
 * With nothing loaded this column previously held the words "Load a disc to
 * read its cards", an instruction with nothing to act on, occupying the
 * largest clear area on the page. The four discs that *are* the entry point sat
 * small and unlabelled at the bottom of the other column, so a visitor had to
 * work out both that they were buttons and what was inside them.
 *
 * So the instruction becomes the control: each section named, with a line on
 * what it contains and how many cards, loading its disc on click. Hovering one
 * lights the matching disc in the rack, which is what teaches the rack for the
 * second visit.
 */
function SectionPicker({
  accentHue,
  onPick,
  hoveredDisc,
  onHoverDisc,
}: {
  accentHue: number;
  onPick: (index: number) => void;
  hoveredDisc: number | null;
  onHoverDisc: (index: number | null) => void;
}) {
  const accent = (s: number, l: number, a = 1) =>
    `hsl(${accentHue.toFixed(1)} ${s}% ${l}% / ${a})`;

  return (
    <div className="m-auto w-full max-w-2xl">
      <p
        className="font-mono text-[10px] uppercase tracking-[0.28em]"
        style={{ color: accent(70, 62, 0.9) }}
      >
        Start here
      </p>
      <h2 className="mt-3 text-[1.7rem] font-semibold leading-[1.15] tracking-tight text-white sm:text-[2.1rem]">
        Pick a section.
      </h2>
      {/* Two phrasings. On a phone the deck sits below this block rather than
          beside it, so "here" and "the player" would point at the wrong place
          and at something not yet on screen. */}
      <p className="mt-2.5 max-w-lg text-[15px] leading-relaxed text-zinc-400 sm:hidden">
        Tap one to load its disc. It starts playing, and its cards open right
        here.
      </p>
      <p className="mt-2.5 hidden max-w-lg text-[15px] leading-relaxed text-zinc-400 sm:block">
        Each one loads a disc into the player, starts its song, and lays its
        cards out here.
      </p>

      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DISCS.map((d, i) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onPick(i)}
            onPointerEnter={() => onHoverDisc(i)}
            onPointerLeave={() => onHoverDisc(null)}
            onFocus={() => onHoverDisc(i)}
            onBlur={() => onHoverDisc(null)}
            className="group relative cursor-pointer overflow-hidden rounded-xl border p-4 text-left outline-none transition-all duration-200 hover:-translate-y-0.5 focus-visible:ring-2"
            style={{
              // Tinted by the section's own hue rather than the page accent, so
              // the four read as four different things, and each card is the
              // colour the disc it loads will turn the whole page.
              borderColor: `hsl(${d.accent} 70% 60% / ${hoveredDisc === i ? 0.5 : 0.18})`,
              background:
                hoveredDisc === i
                  ? `linear-gradient(180deg, hsl(${d.accent} 70% 55% / 0.12), hsl(${d.accent} 70% 55% / 0.04))`
                  : "linear-gradient(180deg, rgb(255 255 255 / 0.04), rgb(255 255 255 / 0.015))",
              ["--tw-ring-color" as string]: `hsl(${d.accent} 80% 65% / 0.8)`,
            }}
          >
            {/* Accent hairline along the top edge, brightening on hover. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity duration-200"
              style={{
                background: `linear-gradient(90deg, transparent, hsl(${d.accent} 85% 65% / 0.85), transparent)`,
                opacity: hoveredDisc === i ? 1 : 0.35,
              }}
            />

            <div className="flex items-start gap-3">
              {/* A small platter, so the card and the disc in the rack are
                  visibly the same object. Same conic-gradient recipe as
                  RackDisc, at a size where only the sheen needs to read. */}
              <span
                aria-hidden="true"
                className="mt-0.5 block h-9 w-9 shrink-0 rounded-full transition-transform duration-200 group-hover:scale-110"
                style={{
                  background: `
                    conic-gradient(from 210deg,
                      hsl(${d.hueA} 70% 52%),
                      hsl(${d.hueB} 72% 56%),
                      hsl(${d.hueA} 65% 44%),
                      hsl(${d.hueB} 70% 58%),
                      hsl(${d.hueA} 70% 52%))
                  `,
                  boxShadow:
                    "inset 0 0 0 1px rgb(255 255 255 / 0.25), 0 3px 8px rgb(0 0 0 / 0.5)",
                }}
              >
                <span
                  className="block h-full w-full rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 50%, rgb(240 240 245) 0 22%, transparent 23%)",
                  }}
                />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[15.5px] font-semibold leading-tight text-white">
                    {d.title}
                  </span>
                  <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.16em] text-zinc-400">
                    {d.cards.length} card{d.cards.length === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-zinc-400">
                  {d.blurb}
                </span>
                {/* The song, named. It is half the point of the section, and
                    naming it up front sets the expectation that clicking will
                    start playing something. */}
                <span className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]">
                  <span aria-hidden="true" style={{ color: `hsl(${d.accent} 80% 68%)` }}>
                    ▶
                  </span>
                  <span className="min-w-0 truncate text-zinc-400">
                    {d.song.title}
                  </span>
                </span>
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop only. Stacked on mobile this block sits above the deck and the
          rack, so pointing at "the rack" would name something the visitor has
          not scrolled to yet, and dragging is a mouse gesture regardless. */}
      <p className="mt-5 hidden font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400 lg:block">
        Or drag a disc from the rack into the player
      </p>
    </div>
  );
}

/**
 * The card deck: a section's content as a small stack you flip through.
 *
 * Deliberately not a jewel case and not a modal. A case is furniture that
 * frames content, and a modal makes reading a detour off the page. Both put a
 * ceremony between the visitor and two paragraphs of text. Here the content is
 * simply *there*, one card at a time, and Next/Prev turn it.
 *
 * The card is translucent over the live background rather than opaque: the
 * reactive field is the page's whole identity, and a solid panel punches a hole
 * in it. A backdrop blur plus a hairline border is enough to hold text legibly
 * while the colour behind still reads through, so the card sits *in* the page
 * instead of on top of it.
 */
function CardDeck({
  disc,
  index,
  accentHue,
  onNext,
  onPrev,
  onSelect,
}: {
  disc: Disc;
  index: number;
  accentHue: number;
  onNext: () => void;
  onPrev: () => void;
  onSelect: (i: number) => void;
}) {
  const card = disc.cards[index];
  const count = disc.cards.length;
  const accent = (s: number, l: number, a = 1) =>
    `hsl(${accentHue.toFixed(1)} ${s}% ${l}% / ${a})`;

  // Left/Right arrows flip the stack while focus is anywhere inside it, which
  // is what a deck of cards implies. Scoped to this element rather than the
  // document so it cannot fight the deck's own controls or a text selection
  // elsewhere on the page.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (count < 2) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onPrev();
    }
  };

  return (
    <div
      className="m-auto w-full max-w-2xl"
      onKeyDown={onKeyDown}
      role="group"
      aria-roledescription="card deck"
      aria-label={`${disc.title}: ${count} card${count === 1 ? "" : "s"}`}
    >
      {/* Section header. The catalogue number ties this stack to the disc on
          the spindle and the spine down the edge. */}
      <div className="mb-4 flex items-baseline justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.24em]">
        <span style={{ color: accent(75, 66, 0.95) }}>{disc.title}</span>
        <span className="text-zinc-400">{disc.catalog}</span>
      </div>

      {/* The stack. Two dead layers peek out below the live card, so a
          multi-card section looks like more than one thing before you touch it
         , the affordance for flipping, without a label asking you to. They
          are offset downward rather than up: the card's own height varies with
          its content, and an upward offset would collide with the section
          header above. A single-card section gets no fakes.
          `-bottom-N` with `top-0` rather than a translate, because the live
          card is in flow and the fakes must track its height. */}
      <div className="relative">
        {count > 1 && (
          <>
            <div
              aria-hidden="true"
              className="absolute inset-x-3 -bottom-2.5 top-0 rounded-2xl border border-white/[0.07] bg-white/[0.02]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-1.5 -bottom-1.5 top-0 rounded-2xl border border-white/[0.09] bg-white/[0.03]"
            />
          </>
        )}

        {/* The live card. Keyed on the card id so React remounts it on a flip
            and the entrance animation actually re-runs, without the key it is
            the same element with new children, and nothing animates. */}
        <article
          key={card.id}
          className="portfolio-card relative animate-[cardIn_320ms_cubic-bezier(0.22,1,0.36,1)] overflow-hidden rounded-2xl border px-6 py-6 backdrop-blur-md sm:px-8 sm:py-7"
          style={{
            // Barely-there fill: enough to separate the text from a busy patch
            // of background without becoming a panel in its own right.
            background:
              "linear-gradient(180deg, rgb(255 255 255 / 0.055), rgb(255 255 255 / 0.025))",
            borderColor: accent(60, 60, 0.22),
            boxShadow: `0 18px 50px -20px rgb(0 0 0 / 0.8), inset 0 1px 0 rgb(255 255 255 / 0.07)`,
          }}
        >
          {/* A single accent hairline along the top edge, the disc's colour
              touching the card, and the only chrome it gets. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${accent(85, 65, 0.7)}, transparent)`,
            }}
          />

          <header>
            <div className="flex items-baseline justify-between gap-4">
              {card.eyebrow ? (
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-400">
                  {card.eyebrow}
                </p>
              ) : (
                <span />
              )}
              {/* Position in the stack, so flipping has a sense of where you
                  are. Tabular so the digits do not jitter between cards. */}
              {count > 1 && (
                <p className="shrink-0 font-mono text-[10.5px] tabular-nums tracking-[0.16em] text-zinc-400">
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(count).padStart(2, "0")}
                </p>
              )}
            </div>

            <h3 className="mt-2 text-[1.55rem] font-semibold leading-[1.15] tracking-tight text-white sm:text-[1.8rem]">
              {card.heading}
            </h3>

            {card.standfirst && (
              <p className="mt-2.5 font-serif text-[16px] italic leading-snug text-zinc-300/90">
                {card.standfirst}
              </p>
            )}
          </header>

          {/* Body. A comfortable measure and real leading, this is the one
              place on the page meant for actual reading. */}
          <div className="mt-5 space-y-3.5 text-[15.5px] leading-[1.68] text-zinc-300 [&_em]:italic [&_li]:mb-1.5 [&_strong]:font-semibold [&_strong]:text-white [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:text-zinc-300/95">
            {card.body}
          </div>

          {card.links && card.links.length > 0 && (
            <dl className="mt-6 space-y-1 border-t border-white/10 pt-4">
              {card.links.map((l) => (
                <div key={l.role + l.value} className="flex gap-3">
                  <dt className="w-[6.5rem] shrink-0 pt-[5px] font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">
                    {l.role}
                  </dt>
                  <dd className="min-w-0 flex-1">
                    {l.href ? (
                      <a
                        href={l.href}
                        // mailto: hands off to a mail client rather than
                        // navigating, so a new tab would either be left blank
                        // or flash and close. Only real navigations open away.
                        target={l.href.startsWith("mailto:") ? undefined : "_blank"}
                        rel={
                          l.href.startsWith("mailto:")
                            ? undefined
                            : "noreferrer noopener"
                        }
                        className="-mx-2 flex items-baseline gap-1.5 rounded px-2 py-1 text-[13.5px] font-medium break-words underline decoration-1 underline-offset-[3px] transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2"
                        style={{
                          color: accent(85, 74),
                          textDecorationColor: accent(80, 60, 0.6),
                          outlineColor: accent(85, 65),
                        }}
                      >
                        <span className="min-w-0 break-words">{l.value}</span>
                        {/* Three destinations, three marks: a document we serve
                            ourselves, an address that opens a mail client, and
                            somewhere else on the web. They do different things
                            and should not look identical. */}
                        <span aria-hidden="true" className="shrink-0 text-[10px]">
                          {l.href.startsWith("/")
                            ? "⤓"
                            : l.href.startsWith("mailto:")
                              ? "✉"
                              : "↗"}
                        </span>
                      </a>
                    ) : (
                      <span className="block py-1 font-mono text-[12.5px] text-zinc-400">
                        {l.value}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {card.figures && card.figures.length > 0 && (
            <div className="mt-6 space-y-5">
              {card.figures.map((fig) => (
                <figure key={fig.src}>
                  <div
                    className={`overflow-hidden rounded-lg border border-white/10 bg-black/25 ${
                      // An inset mark is centred at its own size instead of
                      // filling the measure, so a 200px logo is never upscaled.
                      fig.inset ? "mx-auto w-fit p-3" : ""
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fig.src}
                      width={fig.width}
                      height={fig.height}
                      alt={fig.alt}
                      loading="lazy"
                      decoding="async"
                      className={
                        fig.inset
                          ? "block h-auto max-w-full rounded"
                          : "block h-auto w-full"
                      }
                      style={
                        fig.inset
                          ? {
                              width: `${fig.maxWidth ?? fig.width}px`,
                              maxWidth: "100%",
                            }
                          : undefined
                      }
                    />
                  </div>
                  {fig.caption && (
                    <figcaption
                      className={`mt-2 font-mono text-[10.5px] leading-relaxed text-zinc-400 ${
                        fig.inset ? "text-center" : ""
                      }`}
                    >
                      {fig.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </article>
      </div>

      {/* Flip controls. These duplicate the deck's Next/Prev on purpose: the
          fascia buttons are across the page and easy to miss, and a stack of
          cards should be turnable where your eyes already are. */}
      {count > 1 && (
        <div className="mt-5 flex items-center justify-between gap-4">
          <FlipButton
            direction="prev"
            accentHue={accentHue}
            onClick={onPrev}
            label="Previous card"
          />

          {/* Dots. Each is a real button, so a specific card is one click away
              rather than several flips. */}
          <div className="flex items-center gap-2">
            {disc.cards.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`Card ${i + 1}: ${c.heading}`}
                aria-current={i === index ? "true" : undefined}
                // 44px hit area on touch, 24px on desktop. The visible dot
                // inside stays the same size either way; only the tappable box
                // around it grows, so the row does not look chunky on a phone.
                className="group grid h-11 w-11 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-2 sm:h-6 sm:w-6"
                style={{ ["--tw-ring-color" as string]: accent(85, 65, 0.7) }}
              >
                <span
                  className="block rounded-full transition-all duration-200"
                  style={
                    i === index
                      ? {
                          width: "18px",
                          height: "5px",
                          background: accent(85, 66),
                        }
                      : {
                          width: "5px",
                          height: "5px",
                          background: "rgb(255 255 255 / 0.28)",
                        }
                  }
                />
              </button>
            ))}
          </div>

          <FlipButton
            direction="next"
            accentHue={accentHue}
            onClick={onNext}
            label="Next card"
          />
        </div>
      )}
    </div>
  );
}

/** One of the deck's own flip controls. Text, not an icon-only button. */
function FlipButton({
  direction,
  accentHue,
  onClick,
  label,
}: {
  direction: "prev" | "next";
  accentHue: number;
  onClick: () => void;
  label: string;
}) {
  const accent = (s: number, l: number, a = 1) =>
    `hsl(${accentHue.toFixed(1)} ${s}% ${l}% / ${a})`;
  const glyph = direction === "prev" ? "←" : "→";
  const text = direction === "prev" ? "Prev" : "Next";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      // min-h-11 (44px) on phones: this is the primary way to page through a
      // section on touch, and at the desktop's 30px it was under the minimum
      // target size. Desktop keeps the smaller pill.
      className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-zinc-400 outline-none transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 active:bg-white/[0.06] sm:min-h-0 sm:px-3.5"
      style={{
        // 0.14 vanished against the moving backdrop, which made Prev read as
        // plain text rather than a button. Also a faint fill, so the pill has
        // a body of its own over a busy patch of background.
        borderColor: "rgb(255 255 255 / 0.22)",
        background: "rgb(255 255 255 / 0.04)",
        ["--tw-ring-color" as string]: accent(85, 65, 0.7),
      }}
    >
      {direction === "prev" && <span aria-hidden="true">{glyph}</span>}
      <span>{text}</span>
      {direction === "next" && <span aria-hidden="true">{glyph}</span>}
    </button>
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
 * Purely presentational: it reports state and offers no controls, because the
 * transport already lives on the modelled fascia and a second set of buttons
 * would split the metaphor. The progress line is not seekable for the same
 * reason: a real deck of this vintage has no scrub.
 */
function TransportBar({
  title,
  discTitle,
  elapsed,
  duration,
  playing,
  accentHue,
}: {
  title: string | null;
  discTitle: string | null;
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
        {/* Song name. Raised well above the old 20%-opacity labels: this sits
            over a moving field and has to stay readable. One song per disc, so
            there is no track number to print, the disc's own title carries
            the position instead. */}
        <div className="min-w-0 flex-1 truncate">
          {title ? (
            <>
              <span className="text-zinc-200">{title}</span>
              {discTitle && (
                <span className="ml-2 text-zinc-400">/ {discTitle}</span>
              )}
            </>
          ) : (
            <span className="uppercase tracking-[0.18em] text-zinc-400">
              No disc loaded
            </span>
          )}
        </div>
        <div className="shrink-0 tabular-nums text-zinc-400">
          {title ? `${formatTime(elapsed)} / ${formatTime(duration)}` : "--:--"}
        </div>
      </div>

      {/* Progress line. A 1px rule that fills, the thinnest thing that still
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
  highlighted,
  floatDelay,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onDragStart,
  onDragEnd,
}: {
  disc: Disc;
  loaded: boolean;
  /** The deck is playing this disc, the platter turns to match. */
  spinning: boolean;
  dragging: boolean;
  /**
   * This disc's section is hovered elsewhere on the page (the empty-state
   * picker). Lifts and rings it, so the two are visibly one thing.
   */
  highlighted: boolean;
  /** Seconds of negative delay, so each disc sits at a different phase. */
  floatDelay: number;
  onClick: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
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
      // explicitly, otherwise that code is all a screen reader announces.
      aria-label={`${disc.title} disc: drag into the deck or click to load`}
      title={`${disc.title}: drag into the deck or click to load`}
      className={`group relative h-[88px] w-[88px] shrink-0 rounded-full transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
        dragging
          ? "scale-90 opacity-40"
          : highlighted
            ? "-translate-y-1.5 scale-110"
            : "hover:-translate-y-1 hover:scale-105"
      }`}
      style={{
        cursor: dragging ? "grabbing" : "grab",
        // Ringed in the disc's own hue rather than a fixed cyan, so the rack
        // agrees with the picker card and the page accent. `loaded` wins over
        // `highlighted`: what is in the deck matters more than what a pointer
        // is passing over.
        boxShadow: loaded
          ? `0 0 0 2px hsl(${disc.accent} 85% 62% / 0.8)`
          : highlighted
            ? `0 0 0 2px hsl(${disc.accent} 85% 65% / 0.55), 0 0 22px 2px hsl(${disc.accent} 90% 60% / 0.35)`
            : undefined,
      }}
    >
      {/* Everything visual floats inside this wrapper rather than on the button
          itself. Animating the button would leave the hit target in perpetual
          motion, which is not just a mouse annoyance: an element that never
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
            the one playing, the conic gradient makes the rotation legible.
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
 * `glyph` is drawn over the cap so the control is identifiable at a glance,
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

/**
 * The phone transport: the deck's playback actions as real buttons.
 *
 * The modelled fascia caps are pinned over the 3D deck as percentages, which
 * works at desktop size and fails on a phone, where the deck is 320px tall and
 * each cap lands around 20x40px on a canvas a thumb cannot aim at. These are
 * 48px, in document flow, and hidden from sm up so the desktop keeps its
 * physical controls.
 *
 * Playback only. Flipping cards is deliberately NOT duplicated here: the card
 * deck renders its own Prev/Next and dots directly beneath the card, which is
 * where the thumb already is, and two controls sharing one label on a single
 * screen is worse than either alone.
 *
 * Play is larger and filled because with a disc loaded and stopped it is the
 * one thing to press, and a phone has no hover state to hint at that.
 */
function TouchTransport({
  playing,
  hasDisc,
  accentHue,
  onPlayPause,
  onStop,
  onEject,
}: {
  playing: boolean;
  hasDisc: boolean;
  accentHue: number;
  onPlayPause: () => void;
  onStop: () => void;
  onEject: () => void;
}) {
  const accent = (s: number, l: number, a = 1) =>
    `hsl(${accentHue.toFixed(1)} ${s}% ${l}% / ${a})`;

  // Nothing loaded means nothing to transport, and a row of dead buttons above
  // the picker would just be noise.
  if (!hasDisc) return null;

  const ghost =
    "flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-300 transition-colors active:bg-white/[0.06]";

  return (
    <div
      className="flex w-full max-w-[640px] items-stretch gap-2 sm:hidden"
      role="group"
      aria-label="Player controls"
    >
      {/* Play/Pause: the primary action, so it takes the most width. */}
      <button
        type="button"
        onClick={onPlayPause}
        aria-label={playing ? "Pause" : "Play"}
        className="flex h-12 flex-[2] cursor-pointer items-center justify-center gap-2 rounded-xl text-[12px] font-bold uppercase tracking-[0.12em] text-zinc-950 transition-transform active:scale-[0.97]"
        style={{ background: accent(85, 66) }}
      >
        <span aria-hidden="true" className="text-[13px]">
          {playing ? "❚❚" : "▶"}
        </span>
        <span>{playing ? "Pause" : "Play"}</span>
      </button>

      <button
        type="button"
        onClick={onStop}
        aria-label="Stop"
        className={ghost}
        style={{ borderColor: "rgb(255 255 255 / 0.14)" }}
      >
        <span aria-hidden="true">{"■"}</span>
        <span>Stop</span>
      </button>

      <button
        type="button"
        onClick={onEject}
        aria-label="Eject disc"
        className={ghost}
        style={{ borderColor: "rgb(255 255 255 / 0.14)" }}
      >
        <span aria-hidden="true">{"⏏"}</span>
        <span>Eject</span>
      </button>
    </div>
  );
}
