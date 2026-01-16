import { useState } from "react";
import { Github, ExternalLink, Play, Music } from "lucide-react";

/* =========================
   Types
   ========================= */

interface TrackLink {
  type: "github" | "demo" | "spotify";
  url: string;
}

interface Track {
  number: number;
  title: string;
  subtitle: string;
  links: TrackLink[];
}

/* =========================
   Data
   ========================= */

const tracks: Track[] = [
  {
    number: 1,
    title: "NBA Fantasy ML Platform",
    subtitle:
      "Data-driven player optimization. Python, FastAPI, XGBoost, KNN, Pandas, NBA API",
    links: [
      {
        type: "github",
        url: "https://github.com/ryousuf569/fantasy-add-drop-recommender",
      },
      {
        type: "demo",
        url: "https://fantasy-add-drop-recommender.vercel.app/",
      },
    ],
  },
  {
    number: 2,
    title: "MIDI.me",
    subtitle: "Analyzes Audio Structure to quantify listener engagement. Python, pandas, SQL, numpy, Markov Models",
    links: [
      {
        type: "github",
        url: "https://github.com/ryousuf569/midi-me",
      },
    ],
  },
  {
    number: 3,
    title: "Audio Quality Assurance Engine",
    subtitle: "A small Audio parsing tool that feeds directly into MIDI.me. Python, C++, MATLAB",
    links: [
      {
        type: "github",
        url: "https://github.com/ryousuf569/audio-qa-automation",
      },
    ],
  },
  {
    number: 4,
    title: "Spotify-Inspired Portfolio Website",
    subtitle: "Code for this Figma-first design, React + TypeScript",
    links: [
      {
        type: "github",
        url: "https://github.com/ryousuf569/portfolio-website",
      },
    ],
  },
];

/* =========================
   Icon Resolver
   ========================= */

function LinkIcon({ type }: { type: TrackLink["type"] }) {
  switch (type) {
    case "github":
      return <Github size={18} className="text-gray-300" />;
    case "demo":
      return <ExternalLink size={18} className="text-gray-300" />;
    case "spotify":
      return <Music size={18} className="text-[#1ed760]" />;
    default:
      return null;
  }
}

/* =========================
   Component
   ========================= */

export function TopTracks() {
  const [hoveredTrack, setHoveredTrack] = useState<number | null>(null);

  return (
    <section className="mt-12 mb-16">
      <h2 className="text-2xl mb-6 tracking-tight">Top Highlights</h2>

      <div className="space-y-1">
        {tracks.map((track) => (
          <div
            key={track.number}
            className="group flex items-center gap-4 px-4 py-3 rounded-md hover:bg-white/5 transition-all cursor-pointer"
            onMouseEnter={() => setHoveredTrack(track.number)}
            onMouseLeave={() => setHoveredTrack(null)}
          >
            {/* Track number / Play icon */}
            <div className="w-6 flex items-center justify-center text-gray-400">
              {hoveredTrack === track.number ? (
                <Play size={16} className="fill-white text-white" />
              ) : (
                <span className="text-sm">{track.number}</span>
              )}
            </div>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <div className="truncate group-hover:text-[#1ed760] transition-colors">
                {track.title}
              </div>
              <div className="text-sm text-gray-400 truncate">
                {track.subtitle}
              </div>
            </div>

            {/* Action icons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {track.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LinkIcon type={link.type} />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
