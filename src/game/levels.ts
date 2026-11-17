import { GhostPersonality } from './types';

export interface LevelConfig {
  id: number;
  name: string;
  thaiName: string;
  subtitle: string;
  wallColor: string;
  wallDepthColor: string;
  floorTint: string;
  ghostSpeedMultiplier: number;
  frightenedDuration: number;
  grid: number[][];
}

// Legend:
// 0 = Empty corridor
// 1 = Wall (Architectural block)
// 2 = Pac-Dot
// 3 = Power Orb
// 4 = Ghost House Door
// 5 = Low Hurdle (Jump over using Jump button for shortcut & +75 pts!)
// 6 = Spring Pad (Auto-launches a free Super Jump!)

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'Sunny Courtyard',
    thaiName: 'ลานแสงอรุณ',
    subtitle: 'กระโดดข้ามรั้วสีฟ้า (Hurdle) เพื่อใช้ทางลัดและหลบผี',
    wallColor: '#E4DFD3',
    wallDepthColor: '#CFC8B8',
    floorTint: '#FBF9F5',
    ghostSpeedMultiplier: 1.0,
    frightenedDuration: 7.5,
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,3,1],
      [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
      [1,2,2,2,2,2,5,2,2,2,2,2,5,2,2,2,2,2,1],
      [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
      [1,2,2,2,6,1,2,2,2,1,2,2,2,1,6,2,2,2,1],
      [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
      [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
      [1,1,1,1,2,1,0,1,1,4,1,1,0,1,2,1,1,1,1],
      [0,0,0,0,2,0,0,1,0,0,0,1,0,0,2,0,0,0,0],
      [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
      [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
      [1,1,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,1,1],
      [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
      [1,3,2,1,2,2,5,2,2,0,2,2,5,2,2,1,2,3,1],
      [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
      [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
  },
  {
    id: 2,
    name: 'Breeze Pavilion',
    thaiName: 'ศาลาสายลม',
    subtitle: 'ใช้แท่นสปริงสีเขียวและปุ่มกระโดดเพื่อข้ามแยกอันตราย',
    wallColor: '#DCE6E2',
    wallDepthColor: '#C2D1CB',
    floorTint: '#F8FBF9',
    ghostSpeedMultiplier: 1.12,
    frightenedDuration: 6.5,
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,2,2,2,1,2,2,2,2,2,2,2,1,2,2,2,3,1],
      [1,2,1,1,2,1,2,1,1,5,1,1,2,1,2,1,1,2,1],
      [1,2,1,1,2,2,2,2,2,2,2,2,2,2,2,1,1,2,1],
      [1,2,2,2,6,1,1,2,1,1,1,2,1,1,6,2,2,2,1],
      [1,1,1,2,1,1,1,2,2,1,2,2,1,1,1,2,1,1,1],
      [1,2,2,2,5,2,2,2,0,1,0,2,2,2,5,2,2,2,1],
      [1,2,1,1,2,1,0,0,0,0,0,0,0,1,2,1,1,2,1],
      [1,2,1,1,2,1,0,1,1,4,1,1,0,1,2,1,1,2,1],
      [0,2,2,2,2,0,0,1,0,0,0,1,0,0,2,2,2,2,0],
      [1,2,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,2,1],
      [1,2,1,1,2,1,0,0,0,0,0,0,0,1,2,1,1,2,1],
      [1,2,2,2,2,1,2,1,1,5,1,1,2,1,2,2,2,2,1],
      [1,1,1,2,1,1,2,2,2,2,2,2,2,1,1,2,1,1,1],
      [1,2,2,2,2,2,2,1,1,1,1,1,2,2,2,2,2,2,1],
      [1,3,1,1,2,1,2,2,2,0,2,2,2,1,2,1,1,3,1],
      [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
      [1,2,2,2,6,2,2,2,2,1,2,2,2,2,6,2,2,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
  },
  {
    id: 3,
    name: 'Zenith Terrace',
    thaiName: 'ระเบียงตะวันฉาย',
    subtitle: 'ด่านความเร็วสูง กระโดดข้ามผีเพื่อรับโบนัส +150 คะแนน!',
    wallColor: '#E6DFEC',
    wallDepthColor: '#CEC3D8',
    floorTint: '#FAF8FC',
    ghostSpeedMultiplier: 1.24,
    frightenedDuration: 5.5,
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,2,2,5,2,2,2,2,1,2,2,2,2,5,2,2,3,1],
      [1,2,1,1,1,1,2,1,2,1,2,1,2,1,1,1,1,2,1],
      [1,2,2,2,2,2,6,1,2,2,2,1,6,2,2,2,2,2,1],
      [1,1,2,1,1,1,2,1,1,5,1,1,2,1,1,1,2,1,1],
      [1,2,2,2,2,1,2,2,2,2,2,2,2,1,2,2,2,2,1],
      [1,2,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,2,1],
      [1,2,1,1,2,0,0,0,0,0,0,0,0,0,2,1,1,2,1],
      [1,2,1,1,2,1,0,1,1,4,1,1,0,1,2,1,1,2,1],
      [0,2,5,2,2,1,0,1,0,0,0,1,0,1,2,2,5,2,0],
      [1,2,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,2,1],
      [1,2,1,1,2,0,0,0,0,0,0,0,0,0,2,1,1,2,1],
      [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
      [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
      [1,3,2,2,6,1,2,2,2,0,2,2,2,1,6,2,2,3,1],
      [1,1,1,1,2,1,2,1,1,5,1,1,2,1,2,1,1,1,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
  },
];

export interface GhostTemplate {
  id: string;
  name: string;
  thaiRole: string;
  personality: GhostPersonality;
  color: string;
  accentColor: string;
  startX: number;
  startY: number;
  releaseDelay: number;
}

export const GHOST_TEMPLATES: GhostTemplate[] = [
  {
    id: 'blinky',
    name: 'CORAL',
    thaiRole: 'นักไล่ล่า',
    personality: 'CHASER',
    color: '#FB7185', // Pastel Coral Rose
    accentColor: '#E11D48',
    startX: 9.5,
    startY: 7.5,
    releaseDelay: 0,
  },
  {
    id: 'pinky',
    name: 'MOCHI',
    thaiRole: 'นักดักทาง',
    personality: 'AMBUSHER',
    color: '#F472B6', // Pastel Blossom Pink
    accentColor: '#DB2777',
    startX: 9.5,
    startY: 9.5,
    releaseDelay: 1.5,
  },
  {
    id: 'inky',
    name: 'SORA',
    thaiRole: 'สายลาดตระเวน',
    personality: 'PATROLLER',
    color: '#38BDF8', // Pastel Sky Blue
    accentColor: '#0284C7',
    startX: 8.5,
    startY: 9.5,
    releaseDelay: 3.2,
  },
  {
    id: 'clyde',
    name: 'YUZU',
    thaiRole: 'นักพเนจร',
    personality: 'WANDERER',
    color: '#FB923C', // Pastel Apricot Orange
    accentColor: '#EA580C',
    startX: 10.5,
    startY: 9.5,
    releaseDelay: 5.0,
  },
];
