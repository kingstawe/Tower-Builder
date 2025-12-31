
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 650;
export const INITIAL_BLOCK_WIDTH = 160;
export const BLOCK_HEIGHT = 50;
export const SWING_AMPLITUDE = 130;
export const INITIAL_SPEED = 0.045;
export const GRAVITY = 0.85;
export const PERFECT_THRESHOLD = 6;

export const SKY_CONFIG = [
  { stop: 0, colors: ['#87CEEB', '#E0F6FF'], label: 'الصباح' },
  { stop: 10, colors: ['#4FA4FF', '#A6D5FF'], label: 'الضحى' },
  { stop: 20, colors: ['#FF7F50', '#FFDAB9'], label: 'الغروب' },
  { stop: 30, colors: ['#2F4F4F', '#708090'], label: 'الغسق' },
  { stop: 40, colors: ['#191970', '#000033'], label: 'الليل' },
  { stop: 60, colors: ['#000011', '#000000'], label: 'الفضاء' }
];

export const BUILDING_THEMES = [
  { primary: '#475569', secondary: '#94a3b8', window: '#fef08a' }, // Modern Steel
  { primary: '#78350f', secondary: '#b45309', window: '#fde68a' }, // Classic Brick
  { primary: '#1e3a8a', secondary: '#3b82f6', window: '#bfdbfe' }, // Glass Tower
  { primary: '#14532d', secondary: '#22c55e', window: '#dcfce7' }, // Eco Green
  { primary: '#581c87', secondary: '#a855f7', window: '#f3e8ff' }  // Cyberpunk
];
