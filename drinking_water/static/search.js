// search.js

const addSearchControl = () => {
    const searchControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

            const input = L.DomUtil.create('input', 'search-input', container);
            input.type = 'text';
            input.placeholder = 'Search location...';

            const button = L.DomUtil.create('button', 'search-button', container);
            button.innerHTML = 'Search';

            L.DomEvent.on(button, 'click', function() {
                const query = input.value;
                searchLocation(query, map);
            });

            return container;
        }
    });

    mymap.addControl(new searchControl({ position: 'topright' }));
};

const searchLocation = async (query, map) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

    try {
        const response = await fetch(url);
        const results = await response.json();

        if (results.length > 0) {
            const result = results[0];
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);

            map.setView(new L.LatLng(lat, lon), 13);
        } else {
            alert('Location not found');
        }
    } catch (error) {
        console.error('Error searching location:', error);
        alert('Error searching location');
    }
};
