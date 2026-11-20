# Virtual Dreidel

A browser-based multiplayer dreidel game for family and friends.

## Current milestone: 3D visual prototype

This repository contains the first real Babylon.js scene:

- Interactive 3D walnut tabletop with procedural wood grain and brass inlay
- Four-sided dreidel model with Hebrew letters (נ ג ה ש)
- Camera orbit and zoom
- Lighting, shadows, materials and a spin animation
- Local demo turns, bets, coin pot and game activity

The current version is a **single-browser prototype**. Player names and balances are local demo data. Internet multiplayer, real accounts, saved inventory, live video/audio and server-authoritative physics are planned future milestones.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## 3D asset credits\n\n- Sofa 01 — Kirill Sannikov, Poly Haven, CC0: https://polyhaven.com/a/Sofa_01\n- Arm Chair 01 — Kirill Sannikov, Poly Haven, CC0: https://polyhaven.com/a/ArmChair_01\n\nThese models are loaded as 1K glTF assets from Poly Haven. If the CDN is unavailable, the original procedural furniture remains visible as a fallback.\n\n## Technology

- Babylon.js 8
- Vite 6
- Vanilla JavaScript and CSS for this first milestone

React, multiplayer services, persistence and live video will be introduced when the 3D foundation is working well.
