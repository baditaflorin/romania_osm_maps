const addNewDrinkingSourceButton = () => {
    const addSourceControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            const button = L.DomUtil.create('button', 'add-source-button', container);
            button.innerHTML = 'Add Source';
            button.title = 'Add new drinking source';

            L.DomEvent.on(button, 'click', function() {
                map.on('click', onMapClick);
                alert('Click on the map to place a new drinking source');
            });

            return container;
        }
    });

    mymap.addControl(new addSourceControl({ position: 'topright' }));
};

const onMapClick = (e) => {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    const popupContent = `
        <form id="add-source-form">
            <label for="source-type">Type:</label>
            <select id="source-type" name="type" required>
                <option value="drinking_water">Drinking Water</option>
                <option value="water_well">Water Well</option>
                <option value="spring">Spring</option>
                <option value="fountain">Fountain</option>
                <!-- Add more options as needed -->
            </select>
            <br>
            <label for="safe-water">Safe Water:</label>
            <input type="checkbox" id="safe-water" name="safe">
            <br>
            <button type="submit">Add Source</button>
        </form>
    `;

    const marker = L.marker([lat, lon]).addTo(mymap).bindPopup(popupContent).openPopup();

    document.getElementById('add-source-form').addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent form from refreshing the page
        const formData = new FormData(event.target);
        const type = formData.get('type');
        const safe = formData.get('safe') ? true : false;

        addNodeToOSM(lat, lon, type, safe);
        mymap.off('click', onMapClick);
        marker.remove();
    });
};

const addNodeToOSM = async (lat, lon, type, safe) => {
    try {
        const response = await fetch('/addnode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ lat, lon, amenity: type })
        });

        if (!response.ok) {
            throw new Error(`Failed to add node: ${response.statusText}`);
        }

        const result = await response.text();
        alert(result);
    } catch (error) {
        console.error('Error adding node:', error);
        alert('Error adding node');
    }
};

// Initialize the add source button
addNewDrinkingSourceButton();
