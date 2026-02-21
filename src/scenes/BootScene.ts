import Phaser from "phaser";

type Pixel = { x: number; y: number; w?: number; h?: number; c: string };

function makePixelTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  pixels: Pixel[],
  pixelSize = 2
): void {
  const graphics = scene.make.graphics();
  graphics.fillStyle(0x000000, 0);
  graphics.fillRect(0, 0, width, height);
  for (const pixel of pixels) {
    const color = Phaser.Display.Color.HexStringToColor(pixel.c).color;
    graphics.fillStyle(color, 1);
    graphics.fillRect(
      pixel.x * pixelSize,
      pixel.y * pixelSize,
      (pixel.w ?? 1) * pixelSize,
      (pixel.h ?? 1) * pixelSize
    );
  }
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.json("level-1", "levels/level1.json");
    this.load.spritesheet("unicorn", "assets/sprites/unicorn.png", {
      frameWidth: 16,
      frameHeight: 16,
      spacing: 1
    });
  }

  create(): void {
    makePixelTexture(
      this,
      "snake-1",
      32,
      32,
      [
        { x: 2, y: 11, w: 12, h: 3, c: "#6fdc7f" },
        { x: 10, y: 9, w: 4, h: 2, c: "#9cf79f" },
        { x: 13, y: 10, w: 1, h: 1, c: "#222222" }
      ]
    );
    makePixelTexture(
      this,
      "snake-2",
      32,
      32,
      [
        { x: 2, y: 11, w: 12, h: 3, c: "#6fdc7f" },
        { x: 9, y: 9, w: 4, h: 2, c: "#9cf79f" },
        { x: 13, y: 10, w: 1, h: 1, c: "#222222" }
      ]
    );

    makePixelTexture(
      this,
      "sparkle",
      16,
      16,
      [
        { x: 3, y: 1, w: 2, h: 6, c: "#fff1aa" },
        { x: 1, y: 3, w: 6, h: 2, c: "#fff1aa" },
        { x: 2, y: 2, w: 4, h: 4, c: "#fffbe0" }
      ]
    );
    makePixelTexture(
      this,
      "checkpoint",
      18,
      28,
      [
        { x: 1, y: 2, w: 1, h: 10, c: "#9b6f4b" },
        { x: 2, y: 2, w: 5, h: 4, c: "#ff8fd3" },
        { x: 3, y: 3, w: 3, h: 2, c: "#ffc2ea" }
      ]
    );
    makePixelTexture(
      this,
      "heart-full",
      16,
      14,
      [
        { x: 2, y: 1, w: 2, h: 2, c: "#ff6ea9" },
        { x: 4, y: 1, w: 2, h: 2, c: "#ff6ea9" },
        { x: 1, y: 3, w: 6, h: 2, c: "#ff6ea9" },
        { x: 2, y: 5, w: 4, h: 1, c: "#ff6ea9" },
        { x: 3, y: 6, w: 2, h: 1, c: "#ff6ea9" },
        { x: 2, y: 2, w: 1, h: 1, c: "#ffc2df" }
      ]
    );
    makePixelTexture(
      this,
      "heart-empty",
      16,
      14,
      [
        { x: 2, y: 1, w: 2, h: 2, c: "#9d86b8" },
        { x: 4, y: 1, w: 2, h: 2, c: "#9d86b8" },
        { x: 1, y: 3, w: 6, h: 2, c: "#9d86b8" },
        { x: 2, y: 5, w: 4, h: 1, c: "#9d86b8" },
        { x: 3, y: 6, w: 2, h: 1, c: "#9d86b8" }
      ]
    );
    makePixelTexture(
      this,
      "finish-gate",
      64,
      80,
      [
        { x: 2, y: 14, w: 2, h: 24, c: "#b98a67" },
        { x: 28, y: 14, w: 2, h: 24, c: "#b98a67" },
        { x: 1, y: 12, w: 4, h: 2, c: "#d4a786" },
        { x: 27, y: 12, w: 4, h: 2, c: "#d4a786" },

        { x: 3, y: 12, w: 26, h: 2, c: "#ff4b5e" },
        { x: 2, y: 10, w: 28, h: 2, c: "#ff8a3d" },
        { x: 2, y: 8, w: 28, h: 2, c: "#ffd95e" },
        { x: 3, y: 6, w: 26, h: 2, c: "#7de86f" },
        { x: 4, y: 4, w: 24, h: 2, c: "#66d8ff" },
        { x: 6, y: 2, w: 20, h: 2, c: "#6f8dff" },
        { x: 9, y: 0, w: 14, h: 2, c: "#d98cff" },

        { x: 6, y: 16, w: 20, h: 20, c: "#ffffff" },
        { x: 7, y: 17, w: 18, h: 18, c: "#eefbff" },
        { x: 10, y: 36, w: 5, h: 2, c: "#ffd95e" },
        { x: 16, y: 36, w: 5, h: 2, c: "#7de86f" }
      ]
    );
    makePixelTexture(
      this,
      "ground",
      48,
      24,
      [
        { x: 0, y: 0, w: 24, h: 3, c: "#a18fff" },
        { x: 0, y: 3, w: 24, h: 9, c: "#6650bf" },
        { x: 0, y: 12, w: 24, h: 1, c: "#4f3ca8" }
      ],
      2
    );

    this.scene.start("MenuScene");
  }
}
