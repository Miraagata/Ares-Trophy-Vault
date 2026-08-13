# Ares Trophy Vault 🏆

Ares Trophy Vault is the ultimate, secure tool for editing, managing, and injecting timestamps into PS3 `TROPUSR.DAT` files. Built with an absolute focus on safety, it features advanced anti-ban systems designed to simulate human behavior and cross-reference official PSN server shutdown dates.

## 🙏 Acknowledgements & Credits
Special thanks and huge credits to the **Trophy is Good** project and its incredible developers. Their pioneering work in reverse-engineering PS3 trophy structures, TROPUSR.DAT decryption, and hashing algorithms laid the foundation for modern trophy editing. Ares Trophy Vault builds upon the community knowledge they freely shared. Thank you to the devs of Trophy is Good!

## 🌐 Live App (Online Version)
You can access the fully functional, hosted version directly from your browser—no installation required:
🔗 **Access Ares Trophy Vault:** [https://tinyurl.com/2ymn89jp](https://tinyurl.com/2ymn89jp)

## 💾 Download Offline Version
Go to the **[Releases](../../releases/latest)** tab on this repository to download the latest offline build (`ares-trophy-vault-offline.zip`).

## 🛡️ Exclusive Anti-Ban Systems
* **Human Routine Simulator (Anti-Ban Jitter):** Automatically distributes trophies over organic time intervals. It intelligently skips user-configured overnight "sleep" hours and daytime "work" hours to create a mathematically realistic gaming timeline.
* **Closed Server Radar (Server Shutdown Guard):** Features an updated offline database containing the exact shutdown dates for dozens of PS3 multiplayer servers (e.g., MGSV, The Last of Us, GTA V). The system physically locks inputs and flashes visual alerts if you attempt to unlock an online/multiplayer trophy after the official server closure date, preventing instant PSN ban flags.
* **Cross-Region Synchronizer:** Perfectly clone timestamps from an American game version (BLUS) directly into a European version (BLES) with a single click, featuring automatic timezone offset adjustments.

## 💻 Local Development Setup
If you want to modify the source code:
1. Clone the repo: `git clone https://github.com/Miraagata/ares-trophy-vault.git`
2. Install dependencies: `npm install`
3. Run locally: `npm run dev`

---
*Disclaimer: This tool is for educational purposes and offline backup management. Use responsibly.*
