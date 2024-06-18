// map.js

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

document.addEventListener("DOMContentLoaded", function() {
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
});



const initializeMap = () => {
    const initialLat = parseFloat(getUrlParameter('lat')) || parseFloat(Cookies.get('mapLat')) || 45.943200;
    const initialLon = parseFloat(getUrlParameter('lon')) || parseFloat(Cookies.get('mapLon')) || 24.966800;
    const initialZoom = parseInt(getUrlParameter('z'), 10) || parseInt(Cookies.get('mapZoom'), 10) || 7;

    const map = L.map('mapid').setView([initialLat, initialLon], initialZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    const updateMapState = () => {
        const center = map.getCenter();
        const z = map.getZoom();
        setUrlParameters({
            lat: center.lat.toFixed(6),
            lon: center.lng.toFixed(6),
            z: z
        });
        saveMapCenterToCookies(map);
    };

    map.on('moveend', updateMapState);
    map.on('zoomend', updateMapState);

    return map;
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


const setupEventListeners = (map) => {
    document.getElementById('apply-filters').addEventListener('click', () => {
        const selectedFilters = Array.from(document.querySelectorAll('#filters input:checked')).map(input => ({
            key: input.getAttribute('data-key'),
            value: input.getAttribute('data-value')
        }));

        const filterCriteria = selectedFilters.reduce((criteria, filter) => {
            if (!criteria[filter.key]) {
                criteria[filter.key] = [];
            }
            criteria[filter.key].push(filter.value);
            return criteria;
        }, {});

        fetchDataAndAddMarkers(map, filterCriteria);
    });

    document.getElementById('clear-filters').addEventListener('click', () => {
        document.querySelectorAll('#filters input:checked').forEach(input => input.checked = false);
        fetchDataAndAddMarkers(map);
    });

    document.getElementById('toggle-filters').addEventListener('click', () => {
        const filtersContent = document.getElementById('filters-content');
        const isHidden = filtersContent.style.display === 'none';
        filtersContent.style.display = isHidden ? 'block' : 'none';
        document.getElementById('toggle-filters').textContent = isHidden ? 'Hide Filters' : 'Show Filters';
    });

    document.getElementById('search-button').addEventListener('click', () => {
        const query = document.getElementById('search-input').value;
        searchLocation(query, map);
    });

    addGeolocateButton(map);
    addNewToiletSourceButton(map);
};

const populateFilters = (topKeyValues) => {
    const filtersContainer = document.getElementById('filters');
    topKeyValues.forEach(([keyValue, count]) => {
        const [key, value] = keyValue.split(':');
        const filterId = `filter-${key}-${value}`;
        const filterElement = document.createElement('div');
        filterElement.innerHTML = `
            <input type="checkbox" id="${filterId}" data-key="${key}" data-value="${value}">
            <label for="${filterId}">${key}: ${value} (${count})</label>
        `;
        filtersContainer.appendChild(filterElement);
    });
};


