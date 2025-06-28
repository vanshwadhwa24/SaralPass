# RailSentry - Free Traffic-Aware Routing

RailSentry is a web-based map application that now supports **traffic-aware ETA calculations** using completely free APIs! No paid services required.

## 🆓 **Free Traffic-Aware Routing Options**

### **1. TomTom Routing API (Recommended - Free Tier)**
- ✅ **2,500 requests/day free**
- ✅ **Excellent traffic data quality**
- ✅ **Professional-grade routing**
- ✅ **Simple API key setup**

### **2. OpenRouteService (100% Free)**
- ✅ **No API key required**
- ✅ **No registration needed**
- ✅ **Unlimited requests**
- ✅ **Traffic-aware routing**
- ✅ **Ready to use immediately**

### **3. OSRM (Fallback)**
- ✅ **Completely free**
- ✅ **No API key needed**
- ✅ **Basic routing (no traffic data)**
- ✅ **Always available as backup**

## Features

- **🆓 Completely Free**: No paid services required
- **🚦 Traffic-Aware Routing**: Real-time traffic data integration
- **🔄 Smart Fallback**: Automatic switching between free APIs
- **🎨 Visual Traffic Indicators**: Color-coded route lines and traffic level indicators
- **📱 Live Updates**: Continuous route updates as you move
- **🔍 Search & Navigation**: Location search with geocoding

## Setup Instructions

### **Option 1: Use TomTom API (Recommended - You already have this!)**

Since you already have a TomTom free API, this is the best option:

1. Open `js/script.js`
2. Add your TomTom API key:
   ```javascript
   const TOMTOM_API_KEY = 'YOUR_TOMTOM_API_KEY_HERE';
   ```
3. Open `index.html` in your browser

**Benefits**: 2,500 requests/day free, excellent traffic data quality!

### **Option 2: Use OpenRouteService (100% Free - No Setup Required)**

The app works immediately with OpenRouteService! Just open `index.html` in your browser.

### **Option 3: Use OSRM Only (Basic Routing)**

If you prefer basic routing without traffic data, set:
```javascript
const USE_OPENROUTE_SERVICE = false;
const TOMTOM_API_KEY = '';
```

## How It Works

The app automatically tries routing services in this order:

1. **TomTom** (free tier) - Excellent traffic data (if API key provided)
2. **OpenRouteService** (free, no API key) - Traffic-aware routing
3. **OSRM** (free) - Basic routing as final fallback

## Traffic Levels

The application displays traffic information with the following levels:

- 🟢 **Light Traffic**: Minimal delays (< 10% increase)
- 🟡 **Moderate Traffic**: Some delays (10-25% increase)
- 🟠 **Heavy Traffic**: Significant delays (25-50% increase)
- 🔴 **Severe Traffic**: Major delays (> 50% increase)

## APIs Used

- **OpenRouteService**: Primary free routing with traffic data
- **OSRM**: Fallback routing service
- **OpenCage Geocoding**: Location search and reverse geocoding
- **Leaflet.js**: Map display and interaction
- **OpenStreetMap**: Map tiles

## Browser Compatibility

- Modern browsers with Geolocation API support
- HTTPS required for location services
- Internet connection required for API calls

## Cost Breakdown

- **OpenRouteService**: 100% free, unlimited
- **OSRM**: 100% free, unlimited
- **OpenCage**: Generous free tier
- **Total Cost**: $0 (completely free!)

## Troubleshooting

1. **No traffic data shown**: Check browser console for API errors
2. **Route not found**: Verify both origin and destination coordinates are valid
3. **Location permission denied**: Allow location access in browser settings
4. **API errors**: The app automatically falls back to other free services

## Why These Free Options?

- **OpenRouteService**: Open-source, community-driven, completely free
- **OSRM**: Reliable open-source routing engine
- **No vendor lock-in**: Multiple free alternatives available

## License

This project is open source and available under the MIT License. 