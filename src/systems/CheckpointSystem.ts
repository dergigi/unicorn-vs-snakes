import Phaser from "phaser";
import { GAME_EVENTS } from "../config/events";

type SpawnPoint = { x: number; y: number };

export class CheckpointSystem {
  private scene: Phaser.Scene;
  private checkpoints: Phaser.Physics.Arcade.StaticGroup;
  private activeSpawn: SpawnPoint;

  constructor(scene: Phaser.Scene, initialSpawn: SpawnPoint) {
    this.scene = scene;
    this.checkpoints = scene.physics.add.staticGroup();
    this.activeSpawn = initialSpawn;
  }

  public getGroup(): Phaser.Physics.Arcade.StaticGroup {
    return this.checkpoints;
  }

  public addCheckpoint(x: number, y: number): void {
    const checkpoint = this.checkpoints.create(x, y, "checkpoint");
    checkpoint.setScale(1.35);
    checkpoint.refreshBody();
    checkpoint.setData("used", false);
  }

  public handleCheckpoint = (
    _player:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
    checkpoint:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile
  ): void => {
    if (!("getData" in checkpoint) || !("setData" in checkpoint)) {
      return;
    }
    const cp = checkpoint as Phaser.Physics.Arcade.Sprite;
    if (cp.getData("used")) {
      return;
    }
    cp.setData("used", true);
    cp.setTint(0xfff59a);
    this.activeSpawn = {
      x: cp.x,
      y: cp.y + 4
    };
    this.scene.game.events.emit(GAME_EVENTS.checkpointReached, this.activeSpawn);
  };

  public getActiveSpawn(): SpawnPoint {
    return this.activeSpawn;
  }
}
