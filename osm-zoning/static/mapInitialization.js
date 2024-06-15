// mapInitialization.js

export function initializeMap(lat, lon, zoom) {
    const mymap = L.map('mapid').setView([lat, lon], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(mymap);

    window.markers = L.markerClusterGroup(); // Define markers globally
    mymap.addLayer(markers);

    return mymap;
}

export function updateMapView(mymap, center, zoom) {
    mymap.setView(center, zoom);
}
