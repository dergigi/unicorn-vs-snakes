export type PlatformData = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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

export type WaterPuddleData = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TreeStumpData = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FriendlyCritterData = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LevelData = {
  theme: "forest" | "lava";
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
};
