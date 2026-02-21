import Phaser from "phaser";
import { GAME_EVENTS } from "../config/events";

export class CollectibleSystem {
  private scene: Phaser.Scene;
  private group: Phaser.Physics.Arcade.StaticGroup;
  private collected = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.physics.add.staticGroup();
  }

  public getGroup(): Phaser.Physics.Arcade.StaticGroup {
    return this.group;
  }

  public addSparkle(x: number, y: number): void {
    const sparkle = this.group.create(x, y, "sparkle") as Phaser.Physics.Arcade.Image;
    sparkle.setScale(0.72);
    sparkle.refreshBody();
    sparkle.setData("kind", "sparkle");
  }

  public handleCollect = (
    _player:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
    collectible:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile
  ): void => {
    if ("destroy" in collectible) {
      collectible.destroy();
    }
    this.collected += 1;
    this.scene.game.events.emit(GAME_EVENTS.sparkleChanged, this.collected);
  };

  public getCollectedCount(): number {
    return this.collected;
  }
}
