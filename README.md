# NetPulse — Network Diagnostics PWA

A premium **Android-first Progressive Web App** for real-time network speed testing and diagnostics. No sign-up, no authentication — just install and test.

![NetPulse](https://img.shields.io/badge/PWA-Ready-teal?style=for-the-badge)
![Android](https://img.shields.io/badge/Android-First-green?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## ✨ Features

| Feature | Details |
|---|---|
| **Speed Test** | Download & upload measurement with live gauge |
| **Latency** | Ping, jitter, and packet loss via real HTTP probes |
| **Diagnostics** | 6-check network health suite with scored results |
| **History** | Local storage of up to 50 test results with chart |
| **Connection Info** | Wi-Fi vs Cellular detection, effective type, RTT |
| **Offline Ready** | Service Worker caches the full app shell |
| **Installable** | Full PWA manifest — Add to Home Screen on Android |
| **No Auth** | Zero sign-up, zero tracking, zero ads |

---

## 🚀 Quick Start

### Option 1 — GitHub Pages (recommended)

1. Fork this repository
2. Go to **Settings → Pages**
3. Set source to `main` branch, root `/`
4. Visit `https://<your-username>.github.io/netpulse/`
5. On Android Chrome: tap **⋮ → Add to Home screen**

### Option 2 — Local Development

```bash
git clone https://github.com/<your-username>/netpulse.git
cd netpulse

# Any static server works:
npx serve .
# or
python3 -m http.server 8080
```

Open `http://localhost:8080` in Chrome (Android or desktop).

---

## 📱 Installing on Android

1. Open the app URL in **Chrome for Android**
2. Tap the **⋮ menu → Add to Home screen**
3. Or wait for the install banner to appear automatically
4. The app runs fullscreen in standalone mode

---

## 🏗️ Project Structure

```
netpulse/
├── index.html          # App shell & all pages
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker (offline support)
├── css/
│   └── style.css       # Full premium UI (dark theme)
├── js/
│   ├── app.js          # Main controller
│   ├── speedtest.js    # Speed test engine (real + fallback)
│   ├── network.js      # Connection info detection
│   ├── gauge.js        # Canvas semi-circle speedometer
│   ├── diagnostics.js  # 6-point network health checks
│   ├── history-chart.js# Canvas line chart
│   └── storage.js      # LocalStorage wrapper
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## 🔬 How Speed Tests Work

NetPulse uses a layered approach for maximum accuracy:

1. **Download**: Streams data from `speed.cloudflare.com` or `httpbin.org` and measures bytes received per second
2. **Upload**: POSTs 1MB chunks to `httpbin.org/post` and times throughput
3. **Ping**: Fires 8 parallel `no-cors` fetches to Cloudflare/Google and averages RTT
4. **Packet Loss**: Sends 10 concurrent requests and counts failures
5. **Fallback**: Uses the browser's `Network Information API` (`navigator.connection`) when direct measurement is blocked by CORS

---

## 🎨 Design System

- **Palette**: Deep navy bg `#080d1a` · Teal accent `#00f5d4` · Purple accent `#7b2ff7`
- **Typography**: Rajdhani (display) · Space Mono (numbers) · DM Sans (body)
- **Animations**: Pulse rings · Animated gauge needle · Spark bars · Fade-up entrances
- **Layout**: Bottom navigation · Safe area insets · 60fps canvas rendering

---

## 🗂️ Data & Privacy

- All test results are stored **locally** in `localStorage` — nothing leaves your device
- No analytics, no telemetry, no cookies
- Clear history anytime from the Settings page
- Disable local storage entirely in Settings if preferred

---

## 🛠️ Deploying to GitHub Pages

```bash
# In your repo settings:
# Settings → Pages → Source: Deploy from branch → main → / (root)
# GitHub will serve index.html at your Pages URL
```

For a custom domain, add a `CNAME` file:
```
CNAME
```
```
netpulse.yourdomain.com
```

---

## 📄 License

MIT © 2024 — Free to use, modify, and deploy.
