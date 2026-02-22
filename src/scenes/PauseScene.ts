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

type PauseView = "menu" | "controls";

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
    if (this.currentView === "controls") {
      this.showMenu();
    } else {
      this.resumeGame();
    }
  }

  private clearView(): void {
    this.viewContainer.removeAll(true);
  }

  private showMenu(): void {
    this.clearView();
    this.currentView = "menu";

    const title = this.add.text(GAME_WIDTH / 2, 120, "PAUSED", {
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
      { label: "Quit to Menu", action: () => this.quitToMenu() }
    ];

    const startY = 220;
    const spacing = 52;

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

    const back = this.add.text(GAME_WIDTH / 2, startY + controls.length * rowH + 40, "← Back", {
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
