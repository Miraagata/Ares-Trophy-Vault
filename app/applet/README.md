# Ares Trophy Vault 🏆

Ares Trophy Vault is the ultimate, secure tool for editing, managing, and injecting timestamps into PS3 `TROPUSR.DAT` files. Built with absolute focus on safety, it features advanced anti-ban systems designed to simulate human behavior and cross-reference official PSN server shutdown dates.

## 🌐 Live App (Online Version)

You can access the fully functional, hosted version directly from your browser—no installation required:

🔗 **Access Ares Trophy Vault:** [https://tinyurl.com/2ymn89jp](https://tinyurl.com/2ymn89jp)

---

## 💻 Local Setup (Offline Version)

To run Ares Trophy Vault completely offline on your local machine (ideal for privacy and handling sensitive `TROPUSR.DAT` files locally), follow these steps:

### Prerequisites
Before you begin, ensure you have the following installed on your computer:
- [Node.js](https://nodejs.org/) (Version 18.0.0 or higher)
- [Git](https://git-scm.com/)

### Installation & Running

1. **Clone the repository:**
   Open your terminal or command prompt and run:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ares-trophy-vault.git
   cd ares-trophy-vault
   ```

2. **Install dependencies:**
   Install all the required packages using npm:
   ```bash
   npm install
   ```

3. **Start the development server:**
   Launch the local server:
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Once the server starts, it will display a local URL in your terminal (usually `http://localhost:5173` or `http://localhost:3000`). Open that link in your web browser to use the app offline.

---

## 🛡️ Exclusive Anti-Ban Systems

* **Human Routine Simulator (Anti-Ban Jitter):** Automatically distributes trophies over organic time intervals. It intelligently skips user-configured overnight "sleep" hours and daytime "work" hours to create a mathematically realistic gaming timeline.
* **Closed Server Radar (Server Shutdown Guard):** Features an updated offline database containing the exact shutdown dates for dozens of PS3 multiplayer servers (e.g., MGSV, The Last of Us, GTA V). The system physically locks inputs and flashes visual alerts if you attempt to unlock an online/multiplayer trophy after the official server closure date, preventing instant PSN ban flags.
* **Cross-Region Synchronizer:** Perfectly clone timestamps from an American game version (BLUS) directly into a European version (BLES) with a single click, featuring automatic timezone offset adjustments.

## 🛠️ Tech Stack
* React 18
* TypeScript
* Vite
* Tailwind CSS
* Lucide Icons
