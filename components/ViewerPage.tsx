
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as THREE from 'three';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { getLocationFacts } from '../services/geminiService';
import { LocationInfo } from '../types';

// Helper for Base64 and Audio
const decode = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

const encode = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

const ViewerPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showControls, setShowControls] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInfo, setAiInfo] = useState<LocationInfo | null>(null);
  const [aiSources, setAiSources] = useState<any[]>([]);
  const [showAiModal, setShowAiModal] = useState(false);
  
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
  const phi = useRef(0);
  const theta = useRef(0);

  // Voice Assistant State
  const [isAssistantActive, setIsAssistantActive] = useState(false);
  const [assistantTranscribing, setAssistantTranscribing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

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

      // Auto rotation if not interacting
      if (!isPointerDown.current) {
        lon.current += 0.05;
      }

      lat.current = Math.max(-85, Math.min(85, lat.current));
      phi.current = THREE.MathUtils.degToRad(90 - lat.current);
      theta.current = THREE.MathUtils.degToRad(lon.current);

      cameraRef.current.target = new THREE.Vector3(
        500 * Math.sin(phi.current) * Math.cos(theta.current),
        500 * Math.cos(phi.current),
        500 * Math.sin(phi.current) * Math.sin(theta.current)
      );

      cameraRef.current.lookAt(cameraRef.current.target);
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

  // Pointer Handlers for Interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    isPointerDown.current = true;
    pointerX.current = e.clientX;
    pointerY.current = e.clientY;
    onPointerDownLon.current = lon.current;
    onPointerDownLat.current = lat.current;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return;
    lon.current = (pointerX.current - e.clientX) * 0.1 + onPointerDownLon.current;
    lat.current = (e.clientY - pointerY.current) * 0.1 + onPointerDownLat.current;
  };

  const handlePointerUp = () => {
    isPointerDown.current = false;
  };

  const toggleControls = () => setShowControls(prev => !prev);

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

  const startAssistant = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAssistantActive) {
      stopAssistant();
      return;
    }

    try {
      setIsAssistantActive(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: `You are an immersive experience guide. The user is currently viewing ${customImage ? `their own uploaded 360 degree photo titled "${customName}"` : 'Mount Everest Base Camp'}. Provide insights, facts, or helpful spatial descriptions. Be enthusiastic and professional.`,
        },
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setAssistantTranscribing(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setAssistantTranscribing(false);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
            }
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Live assistant error:", err);
      setIsAssistantActive(false);
    }
  };

  const stopAssistant = () => {
    setIsAssistantActive(false);
    setAssistantTranscribing(false);
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
  };

  useEffect(() => {
    return () => stopAssistant();
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {/* 360 Content Layer - WebGL View */}
      <div 
        ref={containerRef}
        className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className={`absolute inset-0 bg-black/40 pointer-events-none transition-opacity duration-700 ${showControls || isAssistantActive ? 'opacity-100' : 'opacity-0'}`}></div>
      </div>

      {/* Voice Assistant Overlay */}
      {isAssistantActive && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex items-center gap-1 h-12">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 bg-primary rounded-full transition-all duration-200 ${assistantTranscribing ? 'animate-pulse' : 'h-2'}`}
                style={{ 
                  height: assistantTranscribing ? `${Math.random() * 40 + 10}px` : '4px',
                  animationDelay: `${i * 0.1}s`
                }}
              ></div>
            ))}
          </div>
          <p className="mt-6 text-white text-sm font-bold uppercase tracking-[0.3em] opacity-80">
            {assistantTranscribing ? 'Assistant is speaking...' : 'Listening to your guide...'}
          </p>
        </div>
      )}

      {/* HUD Layer */}
      <div className={`absolute inset-0 z-20 flex flex-col justify-between pointer-events-none transition-all duration-500 ease-out ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        
        {/* Top Header */}
        <div className="w-full p-6 pt-12 flex items-start justify-between pointer-events-auto">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center justify-center size-12 rounded-full bg-background-dark/40 backdrop-blur-xl border border-white/10 text-white hover:bg-background-dark/80 transition shadow-2xl"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          
          <div className="flex gap-4">
            <button 
              onClick={startAssistant}
              className={`flex items-center justify-center size-12 rounded-full transition-all active:scale-90 border shadow-2xl ${isAssistantActive ? 'bg-primary border-primary text-white scale-110' : 'bg-background-dark/40 backdrop-blur-xl border-white/10 text-white hover:bg-background-dark/80'}`}
            >
              <span className="material-symbols-outlined">{isAssistantActive ? 'mic' : 'mic_none'}</span>
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
                  <p className="text-primary text-[10px] font-bold uppercase tracking-widest">{customImage ? 'Custom View' : 'Guide Active'}</p>
                </div>
              </div>
              <h1 className="text-white text-4xl font-bold leading-tight tracking-tight drop-shadow-2xl">{customImage ? customName : 'Mount Everest Base Camp'}</h1>
              <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
                <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
                <span>{customImage ? 'Uploaded Content' : 'Khumjung, Nepal • 5,364m'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 shrink-0">
              <button 
                onClick={handleInfoClick}
                className={`flex size-14 items-center justify-center rounded-full ${isAiLoading ? 'bg-primary animate-pulse' : 'bg-background-dark/50'} backdrop-blur-2xl border border-white/10 shadow-2xl text-white transition-all`}
              >
                <span className="material-symbols-outlined text-[28px]">info</span>
              </button>
              <button 
                onClick={() => navigate('/share', { state: { previewImage: customImage || defaultBg, locationName: customImage ? customName : 'Mount Everest Base Camp' } })}
                className="flex size-14 items-center justify-center rounded-full bg-primary backdrop-blur-xl border-2 border-primary/50 shadow-[0_0_30px_rgba(25,127,230,0.4)] text-white hover:scale-110 transition-all active:scale-90"
              >
                <span className="material-symbols-outlined text-[32px]">ios_share</span>
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="w-full flex items-center gap-4 group/timeline">
            <span className="text-[11px] font-mono text-white/50 w-10">Live</span>
            <div className="relative flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
               <div className="h-full bg-primary rounded-full" style={{ width: '100%' }}></div>
            </div>
            <span className="material-symbols-outlined text-white/50 text-xs">timer</span>
          </div>
        </div>
      </div>

      {/* Tap Trigger */}
      {!isAssistantActive && <div className="absolute inset-0 z-10 pointer-events-none" onClick={toggleControls}></div>}

      {/* AI Location Info Modal */}
      {showAiModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/60" onClick={() => setShowAiModal(false)}>
          <div 
            className="w-full max-w-lg bg-card-dark border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-32 bg-primary relative">
              <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-transparent"></div>
              <div className="absolute bottom-4 left-6">
                <span className="px-2 py-0.5 bg-white/20 backdrop-blur text-white text-[9px] font-bold uppercase rounded">Grounding Analysis</span>
                <h3 className="text-2xl font-bold text-white mt-1">{aiInfo?.name || "Analyzing..."}</h3>
              </div>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
              {isAiLoading ? (
                <div className="space-y-4">
                  <div className="h-4 bg-white/5 animate-pulse rounded w-full"></div>
                  <div className="h-4 bg-white/5 animate-pulse rounded w-3/4"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-slate-300 leading-relaxed text-sm">{aiInfo?.description}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Elevation / Context</p>
                      <p className="text-white text-lg font-bold truncate">{aiInfo?.elevation}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Status</p>
                      <p className="text-white text-lg font-bold">Processed</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest">AI Observations</h4>
                    {aiInfo?.facts.map((fact, idx) => (
                      <div key={idx} className="flex gap-3">
                        <span className="material-symbols-outlined text-primary text-sm">explore</span>
                        <p className="text-slate-400 text-sm">{fact}</p>
                      </div>
                    ))}
                  </div>
                  {aiSources.length > 0 && (
                    <div className="pt-6 border-t border-white/5">
                      <p className="text-[10px] text-slate-600 font-bold uppercase mb-3">Grounding Sources</p>
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
