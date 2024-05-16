//map.js

document.addEventListener("DOMContentLoaded", function() {
    const initialLat = parseFloat(getUrlParameter('lat')) || parseFloat(Cookies.get('mapLat')) || 45.943200;
    const initialLon = parseFloat(getUrlParameter('lon')) || parseFloat(Cookies.get('mapLon')) || 24.966800;
    const initialZoom = parseInt(getUrlParameter('z'), 10) || parseInt(Cookies.get('mapZoom'), 10) || 7;

    window.mymap = L.map('mapid').setView([initialLat, initialLon], initialZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(mymap);

    const updateMapState = () => {
        const center = mymap.getCenter();
        const z = mymap.getZoom();
        setUrlParameters({
            lat: center.lat.toFixed(6),
            lon: center.lng.toFixed(6),
            z: z
        });
        saveMapCenterToCookies(mymap);
    };

    mymap.on('moveend', updateMapState);
    mymap.on('zoomend', updateMapState);

    window.routeLayer = null;
    window.highlightedSegment = null;

    fetchDataAndAddMarkers();

    // Add the search functionality
    addSearchControl();
});
