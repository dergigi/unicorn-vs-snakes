export type RectData = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PlatformData = RectData;
export type WaterPuddleData = RectData;
export type TreeStumpData = RectData;
export type StoryCatData = RectData;
export type AppleData = RectData;

export type SnakeData = {
  x: number;
  y: number;
  patrolWidth: number;
  speedFactor: number;
};

export type SparkleData = {
  x: number;
  y: number;
};

export type FriendlyCritterData = RectData & {
  patrolLeft?: number;
  patrolRight?: number;
};

export type FlameData = RectData & {
  patrolLeft?: number;
  patrolRight?: number;
};

export type MovingPlatformData = RectData & {
  moveX?: number;
  moveY?: number;
  duration?: number;
};

export type LevelData = {
  theme: "forest" | "lava" | "castle";
  spawn: { x: number; y: number };
  rainbowPowerup: { x: number; y: number };
  finishGate: { x: number; y: number };
  checkpoints: { x: number; y: number }[];
  platforms: PlatformData[];
  snakes: SnakeData[];
  sparkles: SparkleData[];
  waterPuddles?: WaterPuddleData[];
  treeStumps?: TreeStumpData[];
  friendlyCritters?: FriendlyCritterData[];
  storyCat?: StoryCatData;
  flames?: FlameData[];
  apples?: AppleData[];
  movingPlatforms?: MovingPlatformData[];
};
