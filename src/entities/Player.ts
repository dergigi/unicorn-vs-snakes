import Phaser from "phaser";
import {
  COYOTE_TIME_MS,
  JUMP_HOLD_BOOST_PER_FRAME,
  JUMP_HOLD_MAX_MS,
  JUMP_BUFFER_MS,
  MAX_JUMPS,
  PLAYER_JUMP_VELOCITY,
  PLAYER_MAX_FALL_SPEED,
  PLAYER_MOVE_SPEED
} from "../config/gameConfig";

type Cursors = Phaser.Types.Input.Keyboard.CursorKeys & {
  jump: Phaser.Input.Keyboard.Key;
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Cursors;
  private lastGroundedAt = 0;
  private lastJumpPressedAt = -9999;
  private jumpsUsed = 0;
  private airJumpUsed = false;
  private wasGrounded = false;
  private hasRainbowPowerup = false;
  private jumpHoldUntil = 0;
  private controlsEnabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, cursors: Cursors) {
    super(scene, x, y, "unicorn", 0);
    this.cursors = cursors;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setOrigin(0.5, 1);
    this.setScale(2);
    this.setCollideWorldBounds(true);
    // Match collisions to the visible body/hooves of the 16x16 sprite.
    // The source frame has empty padding, so a smaller body prevents hovering.
    body.setSize(12, 10, true);
    body.setOffset(2, 5);
  }

  public setControlsEnabled(enabled: boolean): void {
    this.controlsEnabled = enabled;
    if (!enabled) {
      this.setVelocityX(0);
    }
  }

  public resetAt(x: number, y: number): void {
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.clearTint();
    this.setAlpha(1);
    this.jumpsUsed = 0;
    this.airJumpUsed = false;
    this.wasGrounded = false;
    this.jumpHoldUntil = 0;
  }

  public setRainbowPowerup(enabled: boolean): void {
    this.hasRainbowPowerup = enabled;
  }

  public hasRainbowPower(): boolean {
    return this.hasRainbowPowerup;
  }

  public update(time: number, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const isGrounded = body.blocked.down || body.touching.down;

    if (isGrounded) {
      this.lastGroundedAt = time;
      if (!this.wasGrounded) {
        this.jumpsUsed = 0;
        this.airJumpUsed = false;
      }
    }

    if (!this.controlsEnabled) {
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.jump) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up)
    ) {
      this.lastJumpPressedAt = time;
    }

    let velocityX = 0;
    if (this.cursors.left?.isDown) {
      velocityX = -PLAYER_MOVE_SPEED;
      this.setFlipX(true);
    } else if (this.cursors.right?.isDown) {
      velocityX = PLAYER_MOVE_SPEED;
      this.setFlipX(false);
    }
    this.setVelocityX(velocityX);

    const canUseCoyote = time - this.lastGroundedAt <= COYOTE_TIME_MS;
    const jumpBuffered = time - this.lastJumpPressedAt <= JUMP_BUFFER_MS;
    const canGroundJump = canUseCoyote && this.jumpsUsed === 0;
    const canAirJump =
      !isGrounded &&
      this.jumpsUsed > 0 &&
      !this.airJumpUsed &&
      this.hasRainbowPowerup &&
      this.jumpsUsed < MAX_JUMPS;

    if (jumpBuffered && (canGroundJump || canAirJump)) {
      this.setVelocityY(PLAYER_JUMP_VELOCITY);
      this.lastJumpPressedAt = -9999;
      this.lastGroundedAt = -9999;
      this.jumpsUsed += 1;
      if (canAirJump) {
        this.airJumpUsed = true;
      }
      this.jumpHoldUntil = time + JUMP_HOLD_MAX_MS;
    }

    const jumpHeld = this.cursors.jump.isDown || this.cursors.up.isDown;
    const jumpReleased =
      Phaser.Input.Keyboard.JustUp(this.cursors.jump) ||
      Phaser.Input.Keyboard.JustUp(this.cursors.up);

    if (jumpReleased && body.velocity.y < 0) {
      body.velocity.y *= 0.55;
      this.jumpHoldUntil = 0;
    }

    if (jumpHeld && time < this.jumpHoldUntil && body.velocity.y < 0) {
      const dtScale = delta / 16.6667;
      body.velocity.y -= JUMP_HOLD_BOOST_PER_FRAME * dtScale;
    }

    if (body.velocity.y > PLAYER_MAX_FALL_SPEED) {
      body.velocity.y = PLAYER_MAX_FALL_SPEED;
    }

    if (!isGrounded) {
      this.setFrame(2);
      this.setAngle(0);
    } else if (Math.abs(velocityX) > 0) {
      const runFrame = Math.floor(time / 120) % 4;
      this.setFrame(runFrame);
      this.setAngle(0);
    } else {
      this.setFrame(0);
      this.setAngle(0);
    }

    this.wasGrounded = isGrounded;
  }
}
