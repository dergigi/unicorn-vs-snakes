import Phaser from "phaser";

export interface PatrolSnake {
  sprite: Phaser.GameObjects.Image;
  minX: number;
  maxX: number;
  speed: number;
}

export interface SnakeDef {
  x: number;
  patrol: number;
  speed: number;
}

export function spawnPatrolSnakes(
  scene: Phaser.Scene,
  defs: SnakeDef[],
  y: number,
  scale = 1.3,
  depth = 2
): PatrolSnake[] {
  const snakes: PatrolSnake[] = [];
  for (const def of defs) {
    const sprite = scene.add
      .image(def.x, y, "snake-1")
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setFlipX(def.speed < 0)
      .setDepth(depth);
    snakes.push({
      sprite,
      minX: def.x - def.patrol / 2,
      maxX: def.x + def.patrol / 2,
      speed: def.speed,
    });
  }
  return snakes;
}

export function updatePatrolSnakes(snakes: PatrolSnake[], time: number): void {
  for (const snake of snakes) {
    snake.sprite.x += snake.speed;
    if (snake.sprite.x < snake.minX) {
      snake.sprite.x = snake.minX;
      snake.speed = Math.abs(snake.speed);
    } else if (snake.sprite.x > snake.maxX) {
      snake.sprite.x = snake.maxX;
      snake.speed = -Math.abs(snake.speed);
    }
    snake.sprite.setFlipX(snake.speed < 0);
    snake.sprite.setTexture((time >> 7) % 2 === 0 ? "snake-1" : "snake-2");
  }
}
