# N-Ball (Android Port & Recreation)

An authentic recreation and Android port of the 2005 classic physics platformer **N-Ball** by Matteo Guarnieri (Ragdollsoft), reconstructed through binary reverse engineering of the original Windows BlitzMax release.

---

## Features

- **Verlet Ragdoll Physics Engine**: Authentic recreation of the original BlitzMax physics with distance constraints, angular tensions, ball-to-ball collisions, and smooth rolling on platform links.
- **Complete Campaign Roster**: All **40 levels** from Campaigns 1, 2, 3, and 4 parsed directly from original game assets.
- **Faithful Audiovisuals**:
  - Original textures (`ball.png`, `plat.png`, `spark.png`, `nball.png`, `205275.png`).
  - Original sounds (`jump.wav`) and background music (`1.ogg`).
  - Original font typography (`zekton__.ttf`).
- **Mobile-First Android Touch Controls**:
  - Virtual left/right rolling buttons with multi-touch support.
  - Large responsive **JUMP** button supporting **Auto-jump** (hold jump to leap immediately upon touching any surface).
  - Quick HUD buttons for Restart, Pause, and Fullscreen toggle.
- **Desktop Keyboard Support**:
  - `Arrow Left` / `A`: Move Left
  - `Arrow Right` / `D`: Move Right
  - `Space` / `Arrow Up` / `W`: Jump (Hold for auto-jump)
  - `P`: Pause
  - `R`: Restart Level

---

## Quick Start (Play in Browser / Test on Phone)

To start the local testing server:

```powershell
cd nball_android
node serve.js
```

1. **On your PC**: Open [http://localhost:8080](http://localhost:8080) in Chrome/Edge/Firefox.
2. **On your Android phone**: Connect to the same Wi-Fi network and open the mobile URL displayed in the console (e.g., `http://192.168.x.x:8080`).

---

## Installing Directly on Android (PWA Mode)

1. Open the game in Chrome on your Android device.
2. Tap the three dots menu (**⋮**) in Chrome.
3. Tap **"Install app"** or **"Add to Home screen"**.
4. The game will install as a standalone full-screen Android app with the official N-Ball icon and offline support!

---

## Building a Native Android APK (Capacitor)

If you wish to produce a compiled `.apk`:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Add the Android platform:
   ```bash
   npx cap add android
   ```
3. Sync assets:
   ```bash
   npx cap sync android
   ```
4. Open the project in Android Studio:
   ```bash
   npx cap open android
   ```
5. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)** in Android Studio.
