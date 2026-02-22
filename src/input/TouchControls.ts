import Phaser from "phaser";
import { GAME_WIDTH } from "../config/gameConfig";

export interface TouchInput {
  left: boolean;
  right: boolean;
  jumpDown: boolean;
  jumpJustPressed: boolean;
  jumpJustReleased: boolean;
  fireJustPressed: boolean;
}

const ZONE_LEFT_MAX = GAME_WIDTH / 3;
const ZONE_RIGHT_MIN = (GAME_WIDTH * 2) / 3;
const SWIPE_UP_THRESHOLD = 30;

export class TouchControls {
  public readonly state: TouchInput = {
    left: false,
    right: false,
    jumpDown: false,
    jumpJustPressed: false,
    jumpJustReleased: false,
    fireJustPressed: false,
  };

  private scene: Phaser.Scene;
  private enabled = false;
  private primaryPointerId: number | null = null;
  private primaryStartY = 0;
  private jumping = false;

  private onPointerDown: (pointer: Phaser.Input.Pointer) => void;
  private onPointerUp: (pointer: Phaser.Input.Pointer) => void;
  private onPointerMove: (pointer: Phaser.Input.Pointer) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    if (!scene.sys.game.device.input.touch) {
      this.onPointerDown = () => {};
      this.onPointerUp = () => {};
      this.onPointerMove = () => {};
      return;
    }

    this.enabled = true;
    scene.input.addPointer(1);

    this.onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (this.primaryPointerId === null) {
        this.primaryPointerId = pointer.id;
        this.primaryStartY = pointer.y;
        this.jumping = false;
        this.applyZone(pointer.x);
      } else if (pointer.id !== this.primaryPointerId) {
        this.state.fireJustPressed = true;
      }
    };

    this.onPointerUp = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.primaryPointerId) {
        this.primaryPointerId = null;
        this.state.left = false;
        this.state.right = false;
        if (this.jumping) {
          this.jumping = false;
          this.state.jumpDown = false;
          this.state.jumpJustReleased = true;
        }
      }
    };

    this.onPointerMove = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.primaryPointerId || !pointer.isDown) {
        return;
      }
      this.applyZone(pointer.x);

      const dy = this.primaryStartY - pointer.y;
      if (!this.jumping && dy > SWIPE_UP_THRESHOLD) {
        this.jumping = true;
        this.state.jumpDown = true;
        this.state.jumpJustPressed = true;
      } else if (this.jumping && dy <= SWIPE_UP_THRESHOLD) {
        this.jumping = false;
        this.state.jumpDown = false;
        this.state.jumpJustReleased = true;
      }
    };

    scene.input.on("pointerdown", this.onPointerDown);
    scene.input.on("pointerup", this.onPointerUp);
    scene.input.on("pointermove", this.onPointerMove);
  }

  private applyZone(x: number): void {
    if (x < ZONE_LEFT_MAX) {
      this.state.left = true;
      this.state.right = false;
    } else if (x > ZONE_RIGHT_MIN) {
      this.state.left = false;
      this.state.right = true;
    } else {
      this.state.left = false;
      this.state.right = false;
    }
  }

  public resetFrameState(): void {
    this.state.jumpJustPressed = false;
    this.state.jumpJustReleased = false;
    this.state.fireJustPressed = false;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public destroy(): void {
    if (!this.enabled) return;
    this.scene.input.off("pointerdown", this.onPointerDown);
    this.scene.input.off("pointerup", this.onPointerUp);
    this.scene.input.off("pointermove", this.onPointerMove);
  }
}
