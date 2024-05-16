//utils.js Utility functions
const getUrlParameter = (name) => {
    const regex = new RegExp(`[\\?&]${name}=([^&#]*)`);
    const results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

const setUrlParameter = (key, value) => {
    const baseUrl = [location.protocol, '//', location.host, location.pathname].join('');
    const urlQueryString = document.location.search;
    const newParam = `${key}=${value}`;
    const params = urlQueryString ? urlQueryString.replace(new RegExp(`([?&])${key}[^&]*`), `$1${newParam}`) : `?${newParam}`;
    window.history.replaceState({}, '', baseUrl + params);
};

// Update the title and count of the elements
const updateTitleAndCount = (count) => {
    return () => {
        const titleElement = document.getElementById('title');
        const newTitle = `Drinking Water Locations in Romania: ${count} locations found`;
        titleElement.textContent = newTitle;
    };
};

// Generate step instructions for navigation
const getStepInstruction = (step) => {
    const { type, modifier } = step.maneuver;
    const action = modifier ? `Turn ${modifier}` : 'Continue';
    const road = step.name || 'the road';
    return type === 'depart'
        ? `Start on ${road}`
        : type === 'arrive'
            ? 'Arrive at your destination'
            : `${action} onto ${road}`;
};

const saveMapCenterToCookies = (mymap) => {
    const center = mymap.getCenter();
    const zoom = mymap.getZoom();
    const lat = center.lat.toFixed(6);
    const lon = center.lng.toFixed(6);

    Cookies.set('mapLat', lat, { expires: 2 });
    Cookies.set('mapLon', lon, { expires: 2 });
    Cookies.set('mapZoom', zoom, { expires: 2 });
};

// Function to get the user's current position
const getUserPosition = (callback) => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(callback, (error) => console.error("Error getting user position:", error));
    } else {
        console.error("Geolocation is not supported by this browser.");
    }
};