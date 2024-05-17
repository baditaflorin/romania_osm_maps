const addNewDrinkingSourceButton = () => {
    const addSourceControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            const button = L.DomUtil.create('button', 'add-source-button', container);
            button.innerHTML = 'Add Source'; // Updated button text
            button.title = 'Add new drinking source';

            L.DomEvent.on(button, 'click', function(e) {
                L.DomEvent.stopPropagation(e);  // Stop the click event from propagating to the map
                map.getContainer().style.cursor = 'crosshair'; // Change cursor to crosshair
                toastr.info('Click on the map to place a new drinking source');

                map.on('click', onMapClick);

                // Change back to the default cursor after the user has clicked on the map
                map.once('click', function() {
                    map.getContainer().style.cursor = ''; // Revert to default cursor
                });
            });

            return container;
        }
    });

    mymap.addControl(new addSourceControl({ position: 'bottomright' }));
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

toastr.options = {
    "closeButton": false,
    "debug": false,
    "newestOnTop": false,
    "progressBar": true,
    "positionClass": "toast-top-right",
    "preventDuplicates": false,
    "onclick": null,
    "showDuration": "300",
    "hideDuration": "1000",
    "timeOut": "5000",
    "extendedTimeOut": "1000",
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut"
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
            const errorText = await response.text();
            throw new Error(errorText);
        }

        const result = await response.text();
        toastr.success(result);
    } catch (error) {
        console.error('Error adding node:', error);
        toastr.error(error.message);

        if (error.message.includes("You are not authenticated")) {
            toastr.info("You are not authenticated. Redirecting to login page...");

            // Show a progress bar for 2 seconds before redirecting
            setTimeout(() => {
                window.location.href = "/login";
            }, 2000);
        }
    }
};


// Initialize the add source button
addNewDrinkingSourceButton();
