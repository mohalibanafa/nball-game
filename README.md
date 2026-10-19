# 🎮 N-Ball v2.2 (Modern Web & Android Port)

[![Build & Release Android APK](https://github.com/mohalibanafa/nball-game/actions/workflows/build-android.yml/badge.svg)](https://github.com/mohalibanafa/nball-game/actions/workflows/build-android.yml)
[![Release](https://img.shields.io/github/v/release/mohalibanafa/nball-game?color=success&label=Official%20Release)](https://github.com/mohalibanafa/nball-game/releases)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Web-blue.svg)](https://github.com/mohalibanafa/nball-game)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **إعادة بناء وهندسة عكسية دقيقة للعبة الفيزياء الكلاسيكية الشهيرة N-Ball v2.2** بتقنيات الويب الحديثة (HTML5 Canvas + Web Audio API) مع تغليف أصيل لنظام أندرويد عبر **Capacitor 7** وتوليد تلقائي لحزم الـ APK عبر **GitHub Actions Releases**.

---

## 🌟 مميزات اللعبة | Key Features

### 1. ⚙️ محرك فيزياء أصيل وعالي الدقة (Authentic Physics Engine)
- **معدل زمني ثابت 63.0 FPS (Fixed Timestep):** محاكاة فيزيائية دقيقة مطابقة تماماً لمحرك اللعبة الأصلي، مفصولة عن تردد الشاشة (Hz) لضمان سلوك متطابق على جميع الأجهزة.
- **تكامل فيرليت واستعادة الشد (Verlet Integration & Angular Spring Tension):** محاكاة مرنة للأجسام المطاطية والهياكل المعلقة (مثل جسر الكاتيناري والمجسمات المعلقة) تحافظ على شكلها الهندسي دون أن تنهار.
- **تأثير وزخم واقعي للكرة (Heavy Impact & Momentum Transfer):** وزن وتأثير صلب للكرة عند الاصطدام بالمجسمات والعربات والمنصات غير المثبتة مع الحفاظ التام على سرعة السقوط الحرة وتسارع الحركة.
- **استيقاظ المجسمات التفاعلية (Active Viewport Culling):** تفعيل المجسمات والعربات عندما تقترب كاميرا اللاعب منها، مما يمنع سقوطها المسبق قبل وصول اللاعب.

### 2. 📱 تجربة أندرويد متكاملة بشاشة كاملة (Immersive Fullscreen Mobile)
- **شاشة كاملة غامرة (Sticky Immersive Mode):** إخفاء شريط الإشعارات وشريط التنقل بالكامل لتجربة لعب سلسة وبدون أي حواف سوداء مزعجة.
- **توجيه أفقي تلقائي (`sensorLandscape`):** تشغيل اللعبة بالوضع العرضي المريح للعين واليدين.
- **تحكم متطور باللمس المتعدد (Responsive Multi-touch Controls):** أزرار لمس مريحة للإبهامين (يسار/يمين والقفز) تدعم الضغط المتزامن بدون أي تضارب أو تأخير.

### 3. 🎵 صوتيات فورية وموسيقى تصويرية أصلية (Zero-Latency Audio)
- **موسيقى مستمرة وحلقية (Seamless Soundtrack):** تعمل الموسيقى الأصلية (`1.ogg`) تلقائياً في الخلفية.
- **صوت قفز فوري (0ms Latency):** معالجة مسبقة للمؤثرات الصوتية عبر **Web Audio API** (`AudioBuffer`) لتفادي التأخير الشائع في متصفحات الهواتف.

### 4. 🗺️ جميع المراحل الأربعين الأصلية (All 40 Official Levels)
- يتضمن المشروع بيانات الحملات الأربعة كاملة (Campaigns 1 to 4) بكل تفاصيلها وتحدياتها وألغازها الفيزيائية.

---

## 📲 تحميل تطبيق الأندرويد (Download Android APK)

يمكنك تنزيل أحدث إصدار من اللعبة مباشرة وتثبيته على هاتفك الأندرويد:
👉 **[تنزيل N-Ball APK من صفحة الـ Releases](https://github.com/mohalibanafa/nball-game/releases)**

---

## 🕹️ أزرار التحكم | Controls

| الزر (Desktop) | شاشة اللمس (Mobile) | الوظيفة |
| :--- | :--- | :--- |
| `◀` / `A` | زر السهم الأيسر | دحرجة الكرة لليسار |
| `▶` / `D` | زر السهم الأيمن | دحرجة الكرة لليمين |
| `Space` / `W` | زر `JUMP` | القفز (استمر بالضغط لقفزة أعلى) |
| `F` | تلقائي في تطبيق الأندرويد | ملء الشاشة (Fullscreen) |
| `Escape` | زر `ESC` | القائمة الرئيسية / إيقاف مؤقت |

---

## 🚀 التشغيل والتطوير المحلي | Local Development

### 1. تشغيل نسخة الويب محلياً وعلى الشبكة:
```bash
# تثبيت الاعتمادات
npm install

# تشغيل خادم اللعبة المحلي
node server.js
```
سيظهر لك رابطان في التيرمينال:
- **محلياً على الحاسوب:** `http://localhost:8080/`
- **على الهاتف (عبر Wi-Fi):** `http://<LAN_IP>:8080/`

### 2. مزامنة وبناء تطبيق الأندرويد محلياً:
```bash
# مزامنة ملفات الويب مع مشروع الأندرويد
npx cap sync android

# بناء حزمة الأندرويد (Release APK)
cd android
./gradlew assembleRelease
```
ستجد ملف الـ APK الناتج في:
`android/app/build/outputs/apk/release/app-release.apk`

---

## 🏗️ هيكلية المشروع | Project Structure

```
nball-game/
├── .github/
│   └── workflows/
│       └── build-android.yml    # خط أنابيب البناء التلقائي وإصدار الـ Releases
├── android/                     # مشروع Android Studio الأصلي المولد عبر Capacitor
│   └── app/src/main/
│       ├── AndroidManifest.xml  # إعدادات الشاشة الكاملة والاتجاه الأفقي
│       └── java/.../MainActivity.java # كود الشاشة الغامرة (Immersive Mode)
├── www/                         # ملفات الويب الخاصة باللعبة
│   ├── index.html               # المحرك الرئيسي ورسوميات Canvas
│   ├── levels_data.js           # بيانات المراحل الأربعين الأصلية
│   └── media/                   # الخطوط والمؤثرات الصوتية والموسيقى
├── capacitor.config.json        # إعدادات تطبيق Capacitor
├── package.json                 # حزم المشروع والاعتمادات
├── server.js                    # خادم محلي خفيف لبث اللعبة على الشبكة
└── README.md                    # دليل المشروع
```

---

## 📜 الترخيص | License

هذا المشروع مفتوح المصدر ومتاح تحت ترخيص [MIT License](LICENSE).
جميع الأصول الصوتية والتصميمية الأصلية تعود لمالكيها الأصليين ومحفوظة حقوقها.
