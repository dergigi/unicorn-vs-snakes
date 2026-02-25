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
  totalSparkles: number;
  totalApples: number;
  totalPowerups: number;
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

    this.add.text(GAME_WIDTH - 12, GAME_HEIGHT - 10, `v${__APP_VERSION__}`, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#6a5f8a",
      stroke: "#1d1336",
      strokeThickness: 2,
    }).setOrigin(1, 1);

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
      { label: "Fastest Unicorns", action: () => this.showHighScores() },
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

    const isTouch = !!this.sys.game.device.input.touch;

    const title = this.add.text(GAME_WIDTH / 2, isTouch ? 50 : 80, "CONTROLS", {
      fontFamily: "monospace",
      fontSize: isTouch ? "34px" : "40px",
      color: "#ffffff",
      stroke: "#24133d",
      strokeThickness: 6
    }).setOrigin(0.5);
    this.viewContainer.add(title);

    const fontSize = isTouch ? "16px" : "20px";
    const strokeThick = isTouch ? 2 : 3;
    const rowH = isTouch ? 32 : 44;
    const keyX = GAME_WIDTH / 2 - 20;
    const descX = GAME_WIDTH / 2 + 20;

    const controls = [
      ["Left / Right  or  A / D", "Move"],
      ["Up Arrow  or  W", "Jump"],
      ["Hold Jump", "Jump higher"],
      ["Space", "Fireball (with mushroom)"],
      ["R", "Reset to menu"],
      ["ESC", "Pause / Unpause"]
    ];

    let startY = isTouch ? 95 : 150;

    if (isTouch) {
      const kbHeader = this.add.text(GAME_WIDTH / 2, startY - 16, "KEYBOARD", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#8a7fb0",
        stroke: "#24133d",
        strokeThickness: 2
      }).setOrigin(0.5);
      this.viewContainer.add(kbHeader);
    }

    for (let i = 0; i < controls.length; i++) {
      const [key, desc] = controls[i];
      const keyText = this.add.text(keyX, startY + i * rowH, key, {
        fontFamily: "monospace",
        fontSize: fontSize,
        color: "#ffe6a8",
        stroke: "#24133d",
        strokeThickness: strokeThick
      }).setOrigin(1, 0.5);

      const descText = this.add.text(descX, startY + i * rowH, desc, {
        fontFamily: "monospace",
        fontSize: fontSize,
        color: "#cccccc",
        stroke: "#24133d",
        strokeThickness: strokeThick
      }).setOrigin(0, 0.5);

      this.viewContainer.add([keyText, descText]);
    }

    let bottomY = startY + controls.length * rowH;

    if (isTouch) {
      const touchStartY = bottomY + 20;

      const touchHeader = this.add.text(GAME_WIDTH / 2, touchStartY, "TOUCH", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#8a7fb0",
        stroke: "#24133d",
        strokeThickness: 2
      }).setOrigin(0.5);
      this.viewContainer.add(touchHeader);

      const touchControls = [
        ["Bottom-left / right", "Move"],
        ["Tap top half", "Jump"],
        ["Swipe up", "Jump (from bottom)"],
        ["Hold jump", "Jump higher"],
        ["Bottom-middle", "Fireball"],
        ["Second finger", "Fireball (alt)"],
      ];

      const touchRowH = 28;
      const touchY = touchStartY + 18;

      for (let i = 0; i < touchControls.length; i++) {
        const [key, desc] = touchControls[i];
        const keyText = this.add.text(keyX, touchY + i * touchRowH, key, {
          fontFamily: "monospace",
          fontSize: "15px",
          color: "#a8d8ff",
          stroke: "#24133d",
          strokeThickness: 2
        }).setOrigin(1, 0.5);

        const descText = this.add.text(descX, touchY + i * touchRowH, desc, {
          fontFamily: "monospace",
          fontSize: "15px",
          color: "#cccccc",
          stroke: "#24133d",
          strokeThickness: 2
        }).setOrigin(0, 0.5);

        this.viewContainer.add([keyText, descText]);
      }

      bottomY = touchY + touchControls.length * touchRowH;
    }

    this.addBackButton(bottomY + 20);
  }

  private showCredits(): void {
    this.scene.start("CreditsScene", {
      returnTo: "PauseScene",
      pauseData: this.pauseData,
    });
  }

  private showHighScores(): void {
    this.scene.start("HighScoreScene", {
      difficulty: this.pauseData.difficulty,
      returnTo: "PauseScene",
      pauseData: this.pauseData,
    });
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
      menuTimeMs: this.pauseData.menuTimeMs,
      totalSparkles: this.pauseData.totalSparkles,
      totalApples: this.pauseData.totalApples,
      totalPowerups: this.pauseData.totalPowerups
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
