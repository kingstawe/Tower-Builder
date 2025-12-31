
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameStatus, Block, CurrentBlock, Particle } from './types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  INITIAL_BLOCK_WIDTH, 
  BLOCK_HEIGHT, 
  SWING_AMPLITUDE, 
  INITIAL_SPEED, 
  GRAVITY,
  PERFECT_THRESHOLD,
  SKY_CONFIG,
  BUILDING_THEMES
} from './constants';

const DROP_OFFSET = 220; 
const STORAGE_KEY = 'tower_builder_pro_highscore';

interface Decoration { x: number; y: number; type: 'BIRD' | 'PLANE' | 'STAR'; speed: number; size: number; }

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const [gameStatus, setGameStatus] = useState<GameStatus>('IDLE');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isMuted, setIsMuted] = useState(false);

  const blocksRef = useRef<Block[]>([]);
  const currentBlockRef = useRef<CurrentBlock | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const decorationsRef = useRef<Decoration[]>([]);
  const cameraYRef = useRef(0);
  const targetCameraYRef = useRef(0);
  const requestRef = useRef<number>(0);
  const shakeRef = useRef(0);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (freq: number, type: OscillatorType, duration: number, volume = 0.08) => {
    if (!audioCtxRef.current || isMuted) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const initDecorations = () => {
    decorationsRef.current = Array.from({ length: 15 }, () => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT * 2 - CANVAS_HEIGHT,
      type: Math.random() > 0.7 ? 'BIRD' : 'STAR',
      speed: 0.5 + Math.random() * 1.5,
      size: 1 + Math.random() * 3
    }));
  };

  const initGame = useCallback(() => {
    initAudio();
    initDecorations();
    blocksRef.current = [];
    particlesRef.current = [];
    cameraYRef.current = 0;
    targetCameraYRef.current = 0;
    shakeRef.current = 0;
    setScore(0);
    setCombo(0);
    setGameStatus('PLAYING');
    
    // First Block (The Foundation)
    blocksRef.current.push({
      x: (CANVAS_WIDTH - INITIAL_BLOCK_WIDTH) / 2,
      y: CANVAS_HEIGHT - BLOCK_HEIGHT - 40,
      width: INITIAL_BLOCK_WIDTH,
      height: BLOCK_HEIGHT,
      color: BUILDING_THEMES[0].primary
    });
    spawnBlock();
  }, [isMuted]);

  const spawnBlock = () => {
    const lastBlock = blocksRef.current[blocksRef.current.length - 1];
    const themeIndex = Math.min(Math.floor(score / 12), BUILDING_THEMES.length - 1);
    currentBlockRef.current = {
      x: CANVAS_WIDTH / 2,
      y: lastBlock.y - BLOCK_HEIGHT - DROP_OFFSET, 
      width: lastBlock.width,
      height: BLOCK_HEIGHT,
      color: BUILDING_THEMES[themeIndex].primary,
      phase: Math.random() * Math.PI * 2,
      speed: INITIAL_SPEED + (score * 0.0018),
      isFalling: false,
      fallSpeed: 0
    };
  };

  const handleAction = () => {
    if (gameStatus === 'IDLE' || gameStatus === 'GAMEOVER') {
      initGame();
      return;
    }
    if (currentBlockRef.current && !currentBlockRef.current.isFalling) {
      currentBlockRef.current.isFalling = true;
      currentBlockRef.current.fallSpeed = 8.5; 
      playSound(350, 'sine', 0.2);
    }
  };

  const update = () => {
    // Decorations animation
    decorationsRef.current.forEach(d => {
      if (d.type === 'BIRD') {
        d.x += d.speed;
        if (d.x > CANVAS_WIDTH + 50) d.x = -50;
      }
    });

    if (gameStatus !== 'PLAYING') return;

    cameraYRef.current += (targetCameraYRef.current - cameraYRef.current) * 0.07;
    if (shakeRef.current > 0) shakeRef.current *= 0.85;

    const current = currentBlockRef.current;
    if (!current) return;

    if (!current.isFalling) {
      current.phase += current.speed;
      current.x = (CANVAS_WIDTH / 2) + Math.sin(current.phase) * SWING_AMPLITUDE - (current.width / 2);
      const lastBlock = blocksRef.current[blocksRef.current.length - 1];
      current.y = lastBlock.y - BLOCK_HEIGHT - DROP_OFFSET;
    } else {
      current.y += current.fallSpeed;
      current.fallSpeed += GRAVITY;
      const lastBlock = blocksRef.current[blocksRef.current.length - 1];
      
      if (current.y + current.height >= lastBlock.y) {
        const diff = current.x - lastBlock.x;
        const overlap = current.width - Math.abs(diff);
        
        if (overlap > 12) {
          const isPerfect = Math.abs(diff) < PERFECT_THRESHOLD;
          const finalWidth = isPerfect ? lastBlock.width : overlap;
          const finalX = isPerfect ? lastBlock.x : (diff > 0 ? current.x : lastBlock.x);
          
          blocksRef.current.push({ x: finalX, y: lastBlock.y - BLOCK_HEIGHT, width: finalWidth, height: BLOCK_HEIGHT, color: current.color });
          
          if (isPerfect) {
            setCombo(c => c + 1);
            shakeRef.current = 15;
            playSound(600 + (combo * 60), 'triangle', 0.15);
            // Spawn particles
            for(let i=0; i<15; i++) {
              particlesRef.current.push({
                x: finalX + finalWidth/2, y: lastBlock.y,
                vx: (Math.random()-0.5)*12, vy: (Math.random()-0.5)*12,
                life: 1.0, color: '#fbbf24'
              });
            }
          } else {
            setCombo(0);
            playSound(280, 'square', 0.1);
          }
          
          setScore(s => s + (isPerfect ? combo + 1 : 1));
          if (blocksRef.current.length > 3) targetCameraYRef.current += BLOCK_HEIGHT;
          spawnBlock();
        } else {
          setGameStatus('GAMEOVER');
          playSound(120, 'sawtooth', 0.6);
          setBestScore(prev => {
            const next = score > prev ? score : prev;
            localStorage.setItem(STORAGE_KEY, next.toString());
            return next;
          });
        }
      }
    }

    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx; p.y += p.vy; p.life -= 0.025;
      return p.life > 0;
    });
  };

  const drawDetailedBuilding = (ctx: CanvasRenderingContext2D, b: Block, isBase = false) => {
    ctx.save();
    
    // Main Body 3D Effect
    const theme = BUILDING_THEMES[Math.min(Math.floor(score / 12), BUILDING_THEMES.length - 1)];
    const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.width, b.y);
    grad.addColorStop(0, b.color);
    grad.addColorStop(0.5, theme.secondary);
    grad.addColorStop(1, b.color);
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.width, b.height, 4);
    ctx.fill();

    // Top Ledge
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(b.x, b.y, b.width, 4);
    
    // Bottom Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(b.x, b.y + b.height - 4, b.width, 4);

    // Architectural Details (Windows)
    const winW = 12;
    const winH = 16;
    const gap = 14;
    const cols = Math.floor((b.width - 20) / (winW + gap));
    const startX = b.x + (b.width - (cols * (winW + gap) - gap)) / 2;

    for (let i = 0; i < cols; i++) {
      const wx = startX + i * (winW + gap);
      const wy = b.y + 10;
      
      // Window Frame Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(wx - 1, wy - 1, winW + 2, winH + 2);
      
      // Glass
      const isLit = (Math.sin(wx + b.y * 0.5) > 0);
      ctx.fillStyle = isLit ? theme.window : '#1e293b';
      ctx.fillRect(wx, wy, winW, winH);
      
      // Reflection
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(wx, wy, winW/2, winH);
    }

    if (isBase) {
      // Lobby Door
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(b.x + b.width / 2 - 15, b.y + 15, 30, 35);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(b.x + b.width / 2 - 1, b.y + 25, 2, 10);
    }
    
    ctx.restore();
  };

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    const configIndex = Math.min(Math.floor(score / 10), SKY_CONFIG.length - 1);
    const config = SKY_CONFIG[configIndex];
    
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, config.colors[1]);
    grad.addColorStop(1, config.colors[0]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Distant City Parallax (Layer 1)
    ctx.save();
    ctx.translate(0, cameraYRef.current * 0.15);
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for(let i=0; i<6; i++) {
      ctx.fillRect(i*80 - 20, CANVAS_HEIGHT - 300, 60, 400);
      ctx.fillRect(i*80 + 20, CANVAS_HEIGHT - 220, 40, 400);
    }
    ctx.restore();

    // Distant City Parallax (Layer 2)
    ctx.save();
    ctx.translate(0, cameraYRef.current * 0.3);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for(let i=0; i<4; i++) {
      ctx.fillRect(i*120 - 40, CANVAS_HEIGHT - 200, 80, 400);
    }
    ctx.restore();

    // Decorations (Birds/Stars)
    decorationsRef.current.forEach(d => {
      ctx.save();
      ctx.translate(0, cameraYRef.current * (d.type === 'STAR' ? 0.05 : 0.5));
      ctx.globalAlpha = d.type === 'STAR' ? Math.max(0, (score - 30)/10) : 0.4;
      ctx.fillStyle = 'white';
      if (d.type === 'BIRD') {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.quadraticCurveTo(d.x + 5, d.y - 5, d.x + 10, d.y);
        ctx.quadraticCurveTo(d.x + 15, d.y - 5, d.x + 20, d.y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    drawBackground(ctx);

    ctx.save();
    if (shakeRef.current > 0) ctx.translate((Math.random()-0.5)*shakeRef.current, (Math.random()-0.5)*shakeRef.current);
    ctx.translate(0, cameraYRef.current);

    // Floor/Ground
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-100, CANVAS_HEIGHT - 40, CANVAS_WIDTH + 200, 100);

    // The Tower
    blocksRef.current.forEach((b, i) => drawDetailedBuilding(ctx, b, i === 0));

    // Crane & Falling Block
    const current = currentBlockRef.current;
    if (current && gameStatus === 'PLAYING') {
      const centerX = current.x + current.width / 2;
      if (!current.isFalling) {
        ctx.save();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(centerX, current.y - 1000);
        ctx.lineTo(centerX, current.y);
        ctx.stroke();
        
        // Crane Hook
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(centerX - 10, current.y - 10, 20, 10);
        ctx.restore();
      }
      drawDetailedBuilding(ctx, current);
    }

    // Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  };

  useEffect(() => {
    const loop = () => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) { update(); draw(ctx); }
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameStatus, score, combo]);

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center bg-[#020617] font-['Cairo'] select-none overflow-hidden" onPointerDown={handleAction}>
      {/* Game Frame */}
      <div className="relative shadow-[0_0_100px_rgba(0,0,0,0.6)] border-[12px] border-slate-900 rounded-[3.5rem] overflow-hidden bg-white">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="cursor-pointer" />

        {/* Dynamic HUD */}
        <div className="absolute top-10 inset-x-0 flex flex-col items-center pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20"></div>
            <div className="bg-slate-900/90 backdrop-blur-xl px-12 py-3 rounded-[2rem] border border-white/20 shadow-2xl flex flex-col items-center min-w-[140px]">
              <span className="text-6xl font-black text-white leading-none tracking-tighter">{score}</span>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">طابقاً</span>
            </div>
          </div>
          {combo > 1 && (
            <div className="mt-4 bg-yellow-400 text-slate-900 px-6 py-1 rounded-full font-black text-xs animate-bounce shadow-xl border-2 border-white">
              مثالي ×{combo}
            </div>
          )}
        </div>

        {/* Overlays */}
        {gameStatus === 'IDLE' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-12">
            <div className="w-28 h-28 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl mb-10 rotate-3 transform hover:rotate-0 transition-transform">
              <i className="fas fa-city text-6xl text-white"></i>
            </div>
            <h1 className="text-5xl font-black text-white mb-4 tracking-tighter">باني القمم</h1>
            <p className="text-slate-400 text-sm mb-12 max-w-[240px]">تحدى الجاذبية وابنِ أعظم ناطحة سحاب في العالم</p>
            <button className="bg-blue-600 hover:bg-blue-500 text-white font-black py-6 px-16 rounded-2xl text-2xl shadow-[0_8px_0_rgb(29,78,216)] active:translate-y-2 active:shadow-none transition-all" onClick={e => {e.stopPropagation(); initGame();}}>ابدأ التشييد</button>
          </div>
        )}

        {gameStatus === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-red-950/90 backdrop-blur-xl flex flex-col items-center justify-center text-center p-12">
            <div className="text-8xl mb-6">🏗️</div>
            <h2 className="text-4xl font-black text-white mb-2">انهار البرج!</h2>
            <p className="text-red-300 text-sm mb-8 italic">"الهندسة هي فن التعامل مع المجهول"</p>
            
            <div className="bg-black/50 w-full py-8 rounded-[2.5rem] mb-10 border border-white/10 shadow-inner">
              <div className="text-7xl font-black text-white">{score}</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mt-2 font-bold">النتيجة النهائية</div>
              {score >= bestScore && score > 0 && <div className="text-yellow-400 text-xs font-bold mt-2 animate-pulse">✨ رقم قياسي جديد ✨</div>}
            </div>

            <button className="bg-white text-slate-950 font-black py-5 px-14 rounded-2xl text-xl shadow-[0_8px_0_rgb(200,200,200)] active:translate-y-2 active:shadow-none transition-all" onClick={e => {e.stopPropagation(); initGame();}}>إعادة البناء</button>
          </div>
        )}

        {/* Audio Toggle */}
        <button onPointerDown={e => e.stopPropagation()} onClick={e => {e.stopPropagation(); setIsMuted(!isMuted);}} className="absolute bottom-8 right-8 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20 shadow-2xl transition-all">
          <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'} text-xl`}></i>
        </button>
      </div>

      {/* Footer Info */}
      <div className="mt-8 flex flex-col items-center gap-2 opacity-40">
        <div className="flex items-center gap-3 text-white text-xs font-bold uppercase tracking-widest">
          <i className="fas fa-mouse animate-bounce"></i>
          <span>اضغط في أي مكان للإسقاط</span>
        </div>
      </div>
    </div>
  );
};

export default App;
