// search.js

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
