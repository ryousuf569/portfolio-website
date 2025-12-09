import { ExternalLink, Github, Linkedin } from 'lucide-react';
import profilePhoto from "./assets/Yousuf Headshot NEW HQ.png"

export function Header() {
  return (
    <header className="relative bg-gradient-to-b from-[#1a1a1a] to-[#0F0F0F] pb-8">
      {/* Banner background with subtle gradient */}
      <div className="h-80 bg-gradient-to-b from-[#2a2a2a] to-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(29,185,84,0.1),transparent_50%)]" />
      </div>
      
      {/* Content overlay */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="relative -mt-32">
          <div className="flex items-end gap-6">
            {/* Profile circle - Spotify artist style */}
              <div className="w-52 h-52 rounded-full bg-gradient-to-br from-[#1ed760] to-[#169c46] p-1 shadow-2xl flex-shrink-0">
                 <img
                  src={profilePhoto}
                  alt="Yousuf Rashid"
                  className="w-full h-full rounded-full object-cover"
                  />
              </div>
            
            {/* Info section */}
            <div className="pb-6 flex-1">
              <div className="mb-4">
                <span className="inline-block px-3 py-1 rounded-full bg-[#1ed760] text-black text-sm tracking-wide mb-4">
                  Open to Co-op – Summer 2026
                </span>
              </div>
              <h1 className="text-8xl mb-6 tracking-tight">Yousuf Rashid</h1>
              <p className="text-xl text-gray-300 mb-6">
                Interests: Backend Development · Machine Learning · Data Analysis · Computational Mathematics 
              </p>
              
              {/* Action buttons */}
              <div className="flex gap-3">
                <a 
                  href="https://drive.google.com/file/d/1Gs2oQ-qno2v2D3E3y45PVmTvwD3GSrDN/view?usp=drive_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-[#1ed760] text-black rounded-full hover:bg-[#1fdf64] transition-all hover:scale-105 flex items-center gap-2"
                >
                  <ExternalLink size={18} />
                  View Resume
                </a>
                <a 
                  href="https://github.com/ryousuf569"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 border border-gray-600 rounded-full hover:border-[#1ed760] hover:bg-[#1ed760]/10 transition-all flex items-center gap-2"
                >
                  <Github size={18} />
                  GitHub
                </a>
                <a 
                  href="https://www.linkedin.com/in/yousuf-rashid-2730122a5/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 border border-gray-600 rounded-full hover:border-[#1ed760] hover:bg-[#1ed760]/10 transition-all flex items-center gap-2"
                >
                  <Linkedin size={18} />
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
