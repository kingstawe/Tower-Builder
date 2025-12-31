
export type GameStatus = 'IDLE' | 'PLAYING' | 'GAMEOVER';

export interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface CurrentBlock extends Block {
  phase: number; // For the sine wave oscillation
  speed: number;
  isFalling: boolean;
  fallSpeed: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}
