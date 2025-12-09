import { Header } from './components/Header';
import { TopTracks } from './components/TopTracks';
// import { Albums } from './components/Albums';
import { Experience } from './components/Experience';
import { About } from './components/About';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 pb-24">
        <TopTracks />
        {/* <Albums /> */}
        <Experience />
        <About />
      </main>
      
      <Footer />
    </div>
  );
}
