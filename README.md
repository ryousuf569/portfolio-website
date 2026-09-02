# Yousuf's CDs

My portfolio, built as a CD player. Each section of the site is a disc: load one
into the deck and it starts playing a song I made, then you flip through that
section's content as cards.

Live at **[yousufrashid.com](https://yousufrashid.com)**.

| Disc | Section | Song |
| --- | --- | --- |
| `YR-001` | About Me | High Tide |
| `YR-002` | Experience | BUZZ ME IN |
| `YR-003` | Projects | lakeshore west (ladybird) |
| `YR-004` | Links | solace (forbearance) |

## How it works

The page is one client component over two WebGL scenes and an `<audio>` element.

- **`app/page.tsx`** — the disc data (sections, cards, songs), the transport
  state machine, and the React tree. All content lives in the `DISCS` array at
  the top of the file; adding a card is editing that array, not the layout.
- **`app/boombox.ts`** — the deck itself, modelled in Three.js. Returns a rig of
  named parts (lid, spindle, woofer cones, button caps) that the page animates.
- **`app/background.ts`** — the reactive backdrop. Owns the `AudioContext` and
  the analyser, so it is the single source of frequency-band data; the deck
  reads levels from it to drive woofer excursion.
- **`app/cdcase.ts`** — a 3D jewel-case renderer from an earlier design. Not
  currently used by the page.

A few decisions worth knowing before editing:

- **The audio element is `preload="none"`.** Nothing is fetched until a disc is
  actually loaded, which keeps the initial page weight to the images and the
  bundle rather than the audio library.
- **Only one graph can exist per audio element.** `createMediaElementSource`
  throws on a second call, so the analyser is attached once, inside a click
  (an `AudioContext` built outside a user gesture starts suspended and yields
  silence rather than an error).
- **Both canvases are created imperatively, not in JSX.** Teardown calls
  `forceContextLoss()`, which permanently kills the context bound to that
  element; React reuses the same DOM node across Strict Mode's remount, so a
  JSX-owned canvas would hand the second mount a dead context.
- **`prefers-reduced-motion` is honoured in all three animation systems**, not
  just in CSS. Check it in any new motion you add.

## Assets

Audio lives in `public/` as Ogg Opus. The tracks currently shipped are 1–2.4 MB
each, which is larger than they need to be; re-encoding at Opus 64k VBR would
bring them to roughly 200–400 KB with no audible difference at this use.

```bash
ffmpeg -i input.wav -c:a libopus -b:a 64k -vbr on output.ogg
```

Figures are plain `<img>` with explicit intrinsic `width`/`height`. Those
numbers must match the file, or the layout reserves a box of the wrong shape and
the image is distorted until it loads.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
```

```bash
npm run build   # production build
npm run lint    # eslint
npx tsc --noEmit
```

Deployed on Vercel. Framework preset must be **Next.js** with no Output
Directory override — Next writes to `.next`, and a stale `dist` override is what
makes the build fail with "No Output Directory named dist found".
