<div align="center">

# 🏋️ ZippyFit

### The fitness game you play with a partner.

*Work out together and keep your streak alive — miss a day and you __both__ feel it.*

<br/>

![Expo](https://img.shields.io/badge/Expo-54-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Convex](https://img.shields.io/badge/Convex-DB-EE342F?style=for-the-badge&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi&logoColor=white)

</div>

---

## ✨ What is ZippyFit?

ZippyFit turns accountability into a co-op game. You and a partner form a **Duo** and take on a **daily challenge** together. Stay consistent to grow your **streak** — slack off and your team loses **hearts**. It's Duolingo's streak psychology, pointed at the gym.

<div align="center">
<img src="docs/screenshots/dashboard.png" width="250" alt="Journey map with Zippy the mascot"/>
&nbsp;&nbsp;&nbsp;
<img src="docs/screenshots/nudge.png" width="250" alt="Nudge your partner"/>
&nbsp;&nbsp;&nbsp;
<img src="docs/screenshots/grimoire.png" width="250" alt="The Grimoire — unlocked fitness facts"/>
</div>

---

## 🎮 Features

- 👯 **Duo teams** — pair up with a 4-character invite code
- 🔥 **Streaks & hearts** — shared accountability; if one partner misses, you both lose a heart
- 🗺️ **Journey map** — a visual day-by-day path of your team's progress
- 📜 **Grimoire** — unlock a "Scroll Fragment" of fitness wisdom on every workout
- 👋 **Nudge & Spot** — poke your partner or request a spot when you can't make it
- 🔐 **Auth built in** — email/password via Convex Auth, with real-time sync

---

## 🧱 Tech Stack

| Layer | Tech |
|-------|------|
| **Mobile** | React Native · Expo Router · Reanimated · Moti |
| **Realtime DB** | Convex (live queries + auth) |
| **Backend API** | FastAPI · Uvicorn (Python) |
| **Local tunnel** | ngrok → port 8000 |

---

## 🚀 Getting Started

> 🖥️ **Runs fully local right now** — Expo Go + a local FastAPI backend (tunnelled via ngrok) + a Convex dev deployment. Next up: native builds and tester distribution via **Fastlane** and **Firebase App Distribution**.

```bash
# 1. Install dependencies (mobile + backend)
make install

# 2. Run the full stack (ngrok + backend + Convex + Expo)
make dev
```

Then scan the QR code with **Expo Go**, or press `a` / `i` to launch an emulator.

### Essential commands

| Command | What it does |
|---------|--------------|
| `make dev` | Run the full stack (tunnel + backend + mobile) |
| `make test` | Run mobile tests |
| `make kill` | Kill dev processes & free ports |
| `make help` | See every command (grouped menu) |

Run **`make help`** for the full list — admin/utility commands (screenshots, password reset, etc.) live there.

---

## 📁 Project Structure

```
zippy-fit/
├── mobile/              # React Native / Expo app
│   ├── app/             # Expo Router routes (index, _layout)
│   ├── screens/         # Dashboard, Auth, Tutorial
│   ├── components/      # UI: ProfileModal, DuoButton, Container…
│   └── convex/          # Schema + serverless functions (teams, workouts, dashboard, admin…)
├── backend/             # FastAPI service
├── scripts/utils/       # Dev tooling — screenshot, reset_password, check_user, assign_team
├── docs/screenshots/    # Images used in this README
└── Makefile             # Categorized command centre (run `make help`)
```

---

## 🗺️ Roadmap

- [ ] **Fastlane** — automated build & release pipeline
- [ ] **Firebase App Distribution** — ship test builds to testers
- [ ] **Push notifications** — nudges & streak-at-risk reminders
- [ ] **Forgot-password flow** — in-app reset (Convex Auth email provider)
- [ ] **Grimoire content** — replace placeholder facts with a curated library
- [ ] **Refresher polish** — show only educational slides when replaying from settings
- [ ] **Workout types** — log cardio / strength / mobility with distinct damage
- [ ] **Partner profiles & avatars**
- [ ] **Test coverage** — expand TDD suite across screens and Convex functions
- [ ] **CI** — lint + typecheck + tests on every PR

---

## 🎨 Credits

Zippy's animated mascot GIFs were generated with [ComfyUI](https://github.com/comfyanonymous/ComfyUI).

---

<div align="center">

Built with ❤️ and a refusal to skip leg day.

</div>
