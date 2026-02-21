import Phaser from "phaser";
import { SNAKE_SPEED, SNAKE_SPEED_VARIATION } from "../config/gameConfig";

export class Snake extends Phaser.Physics.Arcade.Sprite {
  private moveSpeed: number;
  private minX: number;
  private maxX: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    patrolWidth: number,
    speedFactor: number
  ) {
    super(scene, x, y, "snake-1");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setOrigin(0.5, 1);
    body.setSize(30, 16, true);
    body.setOffset(1, 10);
    this.setBounce(1, 0);
    this.setCollideWorldBounds(true);
    body.setAllowGravity(true);

    this.moveSpeed = SNAKE_SPEED + speedFactor * SNAKE_SPEED_VARIATION;
    this.minX = x - patrolWidth * 0.5;
    this.maxX = x + patrolWidth * 0.5;

    this.setVelocityX(this.moveSpeed);
  }

  public update(): void {
    if (!this.active || !this.body) {
      return;
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.x < this.minX) {
      this.setX(this.minX);
      body.velocity.x = Math.abs(this.moveSpeed);
    } else if (this.x > this.maxX) {
      this.setX(this.maxX);
      body.velocity.x = -Math.abs(this.moveSpeed);
    }

    this.setFlipX(body.velocity.x < 0);
    this.setTexture((this.scene.time.now >> 7) % 2 === 0 ? "snake-1" : "snake-2");
  }
}
