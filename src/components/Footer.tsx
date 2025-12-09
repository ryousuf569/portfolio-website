import { Github, Linkedin, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-[#0a0a0a] mt-24">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-gray-400">
            Built with TypeScript, designed on Figma.
          </p>
          
          <div className="flex gap-4">
            <a
              href="https://github.com/ryousuf569"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-[#1ed760] transition-colors"
              aria-label="GitHub"
            >
              <Github size={20} />
            </a>
            <a
              href="https://www.linkedin.com/in/yousuf-rashid-2730122a5/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-[#1ed760] transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin size={20} />
            </a>
            <a
              href="mailto:yousufrashidcoding@gmail.com"
              className="p-2 text-gray-400 hover:text-[#1ed760] transition-colors"
              aria-label="Email"
            >
              <Mail size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
