import type { EventTemplate } from "applesauce-core/helpers/event";
import type { EventBlueprint } from "applesauce-core/event-factory";
import type { Difficulty } from "../config/gameConfig";
import { NOSTR_KIND, NOSTR_GAME_TAG, NOSTR_SCORE_VERSION } from "../config/gameConfig";

export interface ScoreData {
  difficulty: Difficulty;
  sparkles: number;
  apples: number;
  powerups: number;
  levelTimes: number[];
  menuTimeMs: number;
  totalMs: number;
  percent100: boolean;
  cheated: boolean;
}

export function ScoreBlueprint(data: ScoreData): EventBlueprint<EventTemplate> {
  return async () => {
    const content = JSON.stringify({
      sparkles: data.sparkles,
      apples: data.apples,
      powerups: data.powerups,
      levelTimes: data.levelTimes,
      menuTimeMs: data.menuTimeMs,
      totalMs: data.totalMs,
      percent100: data.percent100,
      cheated: data.cheated,
      version: NOSTR_SCORE_VERSION,
    });

    const tags: string[][] = [
      ["d", NOSTR_GAME_TAG],
      ["difficulty", data.difficulty],
      ["time", String(data.totalMs)],
      ["t", NOSTR_GAME_TAG],
      ["t", "gaming"],
      ["version", String(NOSTR_SCORE_VERSION)],
    ];
    if (data.cheated) {
      tags.push(["cheated", "true"]);
    }

    return {
      kind: NOSTR_KIND,
      created_at: Math.floor(Date.now() / 1000),
      content,
      tags,
    };
  };
}
