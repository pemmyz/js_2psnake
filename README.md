# js_2psnake

## Play it now: https://pemmyz.github.io/js_2psnake/

# 🐍 2-Player Snake with AI

A modern twist on the classic Snake game — now with **2-player support**, multiple **AI algorithms**, and switchable **Classic vs Modern modes**! Play solo or with a friend, or let the bots battle it out!

🎮 [Play it now on GitHub Pages](https://pemmyz.github.io/js_2psnake/)  
📁 [View the code on GitHub](https://github.com/pemmyz/js_2psnake/)

---

## 🧠 AI Algorithms

You can toggle bot mode for each player and cycle through different AI strategies:

| Key | Algorithm       | Description                                                  |
|-----|------------------|--------------------------------------------------------------|
| 0   | Random           | Picks random safe directions                                 |
| 1   | Greedy           | Moves toward food directly                                   |
| 2   | Smart Greedy     | Greedy with basic survival awareness                         |
| 3   | Defensive        | Chooses direction with most available space                  |
| 4   | A* Pathfinding   | Finds the safest path to the food using A* search + fallback |

---

## 🎮 Controls

### 🧑‍🤝‍🧑 Player 1
- **Move:** `W`, `A`, `S`, `D`
- **Toggle Bot:** Click **Bot Mode** button

### 🧑‍🤝‍🧑 Player 2
- **Move:** Arrow Keys
- **Toggle Bot:** Click **Bot Mode** button

### 🔄 Global
- **Switch AI Algorithm:** Press number keys `0–4`
- **Select Mode:** Toggle between **Classic Mode** and **Modern Mode**
- **Start Game:** Click **Start Game** button

---

## 🕹️ Modes

- **Classic Mode:** Grid-based food eating and square snake visuals  
- **Modern Mode:** Radius-based collision and tapered snake visuals

---

## 🖼️ Screenshot

![Screenshot](screenshot.png)  
*Two-player gameplay with bot mode enabled on both sides*

---

## 📦 Tech Stack

- HTML5 Canvas
- JavaScript (Vanilla)
- CSS3 (Retro-Dark UI)

---

## 🧩 Ideas for Extensions

- 🍇 Add fruit variety and scoring bonuses  
- 🧠 Implement neural network training for bot learning  
- 💥 Add power-ups, hazards, or snake combat modes  
- 🌐 Online multiplayer via WebSocket

---

## 📜 License

MIT License.  
Feel free to use, remix, and build on this project.

---

## 🙌 Acknowledgments

Designed and developed by [Pemmyz](https://github.com/pemmyz)  
Inspired by classic Snake games and AI experimentation 🧠🐍
