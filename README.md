# N-Ball v2.2 - Authentic Engine Reconstruction & Android Port

A faithful, zero-improvisation 1:1 reconstruction of the 2005 classic physics platformer **N-Ball** by **Matteo Guarnieri (Ragdollsoft)**.

---

## Repository Structure

- **`nball_android/`**: Complete HTML5 Canvas + Capacitor mobile app with 40 authentic levels, retro grid background, `plat.png` platforms, 3D `ball.png` spheres, autojump, and touch controls.
- **`nball_bmx/`**: Authentic BlitzMax source code (`nball.bmx`) reproducing the game in its mother language for desktop and BlitzMax NG Android targets.
- **`nball_native/`**: Pure C++17 / SDL2 / OpenGL ES 2.0 native engine (`main.cpp` + `CMakeLists.txt`) designed for bare-metal performance and Android NDK.
- **`.github/workflows/`**: GitHub Actions workflows to automatically compile the Android `.apk` and native binaries in the cloud.

---

## Automated Cloud Builds (GitHub Actions)

Pushing to this repository automatically triggers `.github/workflows/build-android-apk.yml`, producing a ready-to-install `NBall-Android-v2.2-Debug.apk` under the **Actions > Artifacts** tab.
