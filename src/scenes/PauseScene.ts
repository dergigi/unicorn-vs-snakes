import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, type Difficulty } from "../config/gameConfig";

interface PauseData {
  maxLives: number;
  difficulty: Difficulty;
  levelNumber: number;
  currentLives: number;
  hasRainbow: boolean;
  levelTimes: number[];
  menuTimeMs: number;
}

type PauseView = "menu" | "controls" | "credits";

export class PauseScene extends Phaser.Scene {
  private pauseData!: PauseData;
  private currentView: PauseView = "menu";
  private viewContainer!: Phaser.GameObjects.Container;

  constructor() {
    super("PauseScene");
  }

  create(data: PauseData): void {
    this.pauseData = data;
    this.currentView = "menu";

    this.scene.pause("GameScene");
    this.scene.pause("UIScene");

    this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.6
    );

    this.viewContainer = this.add.container(0, 0);
    this.showMenu();

    this.input.keyboard?.on("keydown-ESC", this.handleEsc, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-ESC", this.handleEsc, this);
    });
  }

  private handleEsc(): void {
    if (this.currentView !== "menu") {
      this.showMenu();
    } else {
      this.resumeGame();
    }
  }

  private clearView(): void {
    this.viewContainer.removeAll(true);
  }

  private addBackButton(y: number): void {
    const back = this.add.text(GAME_WIDTH / 2, y, "← Back", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#cccccc",
      stroke: "#24133d",
      strokeThickness: 4
    }).setOrigin(0.5);

    back.setInteractive({ useHandCursor: true });
    back.on("pointerover", () => { back.setColor("#ffffff"); back.setScale(1.08); });
    back.on("pointerout", () => { back.setColor("#cccccc"); back.setScale(1); });
    back.on("pointerdown", () => this.showMenu());
    this.viewContainer.add(back);
  }

  private showMenu(): void {
    this.clearView();
    this.currentView = "menu";

    const title = this.add.text(GAME_WIDTH / 2, 110, "PAUSED", {
      fontFamily: "monospace",
      fontSize: "48px",
      color: "#ffffff",
      stroke: "#24133d",
      strokeThickness: 6
    }).setOrigin(0.5);
    this.viewContainer.add(title);

    const items: { label: string; action: () => void }[] = [
      { label: "Resume", action: () => this.resumeGame() },
      { label: "Restart Level", action: () => this.restartLevel() },
      { label: "Controls", action: () => this.showControls() },
      { label: "Credits", action: () => this.showCredits() },
      { label: "Quit to Menu", action: () => this.quitToMenu() }
    ];

    const startY = 200;
    const spacing = 46;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const text = this.add.text(GAME_WIDTH / 2, startY + i * spacing, item.label, {
        fontFamily: "monospace",
        fontSize: "26px",
        color: "#cccccc",
        stroke: "#24133d",
        strokeThickness: 4
      }).setOrigin(0.5);

      text.setInteractive({ useHandCursor: true });
      text.on("pointerover", () => { text.setColor("#ffffff"); text.setScale(1.08); });
      text.on("pointerout", () => { text.setColor("#cccccc"); text.setScale(1); });
      text.on("pointerdown", item.action);
      this.viewContainer.add(text);
    }
  }

  private showControls(): void {
    this.clearView();
    this.currentView = "controls";

    const title = this.add.text(GAME_WIDTH / 2, 80, "CONTROLS", {
      fontFamily: "monospace",
      fontSize: "40px",
      color: "#ffffff",
      stroke: "#24133d",
      strokeThickness: 6
    }).setOrigin(0.5);
    this.viewContainer.add(title);

    const controls = [
      ["Left / Right  or  A / D", "Move"],
      ["Up Arrow  or  W", "Jump"],
      ["Hold Jump", "Jump higher"],
      ["Space", "Shoot fireball (with mushroom)"],
      ["R", "Reset to menu"],
      ["ESC", "Pause / Unpause"]
    ];

    const startY = 150;
    const rowH = 44;
    const keyX = GAME_WIDTH / 2 - 20;
    const descX = GAME_WIDTH / 2 + 20;

    for (let i = 0; i < controls.length; i++) {
      const [key, desc] = controls[i];
      const keyText = this.add.text(keyX, startY + i * rowH, key, {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffe6a8",
        stroke: "#24133d",
        strokeThickness: 3
      }).setOrigin(1, 0.5);

      const descText = this.add.text(descX, startY + i * rowH, desc, {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#cccccc",
        stroke: "#24133d",
        strokeThickness: 3
      }).setOrigin(0, 0.5);

      this.viewContainer.add([keyText, descText]);
    }

    this.addBackButton(startY + controls.length * rowH + 40);
  }

  private showCredits(): void {
    this.clearView();
    this.currentView = "credits";

    const title = this.add.text(GAME_WIDTH / 2, 36, "CREDITS", {
      fontFamily: "monospace",
      fontSize: "36px",
      color: "#ffffff",
      stroke: "#24133d",
      strokeThickness: 6
    }).setOrigin(0.5);
    this.viewContainer.add(title);

    const subtitle = this.add.text(GAME_WIDTH / 2, 68, "All assets from OpenGameArt.org", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#a89cc8",
      stroke: "#24133d",
      strokeThickness: 2
    }).setOrigin(0.5);
    this.viewContainer.add(subtitle);

    const credits = [
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
      strokeThickness: 2
    };
    const hAsset = this.add.text(nameX, startY, "Asset", headerStyle).setOrigin(0, 0.5);
    const hAuthor = this.add.text(authorX, startY, "Author", headerStyle).setOrigin(0, 0.5);
    const hLicense = this.add.text(licenseX, startY, "License", headerStyle).setOrigin(0, 0.5);
    this.viewContainer.add([hAsset, hAuthor, hLicense]);

    for (let i = 0; i < credits.length; i++) {
      const [asset, author, license] = credits[i];
      const y = startY + 22 + i * rowH;

      const assetText = this.add.text(nameX, y, asset, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffe6a8",
        stroke: "#24133d",
        strokeThickness: 2
      }).setOrigin(0, 0.5);

      const authorText = this.add.text(authorX, y, author, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#cccccc",
        stroke: "#24133d",
        strokeThickness: 2
      }).setOrigin(0, 0.5);

      const licenseText = this.add.text(licenseX, y, license, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#9bdfb8",
        stroke: "#24133d",
        strokeThickness: 2
      }).setOrigin(0, 0.5);

      this.viewContainer.add([assetText, authorText, licenseText]);
    }

    this.addBackButton(startY + 22 + credits.length * rowH + 20);
  }

  private resumeGame(): void {
    this.scene.resume("GameScene");
    this.scene.resume("UIScene");
    this.scene.stop();
  }

  private restartLevel(): void {
    this.scene.stop("UIScene");
    const gameScene = this.scene.get("GameScene");
    gameScene.scene.restart({
      maxLives: this.pauseData.maxLives,
      difficulty: this.pauseData.difficulty,
      levelNumber: this.pauseData.levelNumber,
      levelTimes: this.pauseData.levelTimes,
      menuTimeMs: this.pauseData.menuTimeMs
    });
    this.scene.stop();
    gameScene.scene.launch("UIScene", {
      maxLives: this.pauseData.maxLives,
      levelNumber: this.pauseData.levelNumber
    });
  }

  private quitToMenu(): void {
    this.scene.stop("UIScene");
    this.scene.stop("GameScene");
    this.scene.start("MenuScene");
  }
}
