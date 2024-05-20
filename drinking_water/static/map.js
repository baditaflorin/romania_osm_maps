//map.js

// Function to add a geolocate button to the map
const addGeolocateButton = () => {
    const geolocateControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            const button = L.DomUtil.create('button', '', container);
            button.innerHTML = '<i class="fas fa-location-arrow"></i>';
            button.title = 'Show My Location';

            L.DomEvent.on(button, 'click', function(e) {
                L.DomEvent.stopPropagation(e);
                getUserPosition((position) => {
                    const userLat = position.coords.latitude;
                    const userLon = position.coords.longitude;
                    map.setView(new L.LatLng(userLat, userLon), 15);
                    L.marker([userLat, userLon]).addTo(map)
                        .bindPopup('You are here!')
                        .openPopup();
                });
            });

            return container;
        }
    });

    mymap.addControl(new geolocateControl({ position: 'topright' }));
};

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

    // Add the geolocate button
    addGeolocateButton();

    // Add the button for adding a new drinking source
    addNewDrinkingSourceButton();
});

