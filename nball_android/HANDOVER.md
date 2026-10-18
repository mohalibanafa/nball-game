# N-Ball (Android Port) - Complete Reverse Engineering & Handover Documentation

This document provides a comprehensive technical overview and handover guide for the **N-Ball** reverse engineering and Android porting project. It is intended for the incoming developer/engineer taking over the codebase.

---

## 1. Project Background & Objective

- **Original Game**: *N-Ball* (v2.2, 2005–2008) by Matteo Guarnieri (*Ragdollsoft*).
- **Original Platform**: Windows 32-bit (x86), written in **BlitzMax** utilizing DirectX 7 / OpenGL and OpenAL / DirectSound.
- **Project Goal**: Fully reverse engineer the original game binary (`N-Ball v2.2.exe`) and level datasets (`nball.zip`), extract the exact mathematical formulas, physics constants, controls, and scoring logic, and build a 1:1 faithful, zero-improvisation port for Android.
- **Repository Location**: `C:\Users\banaf\OneDrive\Desktop\game\nball_android`

---

## 2. Tools & Environment Setup

### 2.1 Tooling Configured
1. **Node.js LTS (v24.20.0)**: Installed via `winget` to support CLI tools, package scripts, and HTTP range streaming.
2. **REA (`rea-agents` v6.7.0)**:
   - Configured MCP Server registered in Antigravity (`~/.gemini/config/mcp_config.json`) and Gemini CLI (`~/.gemini/settings.json`).
   - 207 deep analysis and reverse-engineering tools integrated.
3. **Capstone.js (`@alexaltea/capstone-js`)**:
   - WebAssembly port of the Capstone x86 disassembler, installed in `nball_android/node_modules` to inspect machine instructions and verify function control flows directly from JavaScript scripts.

---

## 3. Binary Reverse Engineering & Decompilation Findings

### 3.1 Executable Characteristics
- **Binary**: `N-Ball v2.2.exe` (1,118,208 bytes, SHA256: `b7fee4ad5517b24ba66d6fbc6cb9855ced4ebdf63a839c9ad66aff72ccb94f84`).
- **Format**: 32-bit PE (`0x014c` machine x86, optional header PE32).
- **Key Sections**:
  - `.text` (`0x401000` - `0x48130c`): BlitzMax standard runtime modules (`brl.*`, `pub.*`, garbage collector, graphics drivers).
  - `code` (`0x482000` - `0x4bf386`, file offset `0x80800`): **Game source code compiled to native x86 machine instructions**.
  - `data` (`0x4d0000` - `0x4f060c`, file offset `0xcce00`): **Game globals, double-precision float constants, and debug reflection symbols**.

### 3.2 Reflection & Type System Extraction
BlitzMax embeds complete type information, class names, field offsets, and method signatures in the `data` section (`0xe8500` - `0xe9f00`). Through inspection, the core types were mapped:

```mermaid
classDiagram
    class game {
        +firstball : ball
        +balljump : int
        +totalscore : int
        +levelscore : int
        +timebonus : int
        +cycles : int
        +lives : int
        +level : int
        +moveball1()
        +checkcollisions()
        +collisionbl(ball, link)
        +collision(ball, ball)
        +passedlevel()
        +died()
        +specialkeys()
    }
    class ball {
        +id : int
        +m : double
        +x : double
        +y : double
        +oldx : double
        +oldy : double
        +anchorx : double
        +anchory : double
        +r : double
        +anchored : int
        +rebounded : int
        +updatev()
        +reset()
        +bordercollision()
    }
    class link {
        +ball1 : ball
        +ball2 : ball
        +distance : double
        +thickness : double
        +shiftballs()
    }
    class tension {
        +ball1 : ball
        +ball2 : ball
        +ball3 : ball
        +angle : double
        +strength : double
        +partialtension()
    }
    game --> ball : controls player (id=1)
    game --> link : manages
    game --> tension : manages
    link --> ball : connects 2 balls
    tension --> ball : binds 3 balls
```

### 3.3 Exact Physics Constants Recovered from `.data`

All physical numbers were extracted directly from the double-precision table in memory:

| Parameter | Virtual Address | Hex Dump Offset | Exact Value | Purpose in Engine |
| :--- | :--- | :--- | :--- | :--- |
| **Gravity** | `0x4efb80` | `0xec980` | `0.30000001192` | Vertical acceleration applied per tick in `updatev()` |
| **Air Damping** | `0x4efcf0` | `0xecaf0` | `0.99900001287` | Velocity retention factor: `v = (pos - oldpos) * 0.999` |
| **Ground Restitution (Y)** | `0x4efcc0` | `0xecac0` | `0.80000001192` | Vertical bounce damping factor upon collision |
| **Ground Friction (X)** | `0x4efcc8` | `0xecac8` | `0.89999997615` | Horizontal slide retention on collision surfaces |
| **Move Acceleration** | `0x4ef828` | `0xec628` | `0.20000000298` | Impulse added to `ax` when holding Left or Right |
| **Jump Impulse Magnitude**| `0x4eed70` | `0xebb70` | `4.90000009536` | Impulse along surface contact normal |
| **Jump Cooldown** | `0x4b352f` | `0xb1d2f` | `-5 frames` | Frame counter lock preventing double jumps |
| **Line Normal Epsilon** | `0x4ed7a8` | `0xea5a8` | `0.00000999999` | Division-by-zero protection in segment projection |
| **Player Collision Radius**| `0x4ef820`| `0xec620` | `20.0` | Radius of Ball 1 (Player) |
| **Starting Lives** | Line 1 of levels | — | `2` | Number of attempts before Game Over |
| **Cycle Window (Score)** | `0x4efaf0` | `0xec8f0` | `7200 frames` | 2 minutes at 60 Hz used for Time Bonus |

### 3.4 Key Decompiled Functions

1. **`updatev()` (VA `0x4be573`)**:
   - For every dynamic ball:
     $$v_x = (x - \text{old}_x) \times 0.999$$
     $$v_y = (y - \text{old}_y) \times 0.999$$
     $$\text{old}_x = x, \quad \text{old}_y = y$$
     $$x = x + v_x + a_x, \quad y = y + v_y + a_y + 0.30$$
   - When rebounding off boundaries:
     $$v_y = -v_y \times 0.80, \quad v_x = v_x \times 0.90, \quad \text{rebounded} = 1$$

2. **`moveball1()` & `collisionbl()` (VA `0x4ba88b` - `0x4ba9ac`, `0x4b3488` - `0x4b364a`)**:
   - Left Key (`37`): $a_x \leftarrow a_x - 0.20$
   - Right Key (`39`): $a_x \leftarrow a_x + 0.20$
   - Jump Key (`32`): Can only jump if touching a surface (`balljump >= 0`). When active:
     - Impulses along contact normal:
       $$\text{old}_x = x - n_x \times 4.90 \times 0.6$$
       $$\text{old}_y = y - n_y \times 4.90 \times 2.75$$
     - Dynamic Platform Reaction (Newton's 3rd Law):
       $$\text{Endpoint}_1.\text{old}_y \leftarrow \text{Endpoint}_1.\text{old}_y + 4.90 \times (1 - t) \times 0.5$$
       $$\text{Endpoint}_2.\text{old}_y \leftarrow \text{Endpoint}_2.\text{old}_y + 4.90 \times t \times 0.5$$
     - Sets `balljump = -5` (cooldown).

3. **`passedlevel()` (VA `0x4bc2e7` - `0x4bc358`)**:
   - Exact scoring formula:
     $$\text{Base Score} = \text{Level} \times 1000$$
     $$\text{Time Bonus} = \max\left(0, \left\lfloor \frac{(\text{Level} \times 1000) \times (7200 - \text{cycles})}{7200} \right\rfloor\right)$$
     $$\text{Level Score} = \text{Base Score} + \text{Time Bonus}$$
     $$\text{Total Score} \leftarrow \text{Total Score} + \text{Level Score}$$

---

## 4. Level File Architecture

The game has **40 levels** organized across 4 campaigns (`campaigns/1/1..10` through `campaigns/4/1..10`). All levels are clean text files with 4 primitives:

1. **`New Ball` (14 lines)**:
   - Line 1: `id` (integer)
   - Line 2: `mass` (float, default 1.0)
   - Line 3: `x` (float)
   - Line 4: `y` (float)
   - Line 5: `radius` (float)
   - Line 6: `pinned` (0 = dynamic, 1 = static)
   - Lines 7 & 8: `anchorx`, `anchory` (**Crucial finding**: these are editor anchors, *not* initial velocity; velocity starts at rest `oldx = x, oldy = y`)
   - Line 9: `rmult` (elasticity multiplier)
   - Lines 10–12: `r, g, b` (0–255)
   - Line 13: `type` (`normal`, `damaging`, `background`, `stop`, `nan`)
   - Line 14: `flags` (0 or 1)
2. **`New Link` (8 lines)**:
   - Lines 1–2: `b1, b2` (connected ball IDs)
   - Line 3: `target_length` (float)
   - Line 4: `thickness` (float)
   - Lines 5–7: `r, g, b`
   - Line 8: `type` (`normal`, `stop`, `background`, `damaging`)
3. **`New Tension` (5 lines)**:
   - Lines 1–3: `b1, b2, b3` (angular spring where `b2` is hinge vertex)
   - Line 4: `target_angle` (degrees)
   - Line 5: `stiffness` (float)
4. **`New Virtual Link` (2 lines)**:
   - Lines 1–2: `b1, b2` (collision exclusion pair)

All 40 levels were pre-parsed into [levels.json](file:///C:/Users/banaf/OneDrive/Desktop/game/nball_android/levels.json) and [levels.js](file:///C:/Users/banaf/OneDrive/Desktop/game/nball_android/js/levels.js) (`window.NBALL_LEVELS`) to avoid asynchronous fetch delays on Android WebViews.

---

## 5. Android Port Architecture

The ported project is fully implemented inside `nball_android/`:

```
nball_android/
├── index.html               # Mobile viewport, responsive canvas, touch HUD, UI screens
├── style.css                # Mobile styling, touch clusters, neon aesthetic, animations
├── manifest.json            # PWA Web Manifest (fullscreen, landscape, custom icon)
├── capacitor.config.json    # Capacitor configuration for Android Studio / Gradle
├── package.json             # NPM project descriptors and build scripts
├── serve.js                 # Standalone Node.js server with HTTP Range streaming
├── levels.json              # Structured JSON dataset of all 40 campaigns/levels
├── media/                   # Clean original assets
│   ├── ball.png             # Player ball texture (350x350)
│   ├── plat.png             # Platform texture (500x250)
│   ├── spark.png            # Particle spark texture (64x64)
│   ├── nball.png            # Logo (350x350)
│   ├── 205275.png           # Background tile texture (205x275)
│   ├── jump.wav             # Jump audio effect
│   ├── 1.ogg                # Main looping soundtrack
│   └── zekton__.ttf         # Original typography font
└── js/                      # Modular game engine
    ├── levels.js            # Global bundle of levels (NBALL_LEVELS)
    ├── physics.js           # Exact Verlet solver with 1:1 decompiled formulas
    ├── audio.js             # Web Audio API zero-latency SFX & music stream
    ├── particles.js         # Spark emission system using spark.png
    ├── renderer.js          # Smooth camera follow, trail effects, sprite tinting
    ├── input.js             # Multi-touch virtual controls + keyboard fallbacks
    └── game.js              # State machine, 60Hz loop, lives, scoring, campaigns
```

### 5.1 Controls Implemented
- **Touch / Mobile**:
  - Bottom-Left Cluster: **◀** and **▶** buttons (rolling torque / impulse).
  - Bottom-Right Cluster: Large **JUMP** button supporting **Auto-jump** (hold jump to leap immediately upon touching any surface).
  - Top HUD: Quick **Restart** (🔄), **Pause** (⏸), and **Fullscreen** (⛶) buttons.
- **Keyboard / Desktop**:
  - `Left` / `A`: Roll Left
  - `Right` / `D`: Roll Right
  - `Space` / `Up` / `W`: Jump (holding space autojumps)
  - `P`: Pause
  - `R`: Restart Level

---

## 6. How to Run, Test, and Build

### 6.1 Running the Local Test Server
From PowerShell / Terminal:
```powershell
cd C:\Users\banaf\OneDrive\Desktop\game\nball_android
node serve.js
```
- Open [http://localhost:8080](http://localhost:8080) in your browser.
- Open the printed IP address (e.g., `http://192.168.x.x:8080`) on an Android phone connected to the same Wi-Fi.

### 6.2 Testing on Android as a Standalone App (PWA)
1. Navigate to the game URL in Chrome on an Android phone.
2. Tap the three dots menu (**⋮**) > **Install app** or **Add to Home screen**.
3. The game launches in immersive fullscreen landscape mode with the official app icon and offline support.

### 6.3 Building a Native Android APK (Capacitor)
If you wish to compile an `.apk` file:
```powershell
cd C:\Users\banaf\OneDrive\Desktop\game\nball_android
npm install
npx cap add android
npx cap sync android
npx cap open android
```
This opens the project in Android Studio. Select **Build > Build Bundle(s) / APK(s) > Build APK(s)** to generate the release/debug `.apk`.

---

## 7. Next Steps & Recommendations for the Incoming Developer

1. **Touch Ergonomics Tuning**:
   - The virtual button sizes and paddings in `style.css` are configured for standard landscape phones. If testing on large tablets, you may want to scale the cluster padding slightly.
2. **Haptic Feedback (Implemented)**:
   - `navigator.vibrate` is integrated in `js/game.js` for jump impulses (`15ms`) and player hazards/death (`[40ms, 30ms, 40ms]`), giving native tactile mobile feedback.
3. **Google Play Store Asset Preparation**:
   - Generate standard adaptive icons (1024x1024) and splash screens if publishing directly to the Play Store via Android Studio.
