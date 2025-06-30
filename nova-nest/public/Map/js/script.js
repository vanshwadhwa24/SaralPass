document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    const expandableMenu = document.getElementById('expandable-menu');
    const mapOverlay = document.getElementById('map-overlay');
    const searchInput = document.querySelector('.search-input');
    const navButton = document.querySelector('.nav-button');
    const searchButton = document.getElementById('search-button');
    const searchSuggestionsContainer = document.getElementById('search-suggestions-container');
    const zoomInButton = document.getElementById('zoom-in');
    const zoomOutButton = document.getElementById('zoom-out');
    const selectLocationBtn = document.getElementById('select-location-btn');

    let userCoords = null;
    let userLocationInfo = null; 
    let debounceTimer = null;
    const OPENCAGE_API_KEY = 'c5fff8aba63d4fd2aa64d2d14c320f5a';
    let routePolyline = null;
    let currentRouteAbortController = null;
    let currentDestination = null;
    let userLocationWatchId = null;
    let clickMarker = null;
    let isSelectLocationMode = false;
    let useMiles = false;
    const toggleMiles = document.getElementById('toggle-miles');
    toggleMiles.onchange = function() {
        useMiles = toggleMiles.checked;
        if (routePolyline && currentDestination) {
            if (window.lastRouteInfo) {
                showRouteInfoBox(window.lastRouteInfo.distanceKm, window.lastRouteInfo.durationMin, window.lastRouteInfo.destName, window.lastRouteInfo.trafficInfo);
            }
        }
    };

    const map = L.map('map-container', {
        center: [30.3398, 76.3869],
        zoom: 13,
        zoomControl: false
    });
    
    console.log('Map container:', document.getElementById('map-container'));
    console.log('Map initialized:', map);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    console.log('Tile layer added to map');
    
    // Load persistent route if available
    setTimeout(() => {
        loadPersistentRoute();
    }, 1000); // Small delay to ensure map is fully loaded

    let userLocationMarker = null;
    let destinationMarker = null;

    const RECENT_SEARCHES_KEY = 'recent_searches';
    const RECENT_SEARCHES_LIMIT = 5;

    function getRecentSearches() {
        return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || [];
    }
    function addRecentSearch(query) {
        if (!query) return;
        let recents = getRecentSearches();
       
        recents = recents.filter(item => item.toLowerCase() !== query.toLowerCase());
        recents.unshift(query);
        if (recents.length > RECENT_SEARCHES_LIMIT) recents = recents.slice(0, RECENT_SEARCHES_LIMIT);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recents));
    }
    function removeRecentSearch(query) {
        let recents = getRecentSearches();
        recents = recents.filter(item => item.toLowerCase() !== query.toLowerCase());
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recents));
    }
    let selectedSuggestionIndex = -1;

    function clearSuggestionSelection() {
        const items = searchSuggestionsContainer.querySelectorAll('.suggestion-item');
        items.forEach(item => item.classList.remove('selected'));
    }
    function updateSuggestionSelection(newIndex) {
        const items = searchSuggestionsContainer.querySelectorAll('.suggestion-item');
        clearSuggestionSelection();
        if (items.length === 0) return;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= items.length) newIndex = items.length - 1;
        selectedSuggestionIndex = newIndex;
        items[selectedSuggestionIndex].classList.add('selected');
  
        items[selectedSuggestionIndex].scrollIntoView({ block: 'nearest' });
    }
    function selectCurrentSuggestion() {
        const items = searchSuggestionsContainer.querySelectorAll('.suggestion-item');
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < items.length) {
            items[selectedSuggestionIndex].click();
        }
    }

    function showRecentSearches() {
        const recents = getRecentSearches();
        searchSuggestionsContainer.innerHTML = '';
        selectedSuggestionIndex = -1;
        if (recents.length === 0) {
            searchSuggestionsContainer.classList.remove('visible');
            return;
        } else {
            positionSuggestions();
            recents.forEach(query => {
                const item = document.createElement('div');
                item.classList.add('suggestion-item');
                item.dataset.query = query; 
                item.innerHTML = `
                    <span class="suggestion-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </span>
                    <span class="suggestion-text">${query}</span>
                    <button class="delete-suggestion">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#888" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>`;

                item.addEventListener('click', (e) => {
                    if (e.target.closest('.delete-suggestion')) {
                        return;
                    }
                    searchInput.value = query;
                    addRecentSearch(query);
                    fetchSuggestions();
                });

                const deleteBtn = item.querySelector('.delete-suggestion');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const queryToDelete = item.dataset.query;
                    removeRecentSearch(queryToDelete);
                    item.remove(); 
                    if (getRecentSearches().length === 0) {
                        searchSuggestionsContainer.classList.remove('visible');
                    }
                });

                searchSuggestionsContainer.appendChild(item);
            });
        }
        searchSuggestionsContainer.classList.add('visible');
    }

    const toggleMenu = () => {
        expandableMenu.classList.toggle('open');
        menuToggle.classList.toggle('open');
        mapOverlay.classList.toggle('open');
    };

    const performDirectSearch = async () => {
        const query = searchInput.value;
        if (query.length < 1) return;

        addRecentSearch(query);

        let apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${OPENCAGE_API_KEY}&limit=1`;
        if (userCoords) {
            apiUrl += `&proximity=${userCoords.lat},${userCoords.lng}`;
        }
        
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const { lat, lng } = data.results[0].geometry;
                const location = new L.LatLng(lat, lng);
                map.setView(location, 13);
                
                if (destinationMarker) map.removeLayer(destinationMarker);
                destinationMarker = L.marker(location, {
                    icon: L.divIcon({
                        className: 'destination-marker',
                        html: '<div style="background-color: #FF6B35; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(map).bindPopup(data.results[0].formatted).openPopup();
                
                // Send location data to React app
                sendLocationToReact({
                    lat: lat,
                    lng: lng,
                    name: data.results[0].formatted,
                    type: 'searched'
                });
                
                searchInput.value = '';
                if (expandableMenu.classList.contains('open')) {
                    toggleMenu();
                }
                if (userCoords) {
                    showStartLocationModal({ lat, lng, name: data.results[0].formatted });
                } else {
                    showToast('User location not available for routing.');
                }
            } else {
                showToast('Location not found. Please try another search.');
            }
        } catch (error) {
            console.error("Search failed:", error);
            showToast('An error occurred during the search. Please try again.');
        }
    };

    let suggestionCache = {};
    let suggestionFetchAbortController = null;

    const fetchSuggestions = async () => {
        let query = searchInput.value.trim();
        if (query.length < 2) {
            searchSuggestionsContainer.classList.remove('visible');
            return;
        }
      
        if (userLocationInfo) {
            const context = [userLocationInfo.city, userLocationInfo.state, userLocationInfo.country].filter(Boolean).join(', ');
            query = `${query}, ${context}`;
        }

        if (suggestionCache[query]) {
            displaySuggestions(suggestionCache[query]);
            return;
        }
    
        if (suggestionFetchAbortController) {
            suggestionFetchAbortController.abort();
        }
        suggestionFetchAbortController = new AbortController();
 
        searchSuggestionsContainer.innerHTML = '<div class="suggestion-no-results"><span class="spinner"></span> Loading...</div>';
        searchSuggestionsContainer.classList.add('visible');
        let apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${OPENCAGE_API_KEY}&limit=5&min_confidence=3`;
        if (userCoords) {
            apiUrl += `&proximity=${userCoords.lat},${userCoords.lng}`;
        }
        try {
            const response = await fetch(apiUrl, { signal: suggestionFetchAbortController.signal });
            const data = await response.json();
            suggestionCache[query] = data.results;
            displaySuggestions(data.results);
        } catch (error) {
            if (error.name === 'AbortError') {
         
                return;
            }
            searchSuggestionsContainer.innerHTML = '<div class="suggestion-no-results">Failed to load suggestions</div>';
        }
    };

    const positionSuggestions = () => {
        const searchInputRect = searchInput.getBoundingClientRect();
        searchSuggestionsContainer.style.left = `${searchInputRect.left}px`;
        searchSuggestionsContainer.style.top = `${searchInputRect.bottom + 10}px`;
        searchSuggestionsContainer.style.width = `${searchInputRect.width}px`;
    };

    const displaySuggestions = (suggestions) => {
        searchSuggestionsContainer.innerHTML = '';
        selectedSuggestionIndex = -1;
        if (!suggestions || suggestions.length === 0) {
            searchSuggestionsContainer.classList.remove('visible');
            return;
        }
        positionSuggestions();
        suggestions.forEach(result => {
            const item = document.createElement('div');
            item.classList.add('suggestion-item');
            
            const icon = `<span class="suggestion-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
            </span>`;
            
            const text = `<span>${result.formatted}</span>`;

            item.innerHTML = icon + text;

            item.addEventListener('click', () => {
                const { lat, lng } = result.geometry;
                const location = new L.LatLng(lat, lng);
                map.setView(location, 15);
                
                // Remove previous destination marker and add new one
                if (destinationMarker) map.removeLayer(destinationMarker);
                destinationMarker = L.marker(location, {
                    icon: L.divIcon({
                        className: 'destination-marker',
                        html: '<div style="background-color: #FF6B35; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(map).bindPopup(result.formatted).openPopup();
                
                // Send location data to React app
                sendLocationToReact({
                    lat: lat,
                    lng: lng,
                    name: result.formatted,
                    type: 'suggestion'
                });
                
                addRecentSearch(result.formatted);
                searchInput.value = result.formatted;
                searchSuggestionsContainer.classList.remove('visible');
                if (expandableMenu.classList.contains('open')) {
                    toggleMenu();
                }
             
                if (userCoords) {
                    showStartLocationModal(result);
                } else {
                    showToast('User location not available for routing.');
                }
            });
            searchSuggestionsContainer.appendChild(item);
        });
        searchSuggestionsContainer.classList.add('visible');
    };

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim() === '') {
            showRecentSearches();
        }
    });
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        if (searchInput.value.trim() === '') {
            showRecentSearches();
            return;
        }
        debounceTimer = setTimeout(fetchSuggestions, 250);
    });

    searchInput.addEventListener('keydown', (event) => {
        const items = searchSuggestionsContainer.querySelectorAll('.suggestion-item');
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (items.length > 0) {
                let nextIndex = selectedSuggestionIndex + 1;
                if (nextIndex >= items.length) nextIndex = 0;
                updateSuggestionSelection(nextIndex);
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (items.length > 0) {
                let prevIndex = selectedSuggestionIndex - 1;
                if (prevIndex < 0) prevIndex = items.length - 1;
                updateSuggestionSelection(prevIndex);
            }
        } else if (event.key === 'Enter') {
            if (selectedSuggestionIndex !== -1) {
                event.preventDefault();
                selectCurrentSuggestion();
            } else {
                performDirectSearch();
            }
        }
    });

    searchButton.addEventListener('click', performDirectSearch);
    menuToggle.addEventListener('click', toggleMenu);
    mapOverlay.addEventListener('click', toggleMenu);

    const findUserLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                showToast('Geolocation is not supported by your browser.');
                reject('Geolocation not supported');
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    if (error.code === error.PERMISSION_DENIED) {
                        showToast('Location permission denied. Please allow location access for routing.');
                    } else {
                        showToast('Unable to retrieve your location.');
                    }
                    reject(error);
                }
            );
        });
    };

    async function showUserLocationOnMap(coords) {
        if (!coords) return;
        const location = new L.LatLng(coords.lat, coords.lng);
        map.setView(location, 15);
        if (userLocationMarker) map.removeLayer(userLocationMarker);
        userLocationMarker = L.circleMarker(location, { radius: 8, color: '#fff', weight: 2, fillColor: '#004D98', fillOpacity: 1 }).addTo(map).bindPopup('<span class="large-popup-text">You are here</span>').openPopup();
        console.log('User location shown on map:', coords);
    }

    navButton.addEventListener('click', () => {
        if (routePolyline) {
            map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
        } else if (userCoords) {
            const location = new L.LatLng(userCoords.lat, userCoords.lng);
            map.setView(location, 15);
            if (userLocationMarker) {
                userLocationMarker.openPopup();
            }
        } else {
            showToast('User location not available.');
        }
    });

    document.addEventListener('click', (event) => {
        if (!searchSuggestionsContainer.contains(event.target) && event.target !== searchInput) {
            searchSuggestionsContainer.classList.remove('visible');
        }
    });

    const showToast = (message) => {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.classList.add('toast');
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    };

    zoomInButton.addEventListener('click', () => map.zoomIn());
    zoomOutButton.addEventListener('click', () => map.zoomOut());


    function checkAndShowLocationPopup() {
        if (!navigator.permissions || !navigator.geolocation) return;
        navigator.permissions.query({ name: 'geolocation' }).then(function(result) {
            const popup = document.getElementById('location-permission-popup');
            if (result.state === 'granted' || result.state === 'denied') {
                popup.style.display = 'none';
            } else {
                popup.style.display = 'flex';
            }
            result.onchange = function() {
                if (result.state === 'granted' || result.state === 'denied') {
                    popup.style.display = 'none';
                }
            };
        });
    }
    checkAndShowLocationPopup();
    const allowBtn = document.getElementById('location-popup-allow');
    if (allowBtn) {
        allowBtn.addEventListener('click', function() {
           
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function() {}, function() {});
            }
            document.getElementById('location-permission-popup').style.display = 'none';
        });
    }
    const closeBtn = document.getElementById('location-popup-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            document.getElementById('location-permission-popup').style.display = 'none';
        });
    }
    const laterBtn = document.getElementById('location-popup-later');
    if (laterBtn) {
        laterBtn.addEventListener('click', function() {
            const popup = document.getElementById('location-permission-popup');
            popup.classList.add('location-popup-shrinked');
            setTimeout(() => {
                popup.classList.add('location-popup-fadeout');
            }, 700);
            setTimeout(() => {
                popup.style.display = 'none';
                popup.classList.remove('location-popup-shrinked', 'location-popup-fadeout');
            }, 1100);
        });
    }

    function formatDurationMinutes(durationMin) {
        const hr = Math.floor(durationMin / 60);
        const min = durationMin % 60;
        if (hr > 0) {
            return `${hr} hr${hr > 1 ? 's' : ''} ${min} min`;
        } else {
            return `${min} min`;
        }
    }

    const cancelRouteBtn = document.getElementById('cancel-route-btn');
    cancelRouteBtn.onclick = function() {
        if (window.clearCurrentRoute) {
            window.clearCurrentRoute();
        } else {
            if (routePolyline) {
                map.removeLayer(routePolyline);
                routePolyline = null;
                clearPersistentRoute();
            }
            hideRouteInfoBox();
            if (window.startLocationMarker) {
                map.removeLayer(window.startLocationMarker);
                window.startLocationMarker = null;
            }
            if (destinationMarker) {
                map.removeLayer(destinationMarker);
                destinationMarker = null;
            }
            if (clickMarker) {
                map.removeLayer(clickMarker);
                clickMarker = null;
            }
        }
        cancelRouteBtn.style.display = 'none';
    };

    function showRouteInfoBox(distanceKm, durationMin, destName, trafficInfo) {
        const box = document.getElementById('route-info-box');
        const etaStr = formatDurationMinutes(durationMin);
        let distanceStr = '';
        if (useMiles) {
            const miles = (parseFloat(distanceKm) * 0.621371).toFixed(2);
            distanceStr = `${miles} mi`;
        } else {
            distanceStr = `${distanceKm} km`;
        }
        let trafficDisplay = '';
        if (trafficInfo && trafficInfo.hasTrafficData) {
            const trafficLevel = trafficInfo.trafficLevel;
            const delay = trafficInfo.trafficDelay;
            const trafficClass = `traffic-${trafficLevel}`;
            trafficDisplay = `
                <span class=\"traffic-info ${trafficClass}\">
                    ${getTrafficIcon(trafficLevel)} ${trafficLevel.charAt(0).toUpperCase() + trafficLevel.slice(1)} traffic
                    ${delay > 0 ? `<span class=\"traffic-delay\">(+${delay} min)</span>` : ''}
                </span>
            `;
        } else {
            trafficDisplay = '<span class=\"traffic-info traffic-unknown\">⚪ No traffic data</span>';
        }
        box.innerHTML = `
            <button id=\"cancel-route-btn\" title=\"Cancel Route\" style=\"display:block; position:absolute; top:12px; right:16px; width:28px; height:28px; background:#fff; color:#E50000; border:2px solid #E50000; border-radius:50%; font-size:1.3rem; font-weight:700; box-shadow:0 2px 8px rgba(0,0,0,0.08); cursor:pointer; z-index:2; line-height:1; padding:0; transition:background 0.2s;\">&times;</button>
            <span class=\"route-icon\">
                <svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#004D98\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\"></path><circle cx=\"12\" cy=\"10\" r=\"3\"></circle></svg>
            </span>
            <span>Route to <b>${destName}</b>: <span style=\"color:#004D98\">${distanceStr}</span>, ETA: <span style=\"color:#004D98\">${etaStr}</span> ${trafficDisplay}</span>
        `;
        box.classList.add('visible');
        box.style.display = '';

        const newCancelBtn = document.getElementById('cancel-route-btn');
        if (newCancelBtn) {
            newCancelBtn.onclick = cancelRouteBtn.onclick;
            newCancelBtn.style.display = 'block';
        }
 
        window.lastRouteInfo = { distanceKm, durationMin, destName, trafficInfo };
    }

    function getTrafficColor(level) {
        switch (level) {
            case 'light': return '#4CAF50';
            case 'moderate': return '#FF9800';
            case 'heavy': return '#F44336';
            case 'severe': return '#9C27B0';
            default: return '#888';
        }
    }

    function getTrafficIcon(level) {
        switch (level) {
            case 'light': return '🟢';
            case 'moderate': return '🟡';
            case 'heavy': return '🟠';
            case 'severe': return '🔴';
            default: return '⚪';
        }
    }

    function getRouteColor(level) {
        switch (level) {
            case 'light': return '#4CAF50';
            case 'moderate': return '#FF9800';
            case 'heavy': return '#F44336';
            case 'severe': return '#9C27B0';
            default: return '#004D98';
        }
    }

    function hideRouteInfoBox() {
        const box = document.getElementById('route-info-box');
        const cancelBtn = document.getElementById('cancel-route-btn');
        if (box) {
            box.classList.remove('visible');
            setTimeout(() => { if (box) box.style.display = 'none'; }, 300);
        }
        if (cancelBtn) cancelBtn.style.display = 'none';
    }

    function showFindingRouteInInfoBox(destName) {
        const box = document.getElementById('route-info-box');
        box.innerHTML = `
            <span class="spinner"></span> 
            <span>Finding route to <b>${destName}</b>...</span>
        `;
        box.classList.add('visible');
        box.style.display = '';
    }

    async function getRouteAndDisplay(userCoords, destCoords, destName) {
        if (!userCoords || !destCoords || !destCoords.lat || !destCoords.lng) return;
        currentDestination = { lat: destCoords.lat, lng: destCoords.lng, name: destName };

        if (routePolyline) {
            map.removeLayer(routePolyline);
            routePolyline = null;
        }

        if (currentRouteAbortController) {
            currentRouteAbortController.abort();
        }
        currentRouteAbortController = new AbortController();

        showFindingRouteInInfoBox(destName);
        try {
            let routeData = null;

        
            if (userCoords && destCoords && destCoords.lat && destCoords.lng) {
                routeData = await getOSRMRoute(userCoords, destCoords);
                console.log('Using OSRM (no traffic data)');
            }

            if (!routeData) {
                showToast('No route found between your location and the destination.');
                hideRouteInfoBox();
                return;
            }

        
            const routeColor = getRouteColor(routeData.trafficInfo ? routeData.trafficInfo.trafficLevel : 'unknown');
            routePolyline = L.polyline(routeData.coordinates, {
                color: routeColor,
                weight: 5,
                opacity: 0.8
            }).addTo(map);
            map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });

       
            // Send route data to React app
            const routeDataToSend = {
                start: userCoords,
                destination: destCoords,
                destinationName: destName,
                distance: routeData.distanceKm,
                duration: routeData.durationMin,
                trafficInfo: routeData.trafficInfo,
                coordinates: routeData.coordinates
            };
            sendRouteToReact(routeDataToSend);
            
            // Save route persistently
            savePersistentRoute(routeDataToSend, { lat: destCoords.lat, lng: destCoords.lng, name: destName });

            const { distanceKm, durationMin, trafficInfo } = routeData;
            showRouteInfoBox(distanceKm, durationMin, destName, trafficInfo);

        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Previous route fetch aborted.');
                hideRouteInfoBox();
                return;
            }
            showToast('Could not fetch route/ETA.');
            hideRouteInfoBox();
            console.error('Route fetch exception:', err);
        } finally {
            currentRouteAbortController = null;
        }
    }

    async function getOSRMRoute(userCoords, destCoords) {
        const url = `https://router.project-osrm.org/route/v1/driving/${userCoords.lng},${userCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson`;
        
        const response = await fetch(url, { signal: currentRouteAbortController.signal });
        if (!response.ok) {
            throw new Error('OSRM API request failed');
        }
        
        const data = await response.json();
        if (!data.routes || !data.routes[0] || !data.routes[0].geometry) {
            throw new Error('No route found in OSRM response');
        }
        
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const durationMin = Math.round(route.duration / 60);
        const distanceKm = (route.distance / 1000).toFixed(2);
        
        return {
            coordinates,
            distanceKm,
            durationMin,
            trafficInfo: { hasTrafficData: false }
        };
    }

  
    function decodePolyline(encoded) {
        const poly = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;

        while (index < len) {
            let shift = 0, result = 0;

            do {
                let b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (result >= 0x20);

            let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;

            do {
                let b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (result >= 0x20);

            let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            poly.push([lat / 1E5, lng / 1E5]);
        }

        return poly;
    }


    function getTrafficLevel(leg) {
        if (!leg.duration_in_traffic) return 'unknown';
        
        const delay = leg.duration_in_traffic.value - leg.duration.value;
        const delayMinutes = delay / 60;
        const delayPercentage = (delay / leg.duration.value) * 100;
        
        if (delayPercentage < 10) return 'light';
        if (delayPercentage < 25) return 'moderate';
        if (delayPercentage < 50) return 'heavy';
        return 'severe';
    }

  
    function startWatchingUserLocation() {
        if (!navigator.geolocation) {
            showToast('Geolocation is not supported by your browser.');
            return;
        }
        if (userLocationWatchId !== null) {
            navigator.geolocation.clearWatch(userLocationWatchId);
        }
        userLocationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                userCoords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                showUserLocationOnMap(userCoords);
                
                if (currentDestination) {
                    getRouteAndDisplay(userCoords, { lat: currentDestination.lat, lng: currentDestination.lng }, currentDestination.name);
                }
            },
            (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    showToast('Location permission denied. Please allow location access for routing.');
                } else {
                    showToast('Unable to retrieve your location.');
                }
                userCoords = null;
                if (userLocationMarker) {
                    map.removeLayer(userLocationMarker);
                    userLocationMarker = null;
                }
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
        );
    }

    selectLocationBtn.addEventListener('click', () => {
        isSelectLocationMode = !isSelectLocationMode;
        selectLocationBtn.classList.toggle('active', isSelectLocationMode);
        document.getElementById('map-container').classList.toggle('pin-drop-mode', isSelectLocationMode);
        if (isSelectLocationMode) {
            showToast('Select a location on the map.');
            selectLocationBtn.setAttribute('data-tooltip', 'Disable Pin Drop Location Mode');
        } else {
            showToast('Selection mode disabled.');
            selectLocationBtn.setAttribute('data-tooltip', 'Enable Pin Drop Location Mode');
            if (clickMarker) {
                map.removeLayer(clickMarker);
                clickMarker = null;
            }
        }
    });

    map.on('click', onMapClick);

    async function onMapClick(e) {
        if (!isSelectLocationMode) return;
        
        const { lat, lng } = e.latlng;

        if (clickMarker) {
            map.removeLayer(clickMarker);
        }

        clickMarker = L.marker([lat, lng]).addTo(map);
        clickMarker.bindPopup("Resolving location...").openPopup();

     
        isSelectLocationMode = false;
        selectLocationBtn.classList.remove('active');
        selectLocationBtn.setAttribute('data-tooltip', 'Enable Pin Drop Location Mode');
        document.getElementById('map-container').classList.remove('pin-drop-mode');

        try {
            const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}&limit=1`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const locationName = data.results[0].formatted;
                
                // Send location data to React app
                sendLocationToReact({
                    lat: lat,
                    lng: lng,
                    name: locationName,
                    type: 'map_click'
                });
                
                const popupContent = `
                    <div class="map-click-popup">
                        <div class="popup-location-name">${locationName}</div>
                        <button id="popup-directions-btn" class="popup-directions-button">Get Directions</button>
                    </div>
                `;
                
                clickMarker.bindPopup(popupContent).openPopup();
            } else {
                clickMarker.bindPopup("Could not identify location.").openPopup();
            }
        } catch (error) {
            console.error("Reverse geocoding failed:", error);
            if (clickMarker) {
                map.removeLayer(clickMarker);
            }
        }
    }


    startWatchingUserLocation();

    const popupObserver = new MutationObserver(() => {
        const btn = document.querySelector('.leaflet-popup-content #popup-directions-btn');
        if (btn && !btn._handlerAttached) {
            btn._handlerAttached = true;
            btn.onclick = function() {
  
                const popup = btn.closest('.leaflet-popup-content');
                const marker = Object.values(map._layers).find(l => l._popup && l._popup._contentNode === popup);
                const latlng = marker ? marker.getLatLng() : null;
                const locationName = popup.innerHTML.match(/<div class=\"popup-location-name\">(.*?)<\/div>/)?.[1] || 'Selected Location';
                if (latlng) {
    
                    showStartLocationModal({ lat: latlng.lat, lng: latlng.lng, name: locationName });
                    map.closePopup();
                } else {
                    showToast('Could not determine destination coordinates.');
                }
                isSelectLocationMode = false;
                selectLocationBtn.classList.remove('active');
                selectLocationBtn.setAttribute('data-tooltip', 'Enable Pin Drop Location Mode');
                document.getElementById('map-container').classList.remove('pin-drop-mode');
            };
        }
    });

    map.on('popupopen', function(e) {
        popupObserver.observe(e.popup._contentNode, { childList: true, subtree: true });
    });
    map.on('popupclose', function(e) {
        popupObserver.disconnect();
    });


    const startLocationModal = document.getElementById('start-location-modal');
    const modalUseMyLocation = document.getElementById('modal-use-my-location');
    const modalSelectOnMap = document.getElementById('modal-select-on-map');
    const modalCancel = document.getElementById('modal-cancel');

    let pendingDestination = null;
    let isSelectingStartOnMap = false;

    function showStartLocationModal(destination) {
        pendingDestination = destination;
        startLocationModal.style.display = 'flex';
    }
    function hideStartLocationModal() {
        startLocationModal.style.display = 'none';
    }

    modalUseMyLocation.onclick = function() {
        hideStartLocationModal();
        if (userCoords && pendingDestination) {
            getRouteAndDisplay(userCoords, pendingDestination, pendingDestination.name || 'Destination');
            pendingDestination = null;
        } else {
            showToast('User location not available.');
        }
    };
    modalSelectOnMap.onclick = function() {
        hideStartLocationModal();
        isSelectingStartOnMap = true;
        showToast('Click on the map to select your start location.');
        document.getElementById('map-container').classList.add('pin-drop-mode');
    };
    modalCancel.onclick = function() {
        hideStartLocationModal();
        pendingDestination = null;
    };

    map.on('click', function(e) {
        if (!isSelectingStartOnMap) return;
        isSelectingStartOnMap = false;
        document.getElementById('map-container').classList.remove('pin-drop-mode');
        console.log('Map click for start location:', e.latlng, 'pendingDestination:', pendingDestination);
        if (pendingDestination && pendingDestination.lat && pendingDestination.lng) {
      
            if (window.startLocationMarker) map.removeLayer(window.startLocationMarker);
            window.startLocationMarker = L.marker([e.latlng.lat, e.latlng.lng], {
                icon: L.divIcon({
                    className: 'start-marker',
                    html: '<div style="background-color: #004D98; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                })
            }).addTo(map).bindPopup('Start Location').openPopup();
            getRouteAndDisplay(
                { lat: e.latlng.lat, lng: e.latlng.lng },
                { lat: pendingDestination.lat, lng: pendingDestination.lng },
                pendingDestination.name || 'Destination'
            );
            pendingDestination = null;
        } else {
            console.warn('No valid pendingDestination for routing!');
            showToast('Please select a valid destination.');
        }
    });

    const style = document.createElement('style');
    style.innerHTML = `
    .start-marker { background: transparent !important; border: none !important; }
    .start-marker div {
      background-color: #004D98 !important;
      width: 18px !important;
      height: 18px !important;
      border-radius: 50% !important;
      border: 3px solid white !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
      animation: pulse 2s infinite;
    }`;
    document.head.appendChild(style);

    // Function to send location data to React app
    function sendLocationToReact(locationData) {
        // Store in localStorage for React app to read
        localStorage.setItem('mapLocationData', JSON.stringify(locationData));
        
        // Also update URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('lat', locationData.lat);
        urlParams.set('lng', locationData.lng);
        urlParams.set('name', locationData.name);
        urlParams.set('timestamp', Date.now());
        
        // Update URL without page reload
        window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
        
        console.log('Location data sent to React app:', locationData);
    }

    // Function to send route data to React app
    function sendRouteToReact(routeData) {
        const routeInfo = {
            ...routeData,
            timestamp: Date.now()
        };
        
        localStorage.setItem('mapRouteData', JSON.stringify(routeInfo));
        console.log('Route data sent to React app:', routeInfo);
    }

    // Persistent route storage keys
    const PERSISTENT_ROUTE_KEY = 'persistentRouteData';
    const PERSISTENT_DESTINATION_KEY = 'persistentDestination';
    
    // Function to save route data persistently
    function savePersistentRoute(routeData, destination) {
        if (routeData && destination) {
            localStorage.setItem(PERSISTENT_ROUTE_KEY, JSON.stringify(routeData));
            localStorage.setItem(PERSISTENT_DESTINATION_KEY, JSON.stringify(destination));
            console.log('Route saved persistently:', routeData);
        }
    }
    
    // Function to load and restore persistent route
    function loadPersistentRoute() {
        try {
            const savedRouteData = localStorage.getItem(PERSISTENT_ROUTE_KEY);
            const savedDestination = localStorage.getItem(PERSISTENT_DESTINATION_KEY);
            
            if (savedRouteData && savedDestination) {
                const routeData = JSON.parse(savedRouteData);
                const destination = JSON.parse(savedDestination);
                
                // Restore the route polyline
                if (routeData.coordinates && routeData.coordinates.length > 0) {
                    const routeColor = getRouteColor(routeData.trafficInfo ? routeData.trafficInfo.trafficLevel : 'unknown');
                    routePolyline = L.polyline(routeData.coordinates, {
                        color: routeColor,
                        weight: 5,
                        opacity: 0.8
                    }).addTo(map);
                    
                    // Fit map to show the route
                    map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
                    
                    // Restore destination marker
                    if (destination.lat && destination.lng) {
                        if (destinationMarker) map.removeLayer(destinationMarker);
                        destinationMarker = L.marker([destination.lat, destination.lng], {
                            icon: L.divIcon({
                                className: 'destination-marker',
                                html: '<div style="background-color: #FF6B35; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                                iconSize: [20, 20],
                                iconAnchor: [10, 10]
                            })
                        }).addTo(map).bindPopup(destination.name || 'Destination');
                    }
                    
                    // Restore route info box
                    if (routeData.distance && routeData.duration) {
                        showRouteInfoBox(
                            routeData.distance, 
                            routeData.duration, 
                            destination.name || 'Destination',
                            routeData.trafficInfo
                        );
                    }
                    
                    // Set current destination for future updates
                    currentDestination = destination;
                    
                    console.log('Persistent route restored:', routeData);
                    return true;
                }
            }
        } catch (error) {
            console.error('Error loading persistent route:', error);
        }
        return false;
    }
    
    // Function to clear persistent route
    function clearPersistentRoute() {
        localStorage.removeItem(PERSISTENT_ROUTE_KEY);
        localStorage.removeItem(PERSISTENT_DESTINATION_KEY);
        console.log('Persistent route cleared');
    }
    
    // Global function to clear current route (accessible from UI)
    window.clearCurrentRoute = function() {
        if (routePolyline) {
            map.removeLayer(routePolyline);
            routePolyline = null;
        }
        if (destinationMarker) {
            map.removeLayer(destinationMarker);
            destinationMarker = null;
        }
        clearPersistentRoute();
        hideRouteInfoBox();
        currentDestination = null;
        
        // Clear route data sent to React app
        localStorage.removeItem('mapRouteData');
        
        console.log('Current route cleared');
    };

    // --- Reroute Modal ---
    function showRerouteModal(crossingId, rerouteCallback) {
        // Remove existing modal if present
        const existing = document.getElementById('reroute-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'reroute-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.35)';
        modal.style.zIndex = '99999';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        modal.innerHTML = `
          <div style="background:#fff; border-radius:1.2rem; padding:2.5rem 2.5rem 2rem 2.5rem; box-shadow:0 2px 16px rgba(0,0,0,0.18); min-width:320px; max-width:90vw; margin:auto; text-align:center;">
            <h2 style="margin-top:0; font-size:1.6rem; font-weight:600; color:#004D98;">Reroute Suggested</h2>
            <p style="margin:1rem 0 2rem 0; font-size:1.1rem; color:#333;">A train is predicted to close a crossing ahead. Would you like to reroute?</p>
            <button id="reroute-confirm-btn" style="margin:1rem 0; width:100%; padding:1rem; font-size:1.2rem; border-radius:0.7rem; border:none; background:#16a34a; color:#fff; font-weight:500; cursor:pointer;">Reroute</button>
            <button id="reroute-cancel-btn" style="margin:0.5rem 0 0 0; width:100%; padding:1rem; font-size:1.2rem; border-radius:0.7rem; border:none; background:#eee; color:#333; font-weight:500; cursor:pointer;">Ignore and Continue</button>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('reroute-confirm-btn').onclick = function() {
            modal.remove();
            rerouteCallback && rerouteCallback(crossingId);
        };
        document.getElementById('reroute-cancel-btn').onclick = function() {
            modal.remove();
        };
    }

    // Listen for reroute event via localStorage (from dashboard or other tab)
    window.addEventListener('storage', function(e) {
        if (e.key === 'rerouteCrossing' && e.newValue) {
            const crossingId = e.newValue;
            showRerouteModal(crossingId, rerouteCrossingOnMap);
        }
    });

    // Example reroute logic: generate a new route avoiding the problematic crossing
    async function rerouteCrossingOnMap(crossingId) {
        // Load the crossings index (only once)
        if (!window.crossingsIndex) {
            try {
                const resp = await fetch('js/crossings_index.json');
                window.crossingsIndex = await resp.json();
            } catch (e) {
                showToast('Could not load crossings index.');
                return;
            }
        }
        const crossing = window.crossingsIndex[crossingId];
        if (!crossing) {
            showToast('Crossing not found in index.');
            return;
        }
        // Calculate a detour point ~200m perpendicular to the route at the crossing
        // For simplicity, just offset the crossing coordinates slightly
        const detourLat = crossing.lat + 0.002; // ~200m north
        const detourLng = crossing.lng + 0.002; // ~200m east

        if (!userCoords || !currentDestination) {
            showToast('User location or destination not set.');
            return;
        }
        // Request a route: start -> detour -> destination
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userCoords.lng},${userCoords.lat};${detourLng},${detourLat};${currentDestination.lng},${currentDestination.lat}?overview=full&geometries=geojson`;
        showFindingRouteInInfoBox(currentDestination.name || 'Destination');
        try {
            const resp = await fetch(osrmUrl);
            if (!resp.ok) throw new Error('OSRM request failed');
            const data = await resp.json();
            if (!data.routes || !data.routes[0] || !data.routes[0].geometry) throw new Error('No route found');
            const route = data.routes[0];
            const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            const durationMin = Math.round(route.duration / 60);
            const distanceKm = (route.distance / 1000).toFixed(2);
            if (routePolyline) map.removeLayer(routePolyline);
            routePolyline = L.polyline(coordinates, { color: '#16a34a', weight: 5, opacity: 0.8 }).addTo(map);
            map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
            // Save and send route
            const routeDataToSend = {
                start: userCoords,
                destination: currentDestination,
                destinationName: currentDestination.name,
                distance: distanceKm,
                duration: durationMin,
                trafficInfo: { hasTrafficData: false },
                coordinates
            };
            sendRouteToReact(routeDataToSend);
            savePersistentRoute(routeDataToSend, currentDestination);
            showRouteInfoBox(distanceKm, durationMin, currentDestination.name, { hasTrafficData: false });
            showToast('Rerouted to avoid crossing.');
        } catch (err) {
            showToast('Could not reroute: ' + err.message);
        }
    }
}); 