import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/gameConfig";

const CREDITS = [
  ["Unicorn sprite", "magdum", "CC-BY-SA 3.0"],
  ["A Cat (idle sprite)", "Elthen", "CC0"],
  ["Chestnut Trees", "Yar / AntumDeluge", "CC-BY 3.0"],
  ["Gnarled Tree", "geloescht", "CC-BY 3.0"],
  ["LPC Tree Recolors", "C. Nilsson", "CC-BY 3.0"],
  ["Krook Tree", "FunwithPixels", "CC-BY 3.0"],
  ["Bat Sprite", "bagzie", "CC-BY-SA 3.0"],
  ["Pixel Torch", "PixelMist", "CC0"],
  ["Little Witch", "ansimuz", "CC0"],
  ["Large Mushroom", "Digiflower", "CC0"],
  ["Mold Brick Wall", "TexturePalace", "CC-BY 4.0"],
  ["Castle Tower", "Eikester", "CC0"],
  ["Ice Sparkles", "AntumDeluge", "CC-BY 3.0"],
  ["Castle Background", "vnitti", "CC-BY 3.0"],
];

interface CreditsData {
  returnTo: string;
  pauseData?: Record<string, unknown>;
}

export class CreditsScene extends Phaser.Scene {
  private returnTo!: string;
  private pauseData?: Record<string, unknown>;

  constructor() {
    super("CreditsScene");
  }

  create(data: CreditsData): void {
    this.returnTo = data.returnTo ?? "MenuScene";
    this.pauseData = data.pauseData;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1d1336).setOrigin(0, 0);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.35, 0x2a1040, 0.4).setOrigin(0, 0);

    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 36, "CREDITS", {
      fontFamily: "\"Press Start 2P\", \"Courier New\", monospace",
      fontSize: "28px",
      color: "#ffe0f6",
      stroke: "#24133d",
      strokeThickness: 5,
    }).setOrigin(0.5);

    const subtitle = this.add.text(cx, 68, "All assets from OpenGameArt.org", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#a89cc8",
      stroke: "#24133d",
      strokeThickness: 2,
    }).setOrigin(0.5);
    subtitle.setInteractive({ useHandCursor: true });
    subtitle.on("pointerover", () => subtitle.setColor("#ffffff"));
    subtitle.on("pointerout", () => subtitle.setColor("#a89cc8"));
    subtitle.on("pointerdown", () => window.open("https://opengameart.org", "_blank"));

    this.buildTable();
    this.buildCloseButton();
  }

  private buildTable(): void {
    const startY = 96;
    const rowH = 30;
    const nameX = 60;
    const authorX = 520;
    const licenseX = 780;

    const headerStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#8a7fb0",
      stroke: "#24133d",
      strokeThickness: 2,
    };
    this.add.text(nameX, startY, "Asset", headerStyle).setOrigin(0, 0.5);
    this.add.text(authorX, startY, "Author", headerStyle).setOrigin(0, 0.5);
    this.add.text(licenseX, startY, "License", headerStyle).setOrigin(0, 0.5);

    for (let i = 0; i < CREDITS.length; i++) {
      const [asset, author, license] = CREDITS[i];
      const y = startY + 22 + i * rowH;

      this.add.text(nameX, y, asset, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffe6a8",
        stroke: "#24133d",
        strokeThickness: 2,
      }).setOrigin(0, 0.5);

      this.add.text(authorX, y, author, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#cccccc",
        stroke: "#24133d",
        strokeThickness: 2,
      }).setOrigin(0, 0.5);

      this.add.text(licenseX, y, license, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#9bdfb8",
        stroke: "#24133d",
        strokeThickness: 2,
      }).setOrigin(0, 0.5);
    }
  }

  private buildCloseButton(): void {
    const close = this.add.text(GAME_WIDTH - 16, 16, "\u2715", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#8a7fb0",
      stroke: "#1d1336",
      strokeThickness: 3,
    }).setOrigin(1, 0);

    close.setInteractive({ useHandCursor: true });
    close.on("pointerover", () => close.setColor("#ffffff"));
    close.on("pointerout", () => close.setColor("#8a7fb0"));
    close.on("pointerdown", () => this.goBack());

    this.input.keyboard?.on("keydown-ESC", () => this.goBack(), this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-ESC", undefined, this);
    });
  }

  private goBack(): void {
    if (this.returnTo === "PauseScene" && this.pauseData) {
      this.scene.start("PauseScene", this.pauseData);
    } else {
      this.scene.start("MenuScene");
    }
  }
}
