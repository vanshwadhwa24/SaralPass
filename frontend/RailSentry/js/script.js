// Add your scripts here 

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

    let userCoords = null;
    let userLocationInfo = null; // To store city, state, country
    let debounceTimer = null;
    const OPENCAGE_API_KEY = 'c5fff8aba63d4fd2aa64d2d14c320f5a';

    const map = L.map('map-container', {
        center: [30.3398, 76.3869],
        zoom: 13,
        zoomControl: false
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let userLocationMarker = null;

    // --- Recent Searches ---
    const RECENT_SEARCHES_KEY = 'recent_searches';
    const RECENT_SEARCHES_LIMIT = 5;

    function getRecentSearches() {
        return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || [];
    }
    function addRecentSearch(query) {
        if (!query) return;
        let recents = getRecentSearches();
        // Remove if already exists
        recents = recents.filter(item => item !== query);
        recents.unshift(query);
        if (recents.length > RECENT_SEARCHES_LIMIT) recents = recents.slice(0, RECENT_SEARCHES_LIMIT);
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
        // Scroll into view if needed
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
            searchSuggestionsContainer.innerHTML = '<div class="suggestion-no-results">No recent searches</div>';
        } else {
            positionSuggestions();
            recents.forEach(query => {
                const item = document.createElement('div');
                item.classList.add('suggestion-item');
                item.innerHTML = `<span class="suggestion-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span><span>${query}</span>`;
                item.addEventListener('click', () => {
                    searchInput.value = query;
                    fetchSuggestions();
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
                
                if (userLocationMarker) map.removeLayer(userLocationMarker);
                userLocationMarker = L.marker(location).addTo(map).bindPopup(data.results[0].formatted).openPopup();
                
                searchInput.value = '';
                if (expandableMenu.classList.contains('open')) {
                    toggleMenu();
                }
            } else {
                showToast('Location not found. Please try another search.');
            }
        } catch (error) {
            console.error("Search failed:", error);
            showToast('An error occurred during the search. Please try again.');
        }
    };

    const fetchSuggestions = async () => {
        let query = searchInput.value;
        if (query.length < 1) {
            searchSuggestionsContainer.classList.remove('visible');
            return;
        }

        // Add user's location context to the query for more relevant results
        if (userLocationInfo) {
            const context = [userLocationInfo.city, userLocationInfo.state, userLocationInfo.country].filter(Boolean).join(', ');
            query = `${query}, ${context}`;
        }

        let apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${OPENCAGE_API_KEY}&limit=5&min_confidence=3`;
        if (userCoords) {
            apiUrl += `&proximity=${userCoords.lat},${userCoords.lng}`;
        }
        
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            displaySuggestions(data.results);
        } catch (error) {
            console.error("Suggestion fetch failed:", error);
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
            searchSuggestionsContainer.innerHTML = '<div class="suggestion-no-results">No results found</div>';
            searchSuggestionsContainer.classList.add('visible');
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
                
                if (userLocationMarker) map.removeLayer(userLocationMarker);
                userLocationMarker = L.marker(location).addTo(map).bindPopup(result.formatted).openPopup();
                
                searchInput.value = '';
                searchSuggestionsContainer.classList.remove('visible');
                if (expandableMenu.classList.contains('open')) {
                    toggleMenu();
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
        debounceTimer = setTimeout(fetchSuggestions, 100);
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
        if (!navigator.geolocation) {
            showToast("Geolocation is not supported by your browser.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                // Store coordinates for search biasing
                userCoords = {
                    lat: latitude,
                    lng: longitude
                };

                // Reverse geocode to get city, state, country for better search context
                const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${userCoords.lat}+${userCoords.lng}&key=${OPENCAGE_API_KEY}`);
                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    const components = data.results[0].components;
                    userLocationInfo = {
                        city: components.city || components.town || components.village,
                        state: components.state,
                        country: components.country
                    };
                }

                const location = new L.LatLng(latitude, longitude);
                map.setView(location, 15);
                if (userLocationMarker) map.removeLayer(userLocationMarker);
                userLocationMarker = L.circleMarker(location, { radius: 8, color: '#fff', weight: 2, fillColor: '#004D98', fillOpacity: 1 }).addTo(map).bindPopup('<span class="large-popup-text">You are here</span>').openPopup();
            },
            () => {
                showToast("Unable to retrieve your location. Please ensure location services are enabled.");
            }
        );
    };

    navButton.addEventListener('click', findUserLocation);

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.search-bar-container')) {
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

    // --- Location Permission Popup ---
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
            // Request geolocation permission
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
}); 