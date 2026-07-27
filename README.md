<h1 align="center">🌤️ SkyView Weather</h1>
<p align="center">
  <em>Premium weather forecasts, interactive maps, air quality, and severe weather alerts — all wrapped in a stunning glassmorphism UI.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/github/license/skyview24/skyview24.github.io?style=flat-square&color=blue" alt="License MIT">
  <img src="https://img.shields.io/badge/vanilla-JS-yellow?style=flat-square&logo=javascript" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/API-OpenWeather-orange?style=flat-square" alt="OpenWeather API">
  <img src="https://img.shields.io/badge/maps-OpenStreetMap-green?style=flat-square" alt="OpenStreetMap">
  <img src="https://img.shields.io/badge/PWA-ready-brightgreen?style=flat-square&logo=pwa" alt="PWA Ready">
</p>

<p align="center">
  <a href="https://skyview24.github.io/">🚀 Live Demo</a> •
  <a href="#-key-features">✨ Features</a> •
  <a href="#-getting-started">🛠️ Setup</a> •
  <a href="#-deployment">📦 Deployment</a> •
  <a href="#-credits">💙 Credits</a>
</p>

---

## 📸 Preview

<p align="center">
  <img src="Hero_Dark.png" alt="Preview 1" width="100%">
  <img src="Hero_Light.png" alt="Preview 1" width="100%">
  <img src="Page_Dark.png" alt="Preview 2" width="50%">
  <img src="Page_Light.png" alt="Preview 3" width="50%">
</p>

---

## 🎯 Key Features

- **Real‑time weather** — current conditions, feels like, hi/low, humidity, pressure, visibility, wind, UV index, dew point, cloud coverage.
- **Hourly & 7‑day forecasts** — detailed temperature trends and precipitation probability.
- **Air Quality Index** — PM2.5, PM10, CO, NO₂, O₃, SO₂ with color‑coded AQI circles.
- **Interactive weather map** — Leaflet + OpenStreetMap with tile overlays for temperature, rain, wind, clouds, and pressure.
- **Location detection** — GPS geolocation, city/region/country search with autocomplete, click‑on‑map weather, save favorites, recent history.
- **Weather visual effects** — animated rain, snow, fog, lightning that react to current conditions.
- **Animated UI** — glassmorphism cards, floating icons, smooth transitions, gradient aurora backgrounds that shift with time.
- **Dark / Light / Auto theme** — adapts to system preference; manual toggle.
- **Accessible & responsive** — works on all screens, keyboard navigable, ARIA labels, reduced motion support.
- **PWA installable** — can be added to home screen on mobile and desktop.
- **Offline support** — service worker caches essential assets for offline access.

---

## 🚀 Getting Started

### Prerequisites
- A modern web browser
- A free [OpenWeather API key](https://openweathermap.org/api)
- (Optional) A local static server like `npx serve` for development

### 🔑 API Key Setup
1. Sign up at [OpenWeather](https://openweathermap.org/) and obtain a free API key.
2. **For local testing:**  
   - Open `script.js` and replace `__OPENWEATHER_API_KEY__` with your actual key.  
   - **Do not commit this change!**
3. **For production (GitHub Pages):**  
   - Add your API key as a **GitHub Secret** (see [Deployment](#-deployment)).
   - The key is automatically injected during deployment and never stored in the repository.

### 💻 Local Development
```bash
# Clone the repository
git clone https://github.com/skyview24/skyview24.github.io.git
cd skyview24.github.io

# Install a simple static server (if you don't have one)
npm install -g serve

# Run locally
serve .
