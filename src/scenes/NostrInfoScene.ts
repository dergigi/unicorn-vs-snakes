import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/gameConfig";

export class NostrInfoScene extends Phaser.Scene {
  private returnTo!: string;

  constructor() {
    super("NostrInfoScene");
  }

  create(data: { returnTo?: string }): void {
    this.returnTo = data.returnTo ?? "MenuScene";

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1d1336).setOrigin(0, 0);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.35, 0x2a1040, 0.4).setOrigin(0, 0);

    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 34, "WHAT IS NOSTR?", {
      fontFamily: "\"Press Start 2P\", \"Courier New\", monospace",
      fontSize: "28px",
      color: "#ffe0f6",
      stroke: "#24133d",
      strokeThickness: 5,
    }).setOrigin(0.5);

    const panelW = 640;
    const panelX = cx - panelW / 2;
    const panelTop = 76;
    const panelH = 340;

    const bg = this.add.graphics();
    bg.fillStyle(0x2a1040, 0.5);
    bg.fillRoundedRect(panelX, panelTop, panelW, panelH, 8);

    const pad = 28;
    const textX = panelX + pad;
    const textW = panelW - pad * 2;
    let y = panelTop + 22;

    const headingStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "\"Press Start 2P\", \"Courier New\", monospace",
      fontSize: "11px",
      color: "#ff7fd9",
      stroke: "#1d1336",
      strokeThickness: 3,
    };

    const bodyStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#d8b8f0",
      stroke: "#2a1040",
      strokeThickness: 2,
      wordWrap: { width: textW },
      lineSpacing: 4,
    };

    const sections: { heading: string; body: string }[] = [
      {
        heading: "AN OPEN PROTOCOL",
        body: "Nostr is a simple, open protocol for decentralized communication. No single company or government controls it \u2014 anyone can build on it and anyone can use it.",
      },
      {
        heading: "YOUR KEYS, YOUR IDENTITY",
        body: "Your identity is a cryptographic key pair. You own it, you control it, and no one can take it away. Your posts are signed, so they can\u2019t be forged or tampered with.",
      },
      {
        heading: "WHY USE IT FOR THIS GAME",
        body: "Nostr is a fun little protocol, and this is a fun little game. I wanted to have a highscore mechanism that doesn\u2019t force people to sign up via email or via some platform, so nostr was the obvious choice.",
      },
    ];

    for (const section of sections) {
      const heading = this.add.text(textX, y, section.heading, headingStyle);
      y += heading.height + 8;

      const body = this.add.text(textX, y, section.body, bodyStyle);
      y += body.height + 20;
    }

    this.buildGetStartedButton(cx, panelTop + panelH + 24);
    this.buildBackButton(cx);
  }

  private buildGetStartedButton(cx: number, y: number): void {
    const linkStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "\"Press Start 2P\", \"Courier New\", monospace",
      fontSize: "13px",
      color: "#ff7fd9",
      stroke: "#1d1336",
      strokeThickness: 3,
    };
    const gap = 40;

    const learnMore = this.add.text(cx - gap, y, "Learn More", linkStyle).setOrigin(1, 0);
    learnMore.setInteractive({ useHandCursor: true });
    learnMore.on("pointerover", () => learnMore.setColor("#ffffff"));
    learnMore.on("pointerout", () => learnMore.setColor("#ff7fd9"));
    learnMore.on("pointerdown", () => window.open("https://njump.me/", "_blank"));

    const sep = this.add.text(cx, y, "|", {
      ...linkStyle,
      color: "#6a5a80",
    }).setOrigin(0.5, 0);

    const getStarted = this.add.text(cx + gap, y, "Get Started", linkStyle).setOrigin(0, 0);
    getStarted.setInteractive({ useHandCursor: true });
    getStarted.on("pointerover", () => getStarted.setColor("#ffffff"));
    getStarted.on("pointerout", () => getStarted.setColor("#ff7fd9"));
    getStarted.on("pointerdown", () => window.open("https://nstart.me", "_blank"));

    void sep;
  }

  private buildBackButton(cx: number): void {
    const btnY = GAME_HEIGHT - 42;
    const back = this.add.text(cx, btnY, "\u2190 Back", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#cccccc",
      stroke: "#24133d",
      strokeThickness: 4,
    }).setOrigin(0.5);

    back.setInteractive({ useHandCursor: true });
    back.on("pointerover", () => { back.setColor("#ffffff"); back.setScale(1.08); });
    back.on("pointerout", () => { back.setColor("#cccccc"); back.setScale(1); });
    back.on("pointerdown", () => this.scene.start(this.returnTo));

    this.input.keyboard?.on("keydown-ESC", () => this.scene.start(this.returnTo), this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-ESC", undefined, this);
    });
  }
}
