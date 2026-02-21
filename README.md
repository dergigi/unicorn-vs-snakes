# Unicorns vs Snakes

Kid-friendly pixel sidescroller built with Phaser 3 + TypeScript.

## Local development

```bash
npm install
npm run dev
```

Open the URL from Vite in your browser.

## Build for sharing

```bash
npm run build
npm run preview
```

The production files are generated in `dist/`. You can host that folder on:

- GitHub Pages
- Netlify
- Vercel
- Any static file host

## Gameplay goals

- Move with arrow keys
- Jump with space or ArrowUp
- Collect at least 14 sparkles
- Avoid snakes and keep hearts above zero
- Reach the rainbow gate to win

## Credits

- Unicorn sprite: "Running unicorn" by magdum (CC-BY-SA 3.0) from OpenGameArt: [https://opengameart.org/content/running-unicorn-0](https://opengameart.org/content/running-unicorn-0)
- Forest tree sprites: "Chestnut Trees (Yar's Tree Rework)" (CC-BY 3.0) by Yar (rework page by AntumDeluge) from OpenGameArt: [https://opengameart.org/content/chestnut-trees-yars-tree-rework](https://opengameart.org/content/chestnut-trees-yars-tree-rework)
- Forest tree variants: currently using transparent-compatible sets from "Gnarled Tree" by geloescht (CC-BY 3.0), "[LPC] Tree Recolors" (credit C. Nilsson for original trees), and "Krook Tree" by FunwithPixels. Additional downloaded variants include "A Tree" by airockstar (CC0) and "Old oak tree" by Julius. Full license/source notes are in `public/assets/sprites/trees/sources.md`.
