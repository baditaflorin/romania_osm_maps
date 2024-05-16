// map.js
document.addEventListener("DOMContentLoaded", function() {
    const initialLat = parseFloat(getUrlParameter('lat')) || parseFloat(Cookies.get('mapLat')) || 45.943200;
    const initialLon = parseFloat(getUrlParameter('lon')) || parseFloat(Cookies.get('mapLon')) || 24.966800;
    const initialZoom = parseInt(getUrlParameter('zoom'), 10) || parseInt(Cookies.get('mapZoom'), 10) || 7;

    window.mymap = L.map('mapid').setView([initialLat, initialLon], initialZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(mymap);

    const updateMapState = () => {
        const center = mymap.getCenter();
        setUrlParameter('lat', center.lat.toFixed(6));
        setUrlParameter('lon', center.lng.toFixed(6));
        setUrlParameter('zoom', mymap.getZoom());
        saveMapCenterToCookies(mymap);
    };

    mymap.on('moveend', updateMapState);
    mymap.on('zoomend', updateMapState);

    window.routeLayer = null;
    window.highlightedSegment = null;
});

