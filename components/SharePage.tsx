
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SharePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [copied, setCopied] = useState(false);
  const shareLink = "https://vround.app/v/ebc360-alpha";

  // Get preview data from state
  const previewImage = location.state?.previewImage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAjtaQT-9OeprX1XgxjIm0XiZJqiYxz4z0CZwrFymoiNVcmVjd_s6uQ82t1Y2RY7X0cqEW5-jYGrth2pfXPEkzklw46RkZ9HlyLeWBa5oNYM39FhNH7l7hF-LirVnMlApPzgbJa1RnOeQ_QMW2LGXpnYs-VLUoVZ61zxh09KF-aMFM0b38X5yI0ra1JMtAiEPIkvQjcMHtRooufuFA-ygV09nV-GslkijABJAjW6-NKmvXS9cAK4ZInT_n-Fzr9AjUVBUL6mB5JWsg';
  const locationName = location.state?.locationName || 'Mount Everest Base Camp';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-background-dark min-h-screen flex flex-col text-white font-display">
      {/* Top Navigation */}
      <div className="flex items-center justify-between p-6 sticky top-0 bg-background-dark/90 backdrop-blur-2xl z-50 border-b border-white/5">
        <div className="w-10"></div> 
        <h2 className="text-xl font-bold tracking-tight">Share Experience</h2>
        <div className="flex w-10 items-center justify-end">
          <button 
            onClick={() => navigate('/viewer')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/10 transition"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 pb-12 max-w-md mx-auto w-full">
        {/* Preview Card */}
        <div className="mt-8 mb-10">
          <div className="flex items-stretch justify-between gap-6 rounded-3xl bg-card-dark p-6 shadow-2xl border border-white/10">
            <div className="flex flex-col justify-center gap-2 flex-1">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-[10px] font-bold text-primary uppercase tracking-wider">
                  Live
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">360° Capture</span>
              </div>
              <p className="text-2xl font-bold leading-tight text-white tracking-tight">{locationName}</p>
              <p className="text-xs text-slate-500 font-medium">Capture updated now</p>
            </div>
            <div 
              className="w-28 bg-center bg-no-repeat bg-cover rounded-2xl aspect-square shadow-inner relative overflow-hidden shrink-0 border border-white/10" 
              style={{ backgroundImage: `url("${previewImage}")` }}
            >
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-white/95 text-[32px] drop-shadow-lg">360</span>
              </div>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold leading-tight mb-4 tracking-tight">Share this Moment</h1>
          <p className="text-slate-400 text-lg font-medium leading-relaxed">
            Recipients can view this fully immersive 360° journey in any browser. <br/>
            <span className="text-primary">No specialized gear needed.</span>
          </p>
        </div>

        {/* Copy Link Action */}
        <div className="mb-10 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Shareable Link</label>
          <div className="flex w-full items-stretch rounded-2xl h-16 bg-input-dark shadow-2xl border border-white/10 ring-offset-background-dark focus-within:ring-2 ring-primary transition-all p-1.5">
            <div className="flex items-center pl-4 pr-3 text-slate-500">
              <span className="material-symbols-outlined text-[24px]">link</span>
            </div>
            <input 
              className="flex w-full min-w-0 flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-slate-600 px-2 text-base font-mono" 
              readOnly 
              value={shareLink}
            />
            <button 
              onClick={handleCopy}
              className={`flex cursor-pointer items-center justify-center rounded-xl px-8 transition-all ${copied ? 'bg-green-600' : 'bg-primary'} hover:scale-[1.02] active:scale-95 text-white text-sm font-bold tracking-widest shadow-lg shadow-primary/20`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Secondary Actions */}
        <div className="flex flex-col gap-4 mb-12">
          <button className="flex w-full items-center justify-between p-6 rounded-3xl bg-card-dark border border-white/10 hover:bg-white/5 transition-all group active:scale-[0.98]">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <span className="material-symbols-outlined text-3xl">qr_code_2</span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-lg font-bold text-white tracking-tight">Generate QR Code</span>
                <span className="text-xs text-slate-500 font-medium">For physical display or P2P sharing</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all">chevron_right</span>
          </button>

          <button className="flex w-full items-center justify-between p-6 rounded-3xl bg-card-dark border border-white/10 hover:bg-white/5 transition-all group active:scale-[0.98]">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-3xl">terminal</span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-lg font-bold text-white tracking-tight">Embed Context</span>
                <span className="text-xs text-slate-500 font-medium">Integrate into your blog or site</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all">chevron_right</span>
          </button>
        </div>

        {/* Quick Share */}
        <div className="mt-auto">
          <div className="flex items-center gap-6 mb-8">
            <div className="h-px bg-white/5 flex-1"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Fast Forward</span>
            <div className="h-px bg-white/5 flex-1"></div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: 'forum', label: 'SMS' },
              { icon: 'alternate_email', label: 'Mail' },
              { icon: 'content_paste', label: 'Copy' },
              { icon: 'ios_share', label: 'More' }
            ].map((btn, idx) => (
              <button key={idx} className="flex flex-col items-center gap-3 group">
                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 group-active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-white">{btn.icon}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharePage;
