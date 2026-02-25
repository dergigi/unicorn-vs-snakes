import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PHYSICS_GRAVITY_Y } from "./config/gameConfig";
import { BootScene } from "./scenes/BootScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { GameScene } from "./scenes/GameScene";
import { MenuScene } from "./scenes/MenuScene";
import { UIScene } from "./scenes/UIScene";
import { PauseScene } from "./scenes/PauseScene";
import { WinScene } from "./scenes/WinScene";
import { HighScoreScene } from "./scenes/HighScoreScene";
import { NostrInfoScene } from "./scenes/NostrInfoScene";
import { CreditsScene } from "./scenes/CreditsScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "app",
  backgroundColor: "#1d1336",
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: PHYSICS_GRAVITY_Y },
      debug: false
    }
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, PauseScene, GameOverScene, WinScene, HighScoreScene, NostrInfoScene, CreditsScene]
};

new Phaser.Game(config);
