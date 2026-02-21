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
    this.load.spritesheet("hearts", "assets/sprites/hearts.png", {
      frameWidth: 512,
      frameHeight: 512
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
      20,
      20,
      [
        { x: 4, y: 0, w: 2, h: 10, c: "#fff2a8" },
        { x: 0, y: 4, w: 10, h: 2, c: "#fff2a8" },
        { x: 2, y: 2, w: 6, h: 6, c: "#fffbe8" },
        { x: 3, y: 3, w: 4, h: 4, c: "#ffffff" },
        { x: 1, y: 1, w: 1, h: 1, c: "#ffd1ff" },
        { x: 8, y: 1, w: 1, h: 1, c: "#b9f2ff" },
        { x: 1, y: 8, w: 1, h: 1, c: "#b9f2ff" },
        { x: 8, y: 8, w: 1, h: 1, c: "#ffd1ff" }
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
      "rainbow-powerup",
      24,
      24,
      [
        { x: 4, y: 1, w: 4, h: 1, c: "#ff6a6a" },
        { x: 3, y: 2, w: 6, h: 1, c: "#ffa34f" },
        { x: 2, y: 3, w: 8, h: 1, c: "#ffe36e" },
        { x: 2, y: 4, w: 8, h: 1, c: "#89f58f" },
        { x: 3, y: 5, w: 6, h: 1, c: "#74d7ff" },
        { x: 4, y: 6, w: 4, h: 1, c: "#a7a1ff" },
        { x: 5, y: 7, w: 2, h: 1, c: "#ee9bff" },
        { x: 5, y: 3, w: 2, h: 2, c: "#ffffff" },
        { x: 1, y: 8, w: 1, h: 1, c: "#fff8d8" },
        { x: 10, y: 8, w: 1, h: 1, c: "#fff8d8" }
      ]
    );
    makePixelTexture(
      this,
      "rainbow-aura",
      40,
      24,
      [
        { x: 5, y: 4, w: 10, h: 1, c: "#ff7f9f" },
        { x: 4, y: 5, w: 12, h: 1, c: "#ffb07f" },
        { x: 3, y: 6, w: 14, h: 1, c: "#ffe17f" },
        { x: 2, y: 7, w: 16, h: 1, c: "#9ff596" },
        { x: 3, y: 8, w: 14, h: 1, c: "#80e6ff" },
        { x: 4, y: 9, w: 12, h: 1, c: "#9ca0ff" },
        { x: 5, y: 10, w: 10, h: 1, c: "#e79bff" }
      ]
    );
    makePixelTexture(
      this,
      "finish-gate-open",
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
      "finish-gate-closed",
      64,
      80,
      [
        { x: 2, y: 14, w: 2, h: 24, c: "#8f6044" },
        { x: 28, y: 14, w: 2, h: 24, c: "#8f6044" },
        { x: 1, y: 12, w: 4, h: 2, c: "#b07d5b" },
        { x: 27, y: 12, w: 4, h: 2, c: "#b07d5b" },

        { x: 6, y: 14, w: 20, h: 22, c: "#6e482f" },
        { x: 7, y: 15, w: 18, h: 20, c: "#885a3b" },
        { x: 8, y: 16, w: 3, h: 18, c: "#996742" },
        { x: 13, y: 16, w: 3, h: 18, c: "#996742" },
        { x: 18, y: 16, w: 3, h: 18, c: "#996742" },
        { x: 23, y: 16, w: 2, h: 18, c: "#996742" },
        { x: 7, y: 22, w: 18, h: 2, c: "#6b432c" },
        { x: 7, y: 28, w: 18, h: 2, c: "#6b432c" },

        { x: 5, y: 9, w: 22, h: 2, c: "#6d6358" },
        { x: 7, y: 8, w: 18, h: 1, c: "#9f9485" },
        { x: 8, y: 6, w: 4, h: 1, c: "#ff7f9f" },
        { x: 12, y: 6, w: 4, h: 1, c: "#ffbc76" },
        { x: 16, y: 6, w: 4, h: 1, c: "#a5f6a6" },
        { x: 20, y: 6, w: 4, h: 1, c: "#89dcff" }
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
