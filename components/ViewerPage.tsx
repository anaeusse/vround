
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as THREE from 'three';
import { getLocationFacts } from '../services/geminiService';
import { LocationInfo } from '../types';

const ViewerPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showControls, setShowControls] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInfo, setAiInfo] = useState<LocationInfo | null>(null);
  const [aiSources, setAiSources] = useState<any[]>([]);
  const [showAiModal, setShowAiModal] = useState(false);
  const [viewMode, setViewMode] = useState<'spherical' | 'tiny-planet'>('spherical');
  
  // Custom image from state
  const customImage = location.state?.customImage;
  const customName = location.state?.locationName || "Custom Location";
  
  // Default Background
  const defaultBg = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD29eqBATgjZA58oJo-ElJUrFGQqlqWlLK1PznrgRrk5btlOYZWwSURN2H1hJkq37KByin3JFOXDND1cTXVMtir1HyuS7q_ix6yiRIA6TXFqS7m28aHdqSRo_HBmXHcl1Wms5ehxSevkTu0iRpMNE3HSuwOvVCkIgzI_SLHEKR_4cyVH-fy5fIITltkbvMHjhWsJJHDmdmlOphuwgWdpUsiLZ-w-FU3mimvB8C0E7rrMQB61R-_J3UcXFGvru7zyubj6ertP5Bbjgu8';

  // Three.js Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  // Interaction State
  const isPointerDown = useRef(false);
  const pointerX = useRef(0);
  const pointerY = useRef(0);
  const lon = useRef(0);
  const lat = useRef(0);
  const onPointerDownLon = useRef(0);
  const onPointerDownLat = useRef(0);
  const pointerStartTime = useRef(0);
  const totalPointerDist = useRef(0);
  
  // Animation/Smoothing state
  const targetFov = useRef(75);
  const targetLat = useRef(0);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(customImage || defaultBg, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshBasicMaterial({ map: texture });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      meshRef.current = mesh;
    });

    const onWindowResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      requestAnimationFrame(animate);

      // Smooth transition for Tiny Planet
      const lerpFactor = 0.05;
      cameraRef.current.fov += (targetFov.current - cameraRef.current.fov) * lerpFactor;
      cameraRef.current.updateProjectionMatrix();

      if (viewMode === 'tiny-planet' && !isPointerDown.current) {
        lat.current += (targetLat.current - lat.current) * lerpFactor;
      }

      // Auto-rotation when idle
      if (!isPointerDown.current) {
        lon.current += (viewMode === 'tiny-planet' ? 0.1 : 0.05);
      }

      lat.current = Math.max(-85, Math.min(85, lat.current));
      const phi = THREE.MathUtils.degToRad(90 - lat.current);
      const theta = THREE.MathUtils.degToRad(lon.current);

      const target = new THREE.Vector3(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta)
      );

      cameraRef.current.lookAt(target);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    window.addEventListener('resize', onWindowResize);
    animate();

    return () => {
      window.removeEventListener('resize', onWindowResize);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [customImage, defaultBg]);

  // Update projection targets when mode changes
  useEffect(() => {
    if (viewMode === 'tiny-planet') {
      targetFov.current = 140;
      targetLat.current = -85;
    } else {
      targetFov.current = 75;
      targetLat.current = 0;
      lat.current = 0; // Quick reset for better feel
    }
  }, [viewMode]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isPointerDown.current = true;
    pointerX.current = e.clientX;
    pointerY.current = e.clientY;
    onPointerDownLon.current = lon.current;
    onPointerDownLat.current = lat.current;
    pointerStartTime.current = Date.now();
    totalPointerDist.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return;
    const dx = e.clientX - pointerX.current;
    const dy = e.clientY - pointerY.current;
    totalPointerDist.current += Math.sqrt(dx * dx + dy * dy);
    
    const factor = viewMode === 'tiny-planet' ? 0.3 : 0.15;
    lon.current = (pointerX.current - e.clientX) * factor + onPointerDownLon.current;
    lat.current = (e.clientY - pointerY.current) * factor + onPointerDownLat.current;
  };

  const handlePointerUp = () => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;

    // Detect click (short duration, small distance)
    const duration = Date.now() - pointerStartTime.current;
    if (duration < 300 && totalPointerDist.current < 10) {
      setShowControls(prev => !prev);
    }
  };

  const toggleViewMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewMode(prev => prev === 'spherical' ? 'tiny-planet' : 'spherical');
  };

  const fetchAiData = useCallback(async () => {
    setIsAiLoading(true);
    const context = customImage ? `a user-uploaded 360 photo titled "${customName}"` : "Mount Everest Base Camp";
    const result = await getLocationFacts(context);
    if (result) {
      setAiInfo(result.info);
      setAiSources(result.sources);
    }
    setIsAiLoading(false);
  }, [customImage, customName]);

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!aiInfo) fetchAiData();
    setShowAiModal(true);
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {/* 360 WebGL Container */}
      <div 
        ref={containerRef}
        className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className={`absolute inset-0 bg-black/30 pointer-events-none transition-opacity duration-700 ${showControls ? 'opacity-100' : 'opacity-0'}`}></div>
      </div>

      {/* HUD Layer */}
      <div className={`absolute inset-0 z-40 flex flex-col justify-between pointer-events-none transition-all duration-500 ease-out ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        
        {/* Top Header */}
        <div className="w-full p-6 pt-12 flex items-start justify-between pointer-events-auto">
          <button 
            onClick={(e) => { e.stopPropagation(); navigate('/'); }}
            className="flex items-center justify-center size-12 rounded-full bg-background-dark/40 backdrop-blur-xl border border-white/10 text-white hover:bg-background-dark/80 transition shadow-2xl"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          
          <div className="flex gap-4">
            <button 
              onClick={toggleViewMode}
              className="flex items-center justify-center size-12 rounded-full bg-background-dark/40 backdrop-blur-xl border border-white/10 text-white hover:bg-background-dark/80 transition-all shadow-2xl active:scale-90"
              title={viewMode === 'spherical' ? "Tiny Planet View" : "Spherical View"}
            >
              <span className="material-symbols-outlined">{viewMode === 'spherical' ? 'brightness_7' : 'language'}</span>
            </button>
            <button className="flex items-center justify-center size-12 rounded-full bg-background-dark/40 backdrop-blur-xl border border-white/10 text-white hover:bg-background-dark/80 transition shadow-2xl">
              <span className="material-symbols-outlined">settings_suggest</span>
            </button>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="w-full flex flex-col bg-gradient-to-t from-background-dark via-background-dark/20 to-transparent pb-12 pt-32 px-8 pointer-events-auto">
          <div className="flex items-end justify-between w-full mb-8">
            <div className="flex flex-col gap-3 max-w-[80%]">
              <div className="flex gap-3">
                <div className="flex h-7 items-center justify-center gap-x-2 rounded-full bg-primary/20 border border-primary/30 px-3 backdrop-blur-xl">
                  <div className="size-2 rounded-full bg-primary animate-pulse"></div>
                  <p className="text-primary text-[10px] font-bold uppercase tracking-widest">
                    {viewMode === 'tiny-planet' ? 'Tiny Planet Mode' : (customImage ? 'Custom View' : 'Spherical View')}
                  </p>
                </div>
              </div>
              <h1 className="text-white text-4xl font-bold leading-tight tracking-tight drop-shadow-2xl">{customImage ? customName : 'Mount Everest Base Camp'}</h1>
              <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
                <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
                <span>{customImage ? 'User Upload' : 'Khumjung, Nepal • 5,364m'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 shrink-0">
              <button 
                onClick={handleInfoClick}
                className={`flex size-14 items-center justify-center rounded-full ${isAiLoading ? 'bg-primary animate-pulse' : 'bg-background-dark/50'} backdrop-blur-2xl border border-white/10 shadow-2xl text-white transition-all hover:scale-105 active:scale-95`}
              >
                <span className="material-symbols-outlined text-[28px]">info</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); navigate('/share', { state: { previewImage: customImage || defaultBg, locationName: customImage ? customName : 'Mount Everest Base Camp' } }); }}
                className="flex size-14 items-center justify-center rounded-full bg-primary backdrop-blur-xl border-2 border-primary/50 shadow-[0_0_30px_rgba(25,127,230,0.4)] text-white hover:scale-110 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[32px]">ios_share</span>
              </button>
            </div>
          </div>

          <div className="w-full flex items-center gap-4 group/timeline">
            <span className="text-[11px] font-mono text-white/50 w-10">360°</span>
            <div className="relative flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
               <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: viewMode === 'tiny-planet' ? '100%' : '50%' }}></div>
            </div>
            <span className="material-symbols-outlined text-white/50 text-xs">explore</span>
          </div>
        </div>
      </div>

      {/* AI Location Info Modal */}
      {showAiModal && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-6 backdrop-blur-md bg-black/60" onClick={() => setShowAiModal(false)}>
          <div 
            className="w-full max-w-lg bg-card-dark border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-32 bg-primary relative">
              <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-transparent"></div>
              <div className="absolute bottom-4 left-6">
                <span className="px-2 py-0.5 bg-white/20 backdrop-blur text-white text-[9px] font-bold uppercase rounded">Location Intelligence</span>
                <h3 className="text-2xl font-bold text-white mt-1">{aiInfo?.name || "Analyzing..."}</h3>
              </div>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
              {isAiLoading ? (
                <div className="space-y-4 py-8">
                  <div className="h-4 bg-white/5 animate-pulse rounded w-full"></div>
                  <div className="h-4 bg-white/5 animate-pulse rounded w-3/4"></div>
                  <div className="h-4 bg-white/5 animate-pulse rounded w-5/6"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-slate-300 leading-relaxed text-sm">{aiInfo?.description}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Elevation / Info</p>
                      <p className="text-white text-lg font-bold truncate">{aiInfo?.elevation}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Status</p>
                      <p className="text-white text-lg font-bold">Processed</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Observations</h4>
                    {aiInfo?.facts.map((fact, idx) => (
                      <div key={idx} className="flex gap-3">
                        <span className="material-symbols-outlined text-primary text-sm">explore</span>
                        <p className="text-slate-400 text-sm leading-snug">{fact}</p>
                      </div>
                    ))}
                  </div>
                  {aiSources.length > 0 && (
                    <div className="pt-6 border-t border-white/5">
                      <p className="text-[10px] text-slate-600 font-bold uppercase mb-3">Context Grounding</p>
                      <div className="flex flex-wrap gap-2">
                        {aiSources.map((chunk, i) => chunk.web && (
                          <a key={i} href={chunk.web.uri} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline truncate max-w-full">
                            [{i+1}] {chunk.web.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewerPage;
