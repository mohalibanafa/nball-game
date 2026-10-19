# N-Ball v2.2 (Modern Web & Android Port)

An authentic, high-fidelity recreation of the classic physics puzzle-platformer **N-Ball v2.2**, built with modern Web standards, HTML5 Canvas, Web Audio API, and packaged for Android using **Capacitor**.

## Features

- **Accurate Physics Engine**: Fixed 63.0 FPS physics timestep, authentic BlitzMax Verlet integration, velocity damping, and spring tension relaxation.
- **Edge-to-Edge Responsive Widescreen**: Dynamically adapts to modern widescreen displays (16:9, 19.5:9, 20:9) with full-viewport canvas and camera tracking.
- **Full Android Mobile Support**:
  - Immersive full-screen landscape mode.
  - Responsive multi-touch controls (D-Pad Left/Right, Jump, Menu/ESC) tailored for thumb comfort.
  - Native Android APK build automated via GitHub Actions.
- **Authentic Soundtrack & Sound Effects**:
  - Original background music track (`1.ogg`) streaming with seamless looping.
  - Ultra-low latency jump sound powered by Web Audio API buffer synthesis.
- **All 40 Official Levels**: Complete campaign data across all 4 campaigns (10 levels each) with dynamic platforms, interactive ragdolls, and physics obstacles.

## Playing the Game

### In the Browser
1. Run the local server:
   ```bash
   node server.js
   ```
2. Open in your browser:
   - Local: `http://localhost:8080/`
   - Mobile on Wi-Fi: `http://<LAN_IP>:8080/`

### Controls
- **Desktop**:
  - `Left Arrow` / `A`: Roll Left
  - `Right Arrow` / `D`: Roll Right
  - `Space` / `W`: Jump (Hold to jump higher)
  - `F`: Toggle Fullscreen
  - `Escape`: Pause / Menu
- **Mobile / Touch**:
  - On-screen touch buttons automatically appear on touch devices or via `?touch=1`.

## Building the Android APK

This repository includes automated CI via GitHub Actions (`.github/workflows/build-android.yml`) that builds the debug APK automatically on every push to `main`.

To build locally:
```bash
npm install
npx cap sync android
cd android
./gradlew assembleDebug
```
The resulting APK is located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

## License
MIT
