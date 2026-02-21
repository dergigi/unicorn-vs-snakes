import Phaser from "phaser";

const RAINBOW_COLORS = [0xff6fa7, 0xffbf6a, 0xfff07a, 0x8ff59f, 0x7ad9ff, 0xba9bff];

export function spawnRainbowTrail(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tailDirection: number,
  depth: number
): void {
  for (let i = 0; i < 4; i += 1) {
    const px = x + Phaser.Math.Between(-2, 2);
    const py = y + Phaser.Math.Between(-3, 3);
    const sparkle = scene.add
      .rectangle(px, py, Phaser.Math.Between(3, 5), Phaser.Math.Between(3, 5))
      .setFillStyle(RAINBOW_COLORS[Phaser.Math.Between(0, RAINBOW_COLORS.length - 1)], 1)
      .setDepth(depth)
      .setAlpha(0.95);

    scene.tweens.add({
      targets: sparkle,
      x: px + tailDirection * Phaser.Math.Between(20, 34),
      y: py + Phaser.Math.Between(-12, 14),
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      angle: Phaser.Math.Between(-70, 70),
      duration: Phaser.Math.Between(240, 380),
      ease: "Sine.easeOut",
      onComplete: () => sparkle.destroy()
    });
  }
}
