// map.js
import { getUrlParameter, setUrlParameters, saveMapCenterToCookies, getUserPosition } from './utils.js';
import { onMapClick, isAddingSource } from './addSource.js';
import { fetchDataAndAddMarkers } from './data.js';
import { populateFilters, setupFilterEventListeners } from './filters.js';

const addGeolocateButton = (map) => {
    const container = document.getElementById('geolocate-container');
    const button = document.createElement('button');
    button.innerHTML = '<i class="fas fa-location-arrow"></i>';
    button.title = 'Show My Location';
    button.className = 'leaflet-control-custom';
    button.onclick = (e) => {
        e.stopPropagation();
        getUserPosition((position) => {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            map.setView(new L.LatLng(userLat, userLon), 15);
            L.marker([userLat, userLon]).addTo(map)
                .bindPopup('You are here!')
                .openPopup();
        });
    };

    container.appendChild(button);
};

const addNewToiletSourceButton = (map) => {
    const addSourceControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            const button = L.DomUtil.create('button', 'add-source-button', container);
            button.innerHTML = 'Add Toilet';
            button.title = 'Add new toilet';

            L.DomEvent.on(button, 'click', function(e) {
                L.DomEvent.stopPropagation(e);
                if (isAddingSource) return;

                const hasSeenAddModal = Cookies.get('hasSeenAddModal');
                const startAdding = () => {
                    map.getContainer().style.cursor = 'crosshair';
                    toastr.info('Click on the map to place a new toilet');
                    map.on('click', onMapClick);

                    map.once('click', function() {
                        map.getContainer().style.cursor = '';
                    });

                    Cookies.set('hasSeenAddModal', 'true', { expires: 365 });
                };

                if (!hasSeenAddModal) {
                    showModal(startAdding);
                } else {
                    startAdding();
                }
            });

            return container;
        }
    });

    map.addControl(new addSourceControl({ position: 'bottomright' }));
};

const initializeMap = () => {
    const initialLat = parseFloat(getUrlParameter('lat')) || parseFloat(Cookies.get('mapLat')) || 45.9432;
    const initialLon = parseFloat(getUrlParameter('lon')) || parseFloat(Cookies.get('mapLon')) || 24.9668;
    const initialZoom = parseInt(getUrlParameter('z'), 10) || parseInt(Cookies.get('mapZoom'), 10) || 7;

    const map = L.map('mapid').setView([initialLat, initialLon], initialZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    addGeolocateButton(map);
    addNewToiletSourceButton(map);
    fetchDataAndAddMarkers(map);

    const updateMapState = () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        setUrlParameters({
            lat: center.lat.toFixed(6),
            lon: center.lng.toFixed(6),
            z: zoom
        });
        saveMapCenterToCookies(map);
    };

    map.on('moveend', updateMapState);
    map.on('zoomend', updateMapState);

    return map;
};

const mymap = initializeMap();

document.addEventListener("DOMContentLoaded", async function() {
    const bounds = mymap.getBounds();
    const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;

    const response = await fetch(`/data?bbox=${bbox}`);
    const data = await response.json();

    // Get top key-value pairs
    const topKeyValues = getTopKeyValues(data);
    console.log('Top key-value pairs:', topKeyValues);

    // Populate filters
    populateFilters(topKeyValues);
    setupFilterEventListeners(mymap);

    // Initial load of markers without filters
    await fetchDataAndAddMarkers(mymap);
});

export { mymap, addGeolocateButton, initializeMap, addNewToiletSourceButton, setupFilterEventListeners, populateFilters };
