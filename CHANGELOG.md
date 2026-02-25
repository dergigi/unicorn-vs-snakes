# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.4] - 2026-02-26

### Added

- Help icon next to "Login with Nostr" linking to nstart.me
- Crown icon button to open high scores from menu
- Clickable version string linking to GitHub tags page
- Hashtag icon linking to ants.sh thread
- "What is Nostr?" info screen with Learn More and Get Started links
- Magnifying glass icon linking to ants.sh kind:5555 search

### Changed

- Always show "Login with Nostr" regardless of extension presence
- Show "Extension required" message when no Nostr extension is detected
- Extract credits into standalone CreditsScene
- Rename "Fastest Unicorns" to "Highscores" in pause menu
- Shorten footer credit to "Sprites via OpenGameArt" with clickable link
- Move hashtag icon next to loupe in top-left of high score screen

### Fixed

- Calculate icon positions after setText so width is correct
- Always show crown and help icons even without Nostr extension
- Ensure crown icon is re-shown after extension required message

## [1.3.3] - 2026-02-22

### Added

- Dedicated high score screen with combined leaderboard
- Clickable player names that open Nostr profiles via njump.me

### Fixed

- Use correct njump.me domain for Nostr profile links

## [1.3.2] - 2026-02-22

### Added

- OpenGraph and Twitter Card meta tags for link previews

## [1.3.1] - 2026-02-22

### Added

- Post kind:1 note via share button on win screen
- Auto-publish kind:5555 score event on win

## [1.3.0] - 2026-02-22

### Added

- Nostr login with NIP-07 browser extension support
- Post game scores as Nostr kind:5555 events
- Leaderboard on win screen showing top runs per difficulty
- Best-time teaser on menu screen with record holder's name
- Nostr profile name resolution for leaderboard entries
- #UvS hashtag in social share text and Nostr event tags
- Primal relay added to relay list

### Changed

- Track cheat code usage in Nostr score events
- Bump score event version to 2
- Use idiomatic RxJS for relay subscriptions
- DRY up difficulty labels and npub truncation

### Fixed

- Clear stale bestTimeLabel reference on MenuScene re-entry
- Rewrite score fetching to use standard tag filters and robust subscription
- Display "insane-o" instead of "insane" in leaderboard labels
- Deduplicate relay events by ID
- Handle relay errors gracefully in score and profile fetching
- Include legacy tag in score filter for backward compatibility

## [1.2.6] - 2026-02-22

### Fixed

- Replace pause emoji with ASCII text for mobile font compatibility

## [1.2.5] - 2026-02-22

### Fixed

- Move mobile pause button to top-right corner to avoid touch zone conflict

## [1.2.4] - 2026-02-22

### Added

- Show version number on menu screen footer

## [1.2.3] - 2026-02-22

### Fixed

- Use fullscreen display mode in PWA manifest for true fullscreen on Android

## [1.2.2] - 2026-02-22

### Added

- Pause button for mobile touch devices

## [1.2.1] - 2026-02-22

### Added

- Top-half jump zone and bottom-middle fireball zone for touch controls
- Touch controls help overlay

## [1.2.0] - 2026-02-22

### Added

- PWA support for installable fullscreen mobile app

## [1.1.1] - 2026-02-22

### Changed

- Replace tap-to-jump with swipe-up gesture for mobile controls
- Show version in pause menu

## [1.1.0] - 2026-02-22

### Added

- Mobile touch controls with on-screen zones
- Responsive scaling for different screen sizes

### Fixed

- Double coordinate transform in touch zone detection

## [1.0.0] - 2026-02-22

### Added

- Four playable levels: Forest, Lava, Castle, and Witch Boss
- Unicorn player with double-jump, hold-sensitive jump height, and gallop animation
- WASD and arrow key controls; Space key for fireballs
- Rainbow powerup with sparkle trail, 5% speed boost, and shield
- Sparkle collectibles with per-level gate requirements (12/16/21)
- Difficulty system: Easy, Normal, Hard, and INSANE-O with heart presets
- Story cat NPC with dialog and witch backstory in Forest level
- Friendly critter patrol encounters in Forest level
- Apple pickups that restore one heart
- Checkpoint flag system across all levels
- Speedrun timer with per-level and total time tracking
- Interactive menu screen with walkable unicorn and rainbow gate
- Difficulty selection by jumping into buttons on menu
- Patrolling snakes on menu footer with grass strip
- Win screen with sparkle overlay, stats, and shareable brag text
- Copy-to-clipboard button for share text with confirmation feedback
- "100%" indicator when all collectibles gathered
- Game over screen with animated snakes and 10-second auto-retry timer
- Credits screen accessible from pause menu
- Pause menu on ESC key
- Forest level with puddle pits, tree stumps, rolling hills, and sky relighting
- Lava level with moving flame enemies on ground and platforms
- Castle level with bats, torches, moving platforms, and dense snake pit
- Witch boss fight with bat spawns, mushroom fireball pickups, and health bar
- Rainbow gate opening animation with visual sky brightening
- Cheat codes for level skipping and screen jumping
- Press R during gameplay to reset to splash screen
- Separate Phaser chunk for better caching

[1.3.4]: https://github.com/dergigi/unicorns-vs-snakes/compare/v1.3.3...v1.3.4
[1.3.3]: https://github.com/dergigi/unicorns-vs-snakes/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/dergigi/unicorns-vs-snakes/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/dergigi/unicorns-vs-snakes/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/dergigi/unicorns-vs-snakes/compare/v1.2.6...v1.3.0
[1.2.6]: https://github.com/dergigi/unicorns-vs-snakes/compare/v1.2.5...v1.2.6
[1.2.5]: https://github.com/dergigi/unicorns-vs-snakes/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/dergigi/unicorns-vs-snakes/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/dergigi/unicorns-vs-snakes/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/dergigi/unicorns-vs-snakes/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/dergigi/unicorns-vs-snakes/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/dergigi/unicorns-vs-snakes/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/dergigi/unicorns-vs-snakes/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/dergigi/unicorns-vs-snakes/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/dergigi/unicorns-vs-snakes/releases/tag/v1.0.0
