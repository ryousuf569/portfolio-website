import { Server, Brain, Code, BookOpen, Sparkles } from 'lucide-react';

interface Album {
  title: string;
  link: string;
  icon: React.ReactNode;
  gradient: string;
}

const albums: Album[] = [
  {
    title: 'Systems & Performance',
    link: '/projects/systems',
    icon: <Server size={40} />,
    gradient: 'from-purple-600 to-purple-800',
  },
  {
    title: 'Data & Machine Learning',
    link: '/projects/ml',
    icon: <Brain size={40} />,
    gradient: 'from-blue-600 to-blue-800',
  },
  {
    title: 'Backend Engineering',
    link: '/projects/backend',
    icon: <Code size={40} />,
    gradient: 'from-green-600 to-green-800',
  },
  {
    title: 'Math & Theory',
    link: '/projects/math',
    icon: <BookOpen size={40} />,
    gradient: 'from-orange-600 to-orange-800',
  },
  {
    title: 'Experiments & Side Quests',
    link: '/projects/experiments',
    icon: <Sparkles size={40} />,
    gradient: 'from-pink-600 to-pink-800',
  },
];

export function Albums() {
  return (
    <section className="mb-16">
      <h2 className="text-2xl mb-6 tracking-tight">Project Categories</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {albums.map((album) => (
          <a
            key={album.title}
            href={album.link}
            className="group block bg-[#181818] rounded-lg p-4 hover:bg-[#282828] transition-all duration-300 cursor-pointer"
          >
            {/* Album cover */}
            <div className={`aspect-square rounded-md bg-gradient-to-br ${album.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-all`}>
              <div className="text-white/90 group-hover:scale-110 transition-transform">
                {album.icon}
              </div>
            </div>
            
            {/* Album info */}
            <h3 className="mb-1 group-hover:text-[#1ed760] transition-colors line-clamp-2">
              {album.title}
            </h3>
            <p className="text-sm text-gray-400">Category</p>
          </a>
        ))}
      </div>
    </section>
  );
}
