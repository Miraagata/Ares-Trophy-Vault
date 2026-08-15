# Ares Trophy Vault 🏆

Ares Trophy Vault is a robust utility designed to parse, modify, and manage PlayStation 3 `TROPUSR.DAT` trophy files. It provides an interface for adjusting trophy timestamps and synchronizing lists across different regions, while incorporating strict safety constraints based on known server statuses.

## 🌟 Features

*   **TROPUSR.DAT Parsing & Editing**: Read, modify, and resign raw PlayStation 3 trophy data natively.
*   **Human Routine Simulator (Anti-Ban Jitter)**: Distributes trophy unlock timestamps across plausible human timeframes. Automatically skips user-configured overnight "sleep" hours and daytime "work" hours to ensure mathematically realistic gaming timelines.
*   **Server Status Validation**: Offline database cross-referencing. Prevents unlocking online-only trophies for games whose official servers have been shut down (e.g., *Metal Gear Solid V*, *The Last of Us*, *GTA V*), preventing obvious ban flags.
*   **Cross-Region Synchronization**: Clone trophy timestamps from one TitleID (e.g., BLUS) to another (e.g., BLES) with automated timezone offsets.

## 🤝 Acknowledgements

This project builds upon the foundational reverse-engineering work done by the **Trophy is Good** team. Huge thanks to their developers for decrypting the PS3 trophy structures, reverse-engineering the hashing algorithms, and openly sharing their findings with the community. Ares Trophy Vault wouldn't exist without their pioneering efforts.

## 🌐 Live Application

Access the application directly via your browser. All processing is done locally within your browser/session.

🔗 **[Launch Ares Trophy Vault Online](https://tinyurl.com/2ymn89jp)**

## 💻 Local Setup & Build Instructions

If you prefer to run the tool locally or contribute to the source code:

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   Git

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Miraagata/ares-trophy-vault.git
   cd ares-trophy-vault
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## ⚠️ Disclaimer
This software is provided for educational and backup purposes only. Modifying console data may violate Terms of Service agreements. Use at your own risk. The developers assume no liability for account suspensions or bans resulting from the use of this tool.
