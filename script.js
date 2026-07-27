// ============================================================
// SKYVIEW WEATHER — PREMIUM WEATHER APPLICATION
// ============================================================
// Developed by Bilal Ahmed Bahij
// Weather data from OpenWeather (openweathermap.org)
// Map data from OpenStreetMap (openstreetmap.org)
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // CONFIGURATION
    // ============================================================
    const CONFIG = {
        API_KEY: 'd8f348e30b91f4bc0cf0603dd063ac3b',
        API_BASE: 'https://api.openweathermap.org',
        GEO_BASE: 'https://api.openweathermap.org/geo/1.0',
        CACHE_DURATION: 10 * 60 * 1000,
        DEBOUNCE_DELAY: 350,
        MAX_RECENT: 8,
        MAX_FAVORITES: 10,
    };

    // ============================================================
    // APPLICATION STATE
    // ============================================================
    const state = {
        currentWeather: null,
        forecast: null,
        airPollution: null,
        hourlyData: [],
        dailyData: [],
        locationCoords: { lat: null, lon: null },
        locationName: '',
        locationDetails: '',
        unit: 'metric',
        theme: 'auto',
        favorites: [],
        recentSearches: [],
        isLoading: false,
        mapInstance: null,
        mapMarker: null,
        weatherLayer: null,
        activeMapLayer: 'temp_new',
        tempRange: null,
        aqiData: null,
    };

    // ============================================================
    // DOM REFERENCES
    // ============================================================
    const DOM = {
        searchInput: document.getElementById('searchInput'),
        searchBtn: document.getElementById('searchBtn'),
        suggestionsList: document.getElementById('suggestionsList'),
        gpsBtn: document.getElementById('gpsBtn'),
        favBtn: document.getElementById('favBtn'),
        favBadge: document.getElementById('favBadge'),
        themeBtn: document.getElementById('themeBtn'),
        themeIcon: document.getElementById('themeIcon'),
        unitBtn: document.getElementById('unitBtn'),
        refreshBtn: document.getElementById('refreshBtn'),
        locationName: document.getElementById('locationName'),
        locationDetails: document.getElementById('locationDetails'),
        currentTemp: document.getElementById('currentTemp'),
        conditionText: document.getElementById('conditionText'),
        feelsLike: document.getElementById('feelsLike'),
        hiLo: document.getElementById('hiLo'),
        weatherIconLarge: document.getElementById('weatherIconLarge'),
        sunTimes: document.getElementById('sunTimes'),
        detailsGrid: document.getElementById('detailsGrid'),
        hourlyStrip: document.getElementById('hourlyStrip'),
        dailyForecast: document.getElementById('dailyForecast'),
        tempChart: document.getElementById('tempChart'),
        aqiDisplay: document.getElementById('aqiDisplay'),
        mapContainer: document.getElementById('mapContainer'),
        mapLayerBtns: document.getElementById('mapLayerBtns'),
        favoritesList: document.getElementById('favoritesList'),
        recentList: document.getElementById('recentList'),
        effectsOverlay: document.getElementById('effectsOverlay'),
        lightningFlash: document.getElementById('lightningFlash'),
        toast: document.getElementById('toast'),
        attributionToast: document.getElementById('attributionToast'),
        attributionDismiss: document.getElementById('attributionDismiss'),
        modalOverlay: document.getElementById('modalOverlay'),
        modalClose: document.getElementById('modalClose'),
        modalTitle: document.getElementById('modalTitle'),
        modalBody: document.getElementById('modalBody'),
        searchWrapper: document.querySelector('.search-wrapper'),
    };

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    function debounce(fn, delay) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function formatTime(ts, timezoneOffset = 0) {
        const date = new Date((ts + timezoneOffset) * 1000);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'UTC' });
    }

    function formatHour(ts, timezoneOffset = 0) {
        const date = new Date((ts + timezoneOffset) * 1000);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'UTC' });
    }

    function formatDay(ts, timezoneOffset = 0) {
        const date = new Date((ts + timezoneOffset) * 1000);
        return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    }

    function formatDate(ts, timezoneOffset = 0) {
        const date = new Date((ts + timezoneOffset) * 1000);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    }

    function getTempUnit() { return state.unit === 'metric' ? '°C' : '°F'; }
    function getWindUnit() { return state.unit === 'metric' ? 'm/s' : 'mph'; }
    function displayTemp(kelvin) {
        if (state.unit === 'metric') return Math.round(kelvin - 273.15);
        return Math.round((kelvin - 273.15) * 9 / 5 + 32);
    }

    function showToast(message, duration = 2500) {
        DOM.toast.textContent = message;
        DOM.toast.classList.add('show');
        clearTimeout(DOM.toast._timeout);
        DOM.toast._timeout = setTimeout(() => DOM.toast.classList.remove('show'), duration);
    }

    function showModal(title, bodyHTML) {
        DOM.modalTitle.textContent = title;
        DOM.modalBody.innerHTML = bodyHTML;
        DOM.modalOverlay.classList.remove('hidden');
        DOM.modalClose.focus();
    }

    function hideModal() {
        DOM.modalOverlay.classList.add('hidden');
    }

    // ============================================================
    // LOCAL STORAGE HELPERS
    // ============================================================
    function loadFromStorage(key, fallback) {
        try {
            const data = localStorage.getItem(`skyview_${key}`);
            return data ? JSON.parse(data) : fallback;
        } catch { return fallback; }
    }

    function saveToStorage(key, value) {
        try { localStorage.setItem(`skyview_${key}`, JSON.stringify(value)); } catch {}
    }

    // ============================================================
    // API SERVICE
    // ============================================================
    const apiCache = new Map();

    async function apiFetch(url, cacheKey = null) {
        if (cacheKey && apiCache.has(cacheKey)) {
            const cached = apiCache.get(cacheKey);
            if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) return cached.data;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        if (cacheKey) apiCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    }

    async function fetchCurrentWeather(lat, lon) {
        const url = `${CONFIG.API_BASE}/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}`;
        return apiFetch(url, `weather_${lat}_${lon}`);
    }

    async function fetchForecast(lat, lon) {
        const url = `${CONFIG.API_BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}`;
        return apiFetch(url, `forecast_${lat}_${lon}`);
    }

    async function fetchAirPollution(lat, lon) {
        const url = `${CONFIG.API_BASE}/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}`;
        return apiFetch(url, `air_${lat}_${lon}`);
    }

    async function geocodeCity(query) {
        const url = `${CONFIG.GEO_BASE}/direct?q=${encodeURIComponent(query)}&limit=6&appid=${CONFIG.API_KEY}`;
        return apiFetch(url);
    }

    async function reverseGeocode(lat, lon) {
        const url = `${CONFIG.GEO_BASE}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${CONFIG.API_KEY}`;
        return apiFetch(url);
    }

    async function fetchAllWeatherData(lat, lon) {
        state.isLoading = true;
        showSkeletons();
        try {
            const [weather, forecast, airPollution] = await Promise.all([
                fetchCurrentWeather(lat, lon),
                fetchForecast(lat, lon),
                fetchAirPollution(lat, lon),
            ]);
            state.currentWeather = weather;
            state.forecast = forecast;
            state.airPollution = airPollution;
            state.locationCoords = { lat, lon };
            state.locationName = weather.name || 'Unknown';
            state.locationDetails = `${weather.sys?.country || ''}${weather.sys?.country ? ', ' : ''}${state.locationName}`;
            processForecastData();
            processAirPollutionData();
            renderAll();
            updateMap(lat, lon);
            updateWeatherEffects(weather.weather?.[0]?.main || '');
            addToRecent(state.locationName, lat, lon);
        } catch (error) {
            console.error('Weather fetch error:', error);
            showToast('⚠️ Unable to fetch weather data. Please try again.');
            hideSkeletons();
        } finally {
            state.isLoading = false;
        }
    }

    // ============================================================
    // DATA PROCESSING
    // ============================================================
    function processForecastData() {
        if (!state.forecast?.list) return;
        const tzOffset = state.forecast.city?.timezone || 0;
        state.hourlyData = state.forecast.list.slice(0, 24).map(item => ({
            dt: item.dt,
            temp: displayTemp(item.main.temp),
            icon: item.weather[0]?.icon || '01d',
            main: item.weather[0]?.main || 'Clear',
            precip: Math.round((item.pop || 0) * 100),
            time: formatHour(item.dt, tzOffset),
        }));
        const dailyMap = new Map();
        state.forecast.list.forEach(item => {
            const dayKey = formatDate(item.dt, tzOffset);
            if (!dailyMap.has(dayKey)) {
                dailyMap.set(dayKey, {
                    date: dayKey,
                    dayName: formatDay(item.dt, tzOffset),
                    temps: [],
                    icons: [],
                    mains: [],
                    precip: [],
                    dt: item.dt,
                });
            }
            const day = dailyMap.get(dayKey);
            day.temps.push(item.main.temp);
            day.icons.push(item.weather[0]?.icon || '01d');
            day.mains.push(item.weather[0]?.main || 'Clear');
            day.precip.push(item.pop || 0);
        });
        state.dailyData = Array.from(dailyMap.values()).slice(0, 7).map(day => ({
            ...day,
            high: displayTemp(Math.max(...day.temps)),
            low: displayTemp(Math.min(...day.temps)),
            icon: day.icons[Math.floor(day.icons.length / 2)],
            main: day.mains[Math.floor(day.mains.length / 2)],
            maxPrecip: Math.round(Math.max(...day.precip) * 100),
        }));
        const allTemps = state.dailyData.flatMap(d => [d.high, d.low]);
        state.tempRange = { min: Math.min(...allTemps) - 3, max: Math.max(...allTemps) + 3 };
    }

    function processAirPollutionData() {
        if (!state.airPollution?.list?.[0]) return;
        state.aqiData = state.airPollution.list[0];
    }

    // ============================================================
    // SKELETON HANDLING
    // ============================================================
    function showSkeletons() {
        DOM.detailsGrid.innerHTML = Array(8).fill('<div class="skeleton skeleton-card"></div>').join('');
        DOM.hourlyStrip.innerHTML = Array(8).fill('<div class="skeleton" style="min-width:70px;height:90px;border-radius:16px;flex:0 0 auto;"></div>').join('');
        DOM.dailyForecast.innerHTML = Array(5).fill('<div class="skeleton skeleton-text" style="height:40px;"></div>').join('');
        DOM.aqiDisplay.innerHTML = '<div class="skeleton skeleton-circle"></div><div class="skeleton" style="flex:1;height:80px;border-radius:14px;"></div>';
    }

    function hideSkeletons() {}

    // ============================================================
    // RENDER FUNCTIONS
    // ============================================================
    function renderAll() {
        if (!state.currentWeather) return;
        renderHero();
        renderDetails();
        renderHourly();
        renderDaily();
        renderAQI();
        renderChart();
        renderFavoritesAndRecent();
    }

    function renderHero() {
        const w = state.currentWeather;
        const tzOffset = w.timezone || 0;
        DOM.locationName.textContent = state.locationName;
        DOM.locationDetails.textContent = state.locationDetails;
        DOM.currentTemp.textContent = displayTemp(w.main.temp);
        DOM.conditionText.textContent = w.weather[0]?.description || w.weather[0]?.main || '';
        DOM.feelsLike.textContent = `Feels like ${displayTemp(w.main.feels_like)}${getTempUnit()}`;
        DOM.hiLo.innerHTML = `
            <span><i class="fa-solid fa-arrow-up text-accent" aria-hidden="true"></i> ${displayTemp(w.main.temp_max)}°</span>
            <span><i class="fa-solid fa-arrow-down text-accent" aria-hidden="true"></i> ${displayTemp(w.main.temp_min)}°</span>
        `;
        const iconCode = w.weather[0]?.icon || '01d';
        DOM.weatherIconLarge.innerHTML = getWeatherIconHTML(iconCode);
        const sunrise = formatTime(w.sys.sunrise, tzOffset);
        const sunset = formatTime(w.sys.sunset, tzOffset);
        DOM.sunTimes.innerHTML = `<i class="fa-solid fa-sunrise text-accent" aria-hidden="true"></i> ${sunrise} &nbsp;&nbsp; <i class="fa-solid fa-sunset text-accent" aria-hidden="true"></i> ${sunset}`;
    }

    function renderDetails() {
        const w = state.currentWeather;
        const details = [
            { icon: 'fa-droplet', value: `${w.main.humidity}%`, label: 'Humidity' },
            { icon: 'fa-gauge-high', value: `${w.main.pressure} hPa`, label: 'Pressure' },
            { icon: 'fa-eye', value: `${(w.visibility / 1000).toFixed(1)} km`, label: 'Visibility' },
            { icon: 'fa-wind', value: `${w.wind.speed} ${getWindUnit()}`, label: 'Wind Speed' },
            { icon: 'fa-compass', value: `${w.wind.deg || 0}°`, label: 'Wind Dir' },
            { icon: 'fa-wind', value: w.wind.gust ? `${w.wind.gust} ${getWindUnit()}` : 'N/A', label: 'Gusts' },
            { icon: 'fa-cloud', value: `${w.clouds?.all || 0}%`, label: 'Cloud Cover' },
            { icon: 'fa-temperature-half', value: w.main.dew_point ? `${displayTemp(w.main.dew_point)}${getTempUnit()}` : 'N/A', label: 'Dew Point' },
        ];
        DOM.detailsGrid.innerHTML = details.map(d => `
            <div class="detail-item" tabindex="0">
                <i class="fa-solid ${d.icon}" aria-hidden="true"></i>
                <span class="detail-value">${d.value}</span>
                <span class="detail-label">${d.label}</span>
            </div>
        `).join('');
    }

    function renderHourly() {
        if (!state.hourlyData.length) {
            DOM.hourlyStrip.innerHTML = '<span style="color:var(--text-tertiary);">No hourly data available.</span>';
            return;
        }
        DOM.hourlyStrip.innerHTML = state.hourlyData.map(h => `
            <div class="hourly-item" tabindex="0">
                <div class="hour-time">${h.time}</div>
                <div class="hour-icon">${getWeatherIconHTML(h.icon)}</div>
                <div class="hour-temp">${h.temp}°</div>
                <div class="hour-precip"><i class="fa-solid fa-droplet" aria-hidden="true"></i> ${h.precip}%</div>
            </div>
        `).join('');
    }

    function renderDaily() {
        if (!state.dailyData.length) {
            DOM.dailyForecast.innerHTML = '<span style="color:var(--text-tertiary);">No forecast data available.</span>';
            return;
        }
        const globalMin = state.tempRange?.min || -10;
        const globalMax = state.tempRange?.max || 40;
        const range = globalMax - globalMin || 1;
        DOM.dailyForecast.innerHTML = state.dailyData.map(d => {
            const leftPercent = ((d.low - globalMin) / range) * 100;
            const widthPercent = ((d.high - d.low) / range) * 100;
            return `
                <div class="daily-row" tabindex="0">
                    <span class="day-name">${d.dayName}</span>
                    <span class="day-icon">${getWeatherIconHTML(d.icon)}</span>
                    <span class="day-temp-bar">
                        <span class="day-temp-fill" style="left:${leftPercent}%;width:${Math.max(widthPercent, 3)}%;"></span>
                    </span>
                    <span class="day-temps">${d.low}° / <strong>${d.high}°</strong></span>
                    <span class="text-xs" style="color:var(--accent);min-width:30px;text-align:right;">${d.maxPrecip}%</span>
                </div>
            `;
        }).join('');
    }

    function renderAQI() {
        if (!state.aqiData) {
            DOM.aqiDisplay.innerHTML = '<span style="color:var(--text-tertiary);">Air quality data unavailable.</span>';
            return;
        }
        const aqi = state.aqiData.main.aqi;
        const aqiLabels = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
        const aqiClasses = ['', 'good', 'moderate', 'moderate', 'unhealthy', 'unhealthy'];
        const components = state.aqiData.components;
        DOM.aqiDisplay.innerHTML = `
            <div class="aqi-circle ${aqiClasses[aqi] || 'moderate'}">
                <span style="font-size:0.7rem;text-transform:uppercase;">AQI</span>
                <span>${aqi}</span>
                <span style="font-size:0.65rem;">${aqiLabels[aqi] || 'Unknown'}</span>
            </div>
            <div class="aqi-pollutants">
                <div class="pollutant-item"><span class="pol-value">${components.pm2_5?.toFixed(1) || '--'}</span><span class="pol-label">PM2.5</span></div>
                <div class="pollutant-item"><span class="pol-value">${components.pm10?.toFixed(1) || '--'}</span><span class="pol-label">PM10</span></div>
                <div class="pollutant-item"><span class="pol-value">${components.co?.toFixed(0) || '--'}</span><span class="pol-label">CO</span></div>
                <div class="pollutant-item"><span class="pol-value">${components.no2?.toFixed(1) || '--'}</span><span class="pol-label">NO₂</span></div>
                <div class="pollutant-item"><span class="pol-value">${components.o3?.toFixed(1) || '--'}</span><span class="pol-label">O₃</span></div>
                <div class="pollutant-item"><span class="pol-value">${components.so2?.toFixed(1) || '--'}</span><span class="pol-label">SO₂</span></div>
            </div>
        `;
    }

    function renderChart() {
        const canvas = DOM.tempChart;
        if (!canvas || !state.dailyData.length) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width - 40;
        canvas.height = 200;
        const w = canvas.width;
        const h = canvas.height;
        const padding = { top: 20, right: 20, bottom: 30, left: 45 };
        const plotW = w - padding.left - padding.right;
        const plotH = h - padding.top - padding.bottom;
        const allTemps = state.dailyData.flatMap(d => [d.high, d.low]);
        const minT = Math.min(...allTemps) - 2;
        const maxT = Math.max(...allTemps) + 2;
        const tRange = maxT - minT || 1;
        ctx.clearRect(0, 0, w, h);
        const gridColor = getComputedStyle(document.body).getPropertyValue('--chart-grid').trim();
        const lineColor = getComputedStyle(document.body).getPropertyValue('--chart-line').trim();
        const fillColor = getComputedStyle(document.body).getPropertyValue('--chart-fill').trim();
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (plotH / 4) * i;
            ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
        }
        const xStep = plotW / (state.dailyData.length - 1 || 1);
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        state.dailyData.forEach((d, i) => {
            const x = padding.left + xStep * i;
            const y = padding.top + plotH - ((d.high - minT) / tRange) * plotH;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        state.dailyData.forEach((d, i) => {
            const x = padding.left + xStep * i;
            const y = padding.top + plotH - ((d.low - minT) / tRange) * plotH;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        state.dailyData.forEach((d, i) => {
            const x = padding.left + xStep * i;
            ctx.lineTo(x, padding.top + plotH - ((d.high - minT) / tRange) * plotH);
        });
        for (let i = state.dailyData.length - 1; i >= 0; i--) {
            const x = padding.left + xStep * i;
            ctx.lineTo(x, padding.top + plotH - ((state.dailyData[i].low - minT) / tRange) * plotH);
        }
        ctx.closePath(); ctx.fill();
    }

    function renderFavoritesAndRecent() {
        if (state.favorites.length === 0) {
            DOM.favoritesList.innerHTML = '<span class="placeholder-text">No saved locations. Star a city to save it.</span>';
        } else {
            DOM.favoritesList.innerHTML = state.favorites.map((fav, i) => `
                <span class="chip" tabindex="0" data-action="load-fav" data-index="${i}">
                    <i class="fa-solid fa-star" style="color:#f59e0b;font-size:0.7rem;" aria-hidden="true"></i> ${fav.name}
                    <span class="chip-remove" data-action="remove-fav" data-index="${i}">✕</span>
                </span>
            `).join('');
        }
        if (state.recentSearches.length === 0) {
            DOM.recentList.innerHTML = '<span class="placeholder-text">No recent searches.</span>';
        } else {
            DOM.recentList.innerHTML = state.recentSearches.map((rec, i) => `
                <span class="chip" tabindex="0" data-action="load-recent" data-index="${i}">
                    <i class="fa-solid fa-clock-rotate-left" style="font-size:0.7rem;color:var(--text-tertiary);" aria-hidden="true"></i> ${rec.name}
                </span>
            `).join('');
        }
        DOM.favBadge.textContent = state.favorites.length;
        DOM.favBadge.classList.toggle('hidden', state.favorites.length === 0);
    }

    // ============================================================
    // WEATHER ICON MAPPING
    // ============================================================
    function getWeatherIconHTML(iconCode) {
        const iconMap = {
            '01d': '<i class="fa-solid fa-sun" style="color:#fbbf24;"></i>',
            '01n': '<i class="fa-solid fa-moon" style="color:#c4b5fd;"></i>',
            '02d': '<i class="fa-solid fa-cloud-sun" style="color:#fbbf24;"></i>',
            '02n': '<i class="fa-solid fa-cloud-moon" style="color:#c4b5fd;"></i>',
            '03d': '<i class="fa-solid fa-cloud" style="color:#94a3b8;"></i>',
            '03n': '<i class="fa-solid fa-cloud" style="color:#94a3b8;"></i>',
            '04d': '<i class="fa-solid fa-clouds" style="color:#6b7280;"></i>',
            '04n': '<i class="fa-solid fa-clouds" style="color:#6b7280;"></i>',
            '09d': '<i class="fa-solid fa-cloud-showers-heavy" style="color:#60a5fa;"></i>',
            '09n': '<i class="fa-solid fa-cloud-showers-heavy" style="color:#60a5fa;"></i>',
            '10d': '<i class="fa-solid fa-cloud-sun-rain" style="color:#60a5fa;"></i>',
            '10n': '<i class="fa-solid fa-cloud-moon-rain" style="color:#60a5fa;"></i>',
            '11d': '<i class="fa-solid fa-cloud-bolt" style="color:#fbbf24;"></i>',
            '11n': '<i class="fa-solid fa-cloud-bolt" style="color:#fbbf24;"></i>',
            '13d': '<i class="fa-solid fa-snowflake" style="color:#e0f2fe;"></i>',
            '13n': '<i class="fa-solid fa-snowflake" style="color:#e0f2fe;"></i>',
            '50d': '<i class="fa-solid fa-smog" style="color:#9ca3af;"></i>',
            '50n': '<i class="fa-solid fa-smog" style="color:#9ca3af;"></i>',
        };
        return iconMap[iconCode] || '<i class="fa-solid fa-cloud-sun" style="color:var(--accent);"></i>';
    }

    // ============================================================
    // WEATHER EFFECTS
    // ============================================================
    function updateWeatherEffects(condition) {
        const overlay = DOM.effectsOverlay;
        overlay.innerHTML = '';
        const lower = condition.toLowerCase();
        if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) {
            createRainEffect(overlay);
        } else if (lower.includes('snow') || lower.includes('sleet')) {
            createSnowEffect(overlay);
        } else if (lower.includes('thunderstorm') || lower.includes('lightning')) {
            createRainEffect(overlay);
            triggerLightning();
        } else if (lower.includes('fog') || lower.includes('mist') || lower.includes('haze')) {
            createFogEffect(overlay);
        }
    }

    function createRainEffect(container) {
        for (let i = 0; i < 80; i++) {
            const drop = document.createElement('div');
            drop.className = 'raindrop';
            drop.style.left = `${Math.random() * 100}%`;
            drop.style.height = `${8 + Math.random() * 14}px`;
            drop.style.animationDuration = `${0.4 + Math.random() * 0.7}s`;
            drop.style.animationDelay = `${Math.random() * 1.5}s`;
            container.appendChild(drop);
        }
    }

    function createSnowEffect(container) {
        for (let i = 0; i < 60; i++) {
            const flake = document.createElement('div');
            flake.className = 'snowflake';
            flake.style.left = `${Math.random() * 100}%`;
            flake.style.width = `${3 + Math.random() * 7}px`;
            flake.style.height = flake.style.width;
            flake.style.animationDuration = `${3 + Math.random() * 6}s`;
            flake.style.animationDelay = `${Math.random() * 4}s`;
            container.appendChild(flake);
        }
    }

    function createFogEffect(container) {
        const fog = document.createElement('div');
        fog.style.cssText = 'position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(200,210,220,0.3) 0%,transparent 70%);';
        container.appendChild(fog);
    }

    function triggerLightning() {
        DOM.lightningFlash.style.animation = 'none';
        DOM.lightningFlash.offsetHeight;
        DOM.lightningFlash.style.animation = 'flashBurst 0.15s ease-out';
    }

    // ============================================================
    // MAP FUNCTIONS
    // ============================================================
    function initMap() {
        if (state.mapInstance) return;
        const mapEl = document.createElement('div');
        mapEl.id = 'leafletMap';
        mapEl.style.cssText = 'height:100%;width:100%;border-radius:18px;';
        DOM.mapContainer.appendChild(mapEl);
        state.mapInstance = L.map('leafletMap', {
            center: [20, 0],
            zoom: 2,
            zoomControl: false,
            attributionControl: false,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(state.mapInstance);
        L.control.zoom({ position: 'bottomright' }).addTo(state.mapInstance);
        state.mapInstance.on('click', function(e) {
            const { lat, lng } = e.latlng;
            updateMapMarker(lat, lng);
            fetchAllWeatherData(lat, lng);
            reverseGeocode(lat, lng).then(data => {
                if (data?.[0]) {
                    state.locationName = data[0].name || 'Selected';
                    state.locationDetails = `${data[0].state || ''}${data[0].state ? ', ' : ''}${data[0].country || ''}`;
                    renderHero();
                }
            }).catch(() => {});
        });
    }

    function updateMap(lat, lon) {
        if (!state.mapInstance) { initMap(); return; }
        state.mapInstance.setView([lat, lon], 10);
        updateMapMarker(lat, lon);
        addWeatherLayer();
    }

    function updateMapMarker(lat, lon) {
        if (state.mapMarker) {
            state.mapMarker.setLatLng([lat, lon]);
        } else {
            state.mapMarker = L.marker([lat, lon]).addTo(state.mapInstance);
        }
    }

    function addWeatherLayer() {
        if (!state.mapInstance) return;
        if (state.weatherLayer) state.mapInstance.removeLayer(state.weatherLayer);
        state.weatherLayer = L.tileLayer(
            `https://tile.openweathermap.org/map/${state.activeMapLayer}/{z}/{x}/{y}.png?appid=${CONFIG.API_KEY}`,
            { maxZoom: 18, opacity: 0.7 }
        ).addTo(state.mapInstance);
    }

    // ============================================================
    // SEARCH & GEOLOCATION
    // ============================================================
    async function searchCity(query) {
        if (!query || query.trim().length < 2) return;
        try {
            const results = await geocodeCity(query.trim());
            if (results.length === 0) {
                showToast('City not found. Please try a different search.');
                return;
            }
            const city = results[0];
            state.locationName = city.name || query;
            state.locationDetails = `${city.state || ''}${city.state ? ', ' : ''}${city.country || ''}`;
            updateMap(city.lat, city.lon);
            await fetchAllWeatherData(city.lat, city.lon);
            DOM.searchInput.value = '';
            DOM.suggestionsList.classList.remove('active');
        } catch (error) {
            console.error('Search error:', error);
            showToast('Search failed. Check your connection.');
        }
    }

    const debouncedSuggest = debounce(async function(query) {
        if (query.length < 3) { DOM.suggestionsList.classList.remove('active'); return; }
        try {
            const results = await geocodeCity(query);
            DOM.suggestionsList.innerHTML = results.length === 0 ?
                '<li style="color:var(--text-tertiary);">No results found</li>' :
                results.map(r => `
                    <li tabindex="0" data-lat="${r.lat}" data-lon="${r.lon}">
                        <strong>${r.name}</strong>${r.state ? `, ${r.state}` : ''} — ${r.country || ''}
                    </li>
                `).join('');
            DOM.suggestionsList.classList.add('active');
        } catch { DOM.suggestionsList.classList.remove('active'); }
    }, CONFIG.DEBOUNCE_DELAY);

    function handleGeolocation() {
        if (!navigator.geolocation) { showToast('Geolocation not supported.'); return; }
        showToast('📍 Detecting your location...');
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                updateMap(latitude, longitude);
                await fetchAllWeatherData(latitude, longitude);
                try {
                    const revData = await reverseGeocode(latitude, longitude);
                    if (revData?.[0]) {
                        state.locationName = revData[0].name || 'My Location';
                        state.locationDetails = `${revData[0].state || ''}${revData[0].country || ''}`;
                        renderHero();
                    }
                } catch {}
                showToast('✅ Location detected!');
            },
            (error) => {
                let msg = 'Unable to detect location. ';
                if (error.code === 1) msg += 'Permission denied.';
                else if (error.code === 2) msg += 'Position unavailable.';
                else msg += 'Timeout.';
                showToast(msg, 4000);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }

    // ============================================================
    // FAVORITES & RECENT
    // ============================================================
    function addToRecent(name, lat, lon) {
        state.recentSearches = state.recentSearches.filter(r => r.name.toLowerCase() !== name.toLowerCase());
        state.recentSearches.unshift({ name, lat, lon });
        if (state.recentSearches.length > CONFIG.MAX_RECENT) state.recentSearches = state.recentSearches.slice(0, CONFIG.MAX_RECENT);
        saveToStorage('recent', state.recentSearches);
        renderFavoritesAndRecent();
    }

    function toggleFavorite(name, lat, lon) {
        const index = state.favorites.findIndex(f => f.name.toLowerCase() === name.toLowerCase());
        if (index >= 0) {
            state.favorites.splice(index, 1);
            showToast(`Removed "${name}" from favorites.`);
        } else {
            if (state.favorites.length >= CONFIG.MAX_FAVORITES) { showToast('Max favorites reached.'); return; }
            state.favorites.push({ name, lat, lon });
            showToast(`⭐ Added "${name}" to favorites!`);
        }
        saveToStorage('favorites', state.favorites);
        renderFavoritesAndRecent();
    }

    function loadFromFavorite(index) {
        const fav = state.favorites[index];
        if (!fav) return;
        updateMap(fav.lat, fav.lon);
        fetchAllWeatherData(fav.lat, fav.lon);
    }

    function loadFromRecent(index) {
        const rec = state.recentSearches[index];
        if (!rec) return;
        updateMap(rec.lat, rec.lon);
        fetchAllWeatherData(rec.lat, rec.lon);
    }

    // ============================================================
    // THEME & UNIT
    // ============================================================
    function applyTheme(theme) {
        state.theme = theme;
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
            DOM.themeIcon.className = prefersDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        } else {
            document.documentElement.setAttribute('data-theme', theme);
            DOM.themeIcon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        }
        saveToStorage('theme', theme);
        if (state.dailyData.length) renderChart();
    }

    function cycleTheme() {
        const themes = ['auto', 'light', 'dark'];
        const idx = themes.indexOf(state.theme);
        applyTheme(themes[(idx + 1) % 3]);
    }

    function toggleUnit() {
        state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
        DOM.unitBtn.querySelector('.unit-label').textContent = state.unit === 'metric' ? '°C' : '°F';
        saveToStorage('unit', state.unit);
        if (state.forecast) processForecastData();
        renderAll();
    }

    // ============================================================
    // EVENT LISTENERS
    // ============================================================
    function setupEventListeners() {
        DOM.searchInput.addEventListener('input', () => debouncedSuggest(DOM.searchInput.value));
        DOM.searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') searchCity(this.value);
            if (e.key === 'Escape') DOM.suggestionsList.classList.remove('active');
        });
        document.addEventListener('click', function(e) {
            if (!DOM.searchWrapper?.contains(e.target)) DOM.suggestionsList.classList.remove('active');
        });
        DOM.suggestionsList.addEventListener('click', function(e) {
            const li = e.target.closest('li');
            if (!li?.dataset.lat) return;
            state.locationName = li.querySelector('strong')?.textContent || 'Selected';
            updateMap(parseFloat(li.dataset.lat), parseFloat(li.dataset.lon));
            fetchAllWeatherData(parseFloat(li.dataset.lat), parseFloat(li.dataset.lon));
            DOM.searchInput.value = '';
            DOM.suggestionsList.classList.remove('active');
        });
        DOM.searchBtn.addEventListener('click', () => searchCity(DOM.searchInput.value));
        DOM.gpsBtn.addEventListener('click', handleGeolocation);
        DOM.favBtn.addEventListener('click', () => {
            if (state.locationName) toggleFavorite(state.locationName, state.locationCoords.lat, state.locationCoords.lon);
            else showToast('No location loaded.');
        });
        DOM.themeBtn.addEventListener('click', cycleTheme);
        DOM.unitBtn.addEventListener('click', toggleUnit);
        DOM.refreshBtn.addEventListener('click', () => {
            if (state.locationCoords.lat) {
                fetchAllWeatherData(state.locationCoords.lat, state.locationCoords.lon);
                showToast('🔄 Weather refreshed!');
            }
        });
        document.addEventListener('click', function(e) {
            const chip = e.target.closest('[data-action]');
            if (!chip) return;
            const action = chip.dataset.action;
            const index = parseInt(chip.dataset.index);
            if (action === 'load-fav') loadFromFavorite(index);
            if (action === 'load-recent') loadFromRecent(index);
            if (action === 'remove-fav') {
                const fav = state.favorites[index];
                if (fav) toggleFavorite(fav.name, fav.lat, fav.lon);
            }
        });
        DOM.mapLayerBtns.addEventListener('click', function(e) {
            const btn = e.target.closest('button');
            if (!btn) return;
            DOM.mapLayerBtns.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeMapLayer = btn.dataset.layer;
            addWeatherLayer();
        });
        DOM.modalClose.addEventListener('click', hideModal);
        DOM.modalOverlay.addEventListener('click', function(e) { if (e.target === DOM.modalOverlay) hideModal(); });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !DOM.modalOverlay.classList.contains('hidden')) hideModal();
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); DOM.searchInput.focus(); }
        });
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (state.theme === 'auto') applyTheme('auto');
        });
        window.addEventListener('resize', debounce(() => { if (state.dailyData.length) renderChart(); }, 300));

        // Attribution toast dismiss button
        DOM.attributionDismiss.addEventListener('click', function() {
            DOM.attributionToast.classList.add('dismissed');
            // Save preference to not show again
            saveToStorage('attributionDismissed', true);
        });
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================
    async function init() {
        state.favorites = loadFromStorage('favorites', []);
        state.recentSearches = loadFromStorage('recent', []);
        state.theme = loadFromStorage('theme', 'auto');
        state.unit = loadFromStorage('unit', 'metric');
        const attributionDismissed = loadFromStorage('attributionDismissed', false);

        applyTheme(state.theme);
        DOM.unitBtn.querySelector('.unit-label').textContent = state.unit === 'metric' ? '°C' : '°F';

        // Show or hide attribution toast based on previous dismissal
        if (attributionDismissed) {
            DOM.attributionToast.classList.add('dismissed');
        }

        setupEventListeners();
        initMap();
        renderFavoritesAndRecent();

        // Check API key
        if (!CONFIG.API_KEY || CONFIG.API_KEY === 'YOUR_OPENWEATHER_API_KEY') {
            document.getElementById('weatherHero').innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:40px;">
                    <i class="fa-solid fa-key" style="font-size:3rem;color:var(--accent);" aria-hidden="true"></i>
                    <h3 style="margin-top:16px;">API Key Required</h3>
                    <p style="color:var(--text-secondary);max-width:500px;margin:12px auto;">
                        Get a free key from <a href="https://openweathermap.org/api" target="_blank" rel="noopener" style="color:var(--accent);">OpenWeather</a>
                        and replace <code>YOUR_OPENWEATHER_API_KEY</code> in script.js.
                    </p>
                </div>`;
            return;
        }

        // Load recent or request geolocation
        const lastSearch = state.recentSearches[0];
        if (lastSearch) {
            updateMap(lastSearch.lat, lastSearch.lon);
            await fetchAllWeatherData(lastSearch.lat, lastSearch.lon);
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    updateMap(latitude, longitude);
                    await fetchAllWeatherData(latitude, longitude);
                    try {
                        const rev = await reverseGeocode(latitude, longitude);
                        if (rev?.[0]) {
                            state.locationName = rev[0].name || 'My Location';
                            state.locationDetails = `${rev[0].state || ''}${rev[0].country || ''}`;
                            renderHero();
                        }
                    } catch {}
                },
                (error) => {
                    let msg = '📍 Location access required. ';
                    if (error.code === 1) msg += 'Please allow GPS or search manually.';
                    else msg += 'Could not detect location.';
                    showToast(msg, 5000);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            showToast('📍 Geolocation not supported. Search for a city manually.', 5000);
        }
    }

    init().catch(err => console.error('Init error:', err));
})();