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

export type LevelData = {
  spawn: { x: number; y: number };
  rainbowPowerup: { x: number; y: number };
  finishGate: { x: number; y: number };
  checkpoints: { x: number; y: number }[];
  platforms: PlatformData[];
  snakes: SnakeData[];
  sparkles: SparkleData[];
};
