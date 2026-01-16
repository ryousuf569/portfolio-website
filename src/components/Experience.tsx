import { ExternalLink, GraduationCap, Code2, Layers } from 'lucide-react';

export function Experience() {
  return (
    <section className="mb-16">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl tracking-tight">Latest EP — Experience & Resume</h2>
      </div>
      
      <div className="bg-[#181818] rounded-lg p-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left column */}
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="p-3 bg-[#1ed760]/10 rounded-lg flex-shrink-0">
                <GraduationCap size={24} className="text-[#1ed760]" />
              </div>
              <div>
                <h3 className="mb-1">University of Waterloo</h3>
                <p className="text-sm text-gray-400">Computational Mathematics</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="p-3 bg-[#1ed760]/10 rounded-lg flex-shrink-0">
                <Code2 size={24} className="text-[#1ed760]" />
              </div>
              <div>
                <h3 className="mb-1">ML & Backend Projects</h3>
                <p className="text-sm text-gray-400">Working on performance-oriented system design</p>
              </div>
            </div>
          </div>
          
          {/* Right column */}
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="p-3 bg-[#1ed760]/10 rounded-lg flex-shrink-0">
                <Layers size={24} className="text-[#1ed760]" />
              </div>
              <div>
                <h3 className="mb-2">Tech Stack</h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <p><span className="text-white">Languages:</span> Python, C++, SQL</p>
                  <p><span className="text-white">Frameworks:</span> FastAPI, Flask, PostgreSQL, scikit-learn, PyTorch</p>
                </div>
              </div>
            </div>
            
            <a
              href="https://drive.google.com/file/d/1xMaXgtvffo5lzO_NeRlqVCn1BnIF3-ga/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1ed760] text-black rounded-full hover:bg-[#1fdf64] transition-all hover:scale-105"
            >
              <ExternalLink size={18} />
              Download Full Resume
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
