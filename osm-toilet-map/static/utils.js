// utils.js

export const getUrlParameter = (name) => {
    const regex = new RegExp(`[\\?&]${name}=([^&#]*)`);
    const results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

export const setUrlParameters = (params) => {
    const baseUrl = `${location.protocol}//${location.host}${location.pathname}`;
    const urlParams = new URLSearchParams(location.search);

    for (const key in params) {
        urlParams.set(key, params[key]);
    }

    window.history.replaceState({}, '', `${baseUrl}?${urlParams.toString()}`);
};

export const updateTitleAndCount = (markers) => {
    let knownToiletsCount = 0;
    let unknownCount = 0;

    markers.eachLayer(marker => {
        const node = marker.options.node; // Store the node in marker options
        if (node && (node.tags.amenity === 'toilets' || node.tags.toilets === 'yes')) {
            knownToiletsCount++;
        } else {
            unknownCount++;
        }
    });

    const titleElement = document.getElementById('title');
    const newTitle = `Public Toilets: ${knownToiletsCount} locations found, ${unknownCount} unknown`;
    titleElement.textContent = newTitle;
};




export const getStepInstruction = (step) => {
    const { type, modifier } = step.maneuver;
    const action = modifier ? `Turn ${modifier}` : 'Continue';
    const road = step.name || 'the road';
    return type === 'depart'
        ? `Start on ${road}`
        : type === 'arrive'
            ? 'Arrive at your destination'
            : `${action} onto ${road}`;
};

export const saveMapCenterToCookies = (mymap) => {
    const center = mymap.getCenter();
    const z = mymap.getZoom();
    const lat = center.lat.toFixed(6);
    const lon = center.lng.toFixed(6);

    Cookies.set('mapLat', lat, { expires: 2 });
    Cookies.set('mapLon', lon, { expires: 2 });
    Cookies.set('mapZoom', z, { expires: 2 });
};

export const getUserPosition = (callback) => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(callback, (error) => console.error("Error getting user position:", error));
    } else {
        console.error("Geolocation is not supported by this browser.");
    }
};
