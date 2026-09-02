import { ImageResponse } from "next/og";

/*
 * The link preview card, generated at build time.
 *
 * This is what a recruiter sees when the URL is pasted into LinkedIn, Slack,
 * iMessage or Discord. Without it those surfaces render a bare title on a grey
 * rectangle, which reads as an unfinished link.
 *
 * Drawn rather than photographed: an OG image is shown at ~600px wide in a
 * feed, so a screenshot of the site would reduce to unreadable mush. Large
 * type, four discs, and the accent hues the real page uses.
 */

export const alt =
  "Yousuf Rashid, Applied Mathematics at the University of Waterloo. A portfolio you play like a CD deck.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The four section hues, matching the discs in DISCS. */
const DISCS = [
  { label: "ABOUT", hue: 195 },
  { label: "EXP", hue: 330 },
  { label: "PROJ", hue: 160 },
  { label: "LINKS", hue: 38 },
];

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0e0f13",
          padding: "72px 80px",
          // No webfont fetch: ImageResponse would have to download and embed
          // one, and the system stack renders identically at this size.
          fontFamily: "sans-serif",
        }}
      >
        {/* A soft wash, the same idea as the page's backdrop blob. */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -140,
            width: 720,
            height: 720,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(56,189,248,0.20) 0%, rgba(56,189,248,0) 70%)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 24,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "hsl(195 80% 68%)",
            }}
          >
            Yousuf&apos;s CDs
          </div>
          <div
            style={{
              marginTop: 26,
              fontSize: 76,
              fontWeight: 700,
              letterSpacing: -2,
              color: "#ffffff",
              lineHeight: 1.05,
            }}
          >
            Yousuf Rashid
          </div>
          <div
            style={{
              marginTop: 22,
              fontSize: 34,
              color: "#a1a1aa",
              lineHeight: 1.35,
              maxWidth: 880,
            }}
          >
            Applied Mathematics at Waterloo, specializing in scientific machine
            learning.
          </div>
        </div>

        {/* The four discs, so the card carries the site's own idea. */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {DISCS.map((d) => (
            <div
              key={d.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 104,
                height: 104,
                borderRadius: 9999,
                background: `linear-gradient(135deg, hsl(${d.hue} 70% 56%), hsl(${d.hue + 40} 70% 44%))`,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9999,
                  background: "#0e0f13",
                }}
              />
            </div>
          ))}
          <div
            style={{
              marginLeft: 12,
              fontSize: 26,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#71717a",
            }}
          >
            Press play
          </div>
        </div>
      </div>
    ),
    size,
  );
}
