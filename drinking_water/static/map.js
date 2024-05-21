// map.js

// Function to add a geolocate button to the map
const addGeolocateButton = () => {
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
            mymap.setView(new L.LatLng(userLat, userLon), 15);
            L.marker([userLat, userLon]).addTo(mymap)
                .bindPopup('You are here!')
                .openPopup();
        });
    };

    container.appendChild(button);
};

document.addEventListener("DOMContentLoaded", async function() {
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

    // Fetch data
    const response = await fetch('/data');
    const data = await response.json();

    // Get top key-value pairs
    const topKeyValues = getTopKeyValues(data);
    console.log('Top key-value pairs:', topKeyValues);

    // Display filters
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

        fetchDataAndAddMarkers(filterCriteria);
    });

    document.getElementById('clear-filters').addEventListener('click', () => {
        document.querySelectorAll('#filters input:checked').forEach(input => input.checked = false);
        fetchDataAndAddMarkers(); // Fetch all data without any filters
    });

    // Toggle filter container visibility
    document.getElementById('toggle-filters').addEventListener('click', () => {
        const filtersContent = document.getElementById('filters-content');
        const isHidden = filtersContent.style.display === 'none';
        filtersContent.style.display = isHidden ? 'block' : 'none';
        document.getElementById('toggle-filters').textContent = isHidden ? 'Hide Filters' : 'Show Filters';
    });

    // Initial load of markers without filters
    fetchDataAndAddMarkers();

    // Search functionality
    document.getElementById('search-button').addEventListener('click', () => {
        const query = document.getElementById('search-input').value;
        searchLocation(query, mymap);
    });

    // Add the geolocate button
    addGeolocateButton();

    // Add the button for adding a new drinking source
    addNewDrinkingSourceButton();
});
