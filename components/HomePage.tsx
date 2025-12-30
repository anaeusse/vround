
import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        navigate('/viewer', { state: { customImage: result, locationName: file.name.replace(/\.[^/.]+$/, "") } });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div 
          className="h-full w-full bg-cover bg-center bg-no-repeat transition-transform duration-[20s] ease-linear scale-110 pano-bg" 
          style={{ backgroundImage: "url('https://drive.google.com/file/d/1zT882-NZscAL8ntPfk_2q8COOcooVZ3z/view')" }}
        >
        </div>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background-dark/95"></div>
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex h-full flex-col justify-between px-6 pt-12 pb-12">
        {/* Top Header */}
        <header className="flex flex-col items-center">
          <h1 className="text-white tracking-[0.3em] text-4xl font-bold uppercase drop-shadow-2xl">VRound</h1>
        </header>

        {/* Center Visual */}
        <div className="flex flex-1 items-center justify-center">
          <div className="relative group cursor-pointer" onClick={() => navigate('/viewer')}>
            {/* Pulsing rings */}
            <div className="absolute -inset-8 rounded-full bg-primary/20 blur-2xl animate-pulse"></div>
            <div className="absolute -inset-4 rounded-full bg-primary/30 blur-lg"></div>
            
            <button className="relative flex items-center justify-center rounded-full w-32 h-32 bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-2xl transition-all hover:scale-105 active:scale-95">
              <span 
                className="material-symbols-outlined text-[64px] animate-[spin_12s_linear_infinite]" 
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}
              >
                360
              </span>
            </button>
            
            {/* Floating hint */}
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-80 flex flex-col items-center gap-1">
              <span className="material-symbols-outlined text-white/90 animate-bounce">touch_app</span>
              <span className="text-white/60 text-[10px] uppercase tracking-widest">Click to peek</span>
            </div>
          </div>
        </div>

        {/* Bottom Content */}
        <div className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto">
          <div className="text-center space-y-3">
            <h2 className="text-white text-[38px] font-bold leading-tight tracking-tight drop-shadow-xl">
              Experience reality,<br/><span className="text-primary">hands-free.</span>
            </h2>
            <div className="flex items-center justify-center gap-3 text-slate-400">
              <span className="material-symbols-outlined text-lg">view_in_ar</span>
              <p className="text-sm font-medium leading-normal tracking-wide">
                Immersive 360° • AI Assistant • Shareable
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-4">
            <Link to="/viewer" className="block w-full">
              <button className="relative w-full overflow-hidden rounded-2xl h-16 bg-primary text-white text-xl font-bold tracking-widest shadow-2xl shadow-primary/40 transition-all hover:translate-y-[-2px] hover:shadow-primary/60 active:translate-y-[1px] group">
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <span className="relative flex items-center justify-center gap-3">
                  Start Exploring
                  <span className="material-symbols-outlined text-2xl">explore</span>
                </span>
              </button>
            </Link>

            <button 
              onClick={handleUploadClick}
              className="relative w-full rounded-2xl h-14 bg-white/5 backdrop-blur-xl border border-white/10 text-white text-sm font-bold tracking-widest transition-all hover:bg-white/10 active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined">cloud_upload</span>
              Upload 360° Photo
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <p className="text-white/30 text-xs font-light text-center">
            Upload equirectangular photos (2:1 ratio) <br/>
            for the best immersive experience.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
