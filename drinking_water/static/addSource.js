// addSource.js

let isAddingSource = false; // Flag to check if a source is being added

const generateInitialFormHTML = () => {
    return `
        <style>
            .popup-form {
                display: flex;
                flex-direction: column;
                gap: 5px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                padding: 10px;
                width: 200px;
            }
            .popup-form label {
                font-weight: bold;
                margin-bottom: 2px;
            }
            .popup-form select, .popup-form input[type="checkbox"], .popup-form input[type="text"] {
                padding: 5px;
                font-size: 14px;
                width: 100%;
                box-sizing: border-box;
            }
            .popup-form button {
                background-color: #4CAF50;
                color: white;
                border: none;
                padding: 10px;
                cursor: pointer;
                font-size: 14px;
                border-radius: 5px;
                transition: background-color 0.3s;
                margin-top: 10px;
            }
            .popup-form button:hover {
                background-color: #45a049;
            }
            .additional-fields {
                display: none;
                flex-direction: column;
                gap: 5px;
                margin-top: 10px;
            }
        </style>
        <form id="add-source-form" class="popup-form">
            <label for="source-type">Type:</label>
            <select id="source-type" name="type" required>
                <option value="amenity:drinking_water">Drinking Water</option>
                <option value="man_made:water_well">Water Well</option>
                <option value="natural:spring">Spring</option>
                <option value="amenity:toilets">Toilets</option>
                <option value="man_made:water_tap">Water Tap</option>
                <option value="amenity:shelter">Shelter</option>
                <option value="tourism:wilderness_hut">Wilderness Hut</option>
                <option value="tourism:camp_site">Camp Site</option>
                <option value="tourism:camp_pitch">Camp Pitch</option>
                <option value="highway:rest_area">Rest Area</option>
                <option value="amenity:fountain">Fountain</option>
                <option value="waterway:stream">Stream</option>
                <option value="amenity:watering_place">Watering Place</option>
                <option value="man_made:drinking_fountain">Drinking Fountain</option>
            </select>
            <label for="safe-water">Safe Water:</label>
            <input type="checkbox" id="safe-water" name="safe">
            <label for="dog">Dog Bowl:</label>
            <input type="checkbox" id="dog" name="dog">
            <label for="bottle">Bottled Water:</label>
            <input type="checkbox" id="bottle" name="bottle">
            <button type="button" id="toggle-additional-fields">Add More Details</button>
            <div class="additional-fields" id="additional-fields">
                ${generateAdditionalFieldsHTML()}
            </div>
            <button type="submit">Add Source</button>
        </form>
    `;
};

const generateAdditionalFieldsHTML = () => {
    return `
        <label for="fountain-type">Fountain Type:</label>
        <select id="fountain-type" name="fountain">
            <option value="">Select Fountain Type</option>
            <option value="bubbler">Bubbler</option>
            <option value="drinking">Drinking</option>
            <option value="decorative">Decorative</option>
            <option value="splash_pad">Splash Pad</option>
            <option value="nozzle">Nozzle</option>
            <option value="bottle_refill">Bottle Refill</option>
            <option value="stone_block">Stone Block</option>
            <option value="mist">Mist</option>
        </select>
        <label for="seasonal">Seasonal:</label>
        <input type="checkbox" id="seasonal" name="seasonal">
        <label for="description">Description:</label>
        <input type="text" id="description" name="description">
        <label for="indoor">Indoor:</label>
        <input type="checkbox" id="indoor" name="indoor">
        <label for="name">Name:</label>
        <input type="text" id="name" name="name">
        <label for="access">Access:</label>
        <select id="access" name="access">
            <option value="">Select Access</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
        </select>
    `;
};

const toggleAdditionalFieldsVisibility = () => {
    const additionalFields = document.getElementById('additional-fields');
    additionalFields.style.display = additionalFields.style.display === 'none' ? 'flex' : 'none';
};

const handleFormSubmit = (event, lat, lon) => {
    event.preventDefault(); // Prevent form from refreshing the page
    const formData = new FormData(event.target);
    const type = formData.get('type').split(':');
    const tags = {
        [type[0]]: type[1],
        'drinking_water': formData.get('safe') ? 'yes' : 'no',
        'dog': formData.get('dog') ? 'yes' : 'no',
        'bottle': formData.get('bottle') ? 'yes' : 'no',
    };

    const optionalTags = ['fountain', 'description', 'indoor', 'name', 'access', 'seasonal'];
    optionalTags.forEach(tag => {
        const value = formData.get(tag);
        if (value) {
            tags[tag] = value === 'yes' || 'no' ? value : formData.get(tag);
        }
    });

    addNodeToOSM(lat, lon, tags);
};

const addMarkerToMap = (lat, lon) => {
    const popupContent = generateInitialFormHTML();
    const marker = L.marker([lat, lon]).addTo(mymap).bindPopup(popupContent).openPopup();

    document.getElementById('add-source-form').addEventListener('submit', function(event) {
        handleFormSubmit(event, lat, lon);
        mymap.off('click', onMapClick);
        marker.remove();
        isAddingSource = false; // Reset the flag after adding the source
    });

    document.getElementById('toggle-additional-fields').addEventListener('click', toggleAdditionalFieldsVisibility);
};

const onMapClick = (e) => {
    if (isAddingSource) return; // Prevent adding another marker if already in progress
    isAddingSource = true; // Set the flag to indicate adding source is in progress
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    addMarkerToMap(lat, lon);
};

const addNewDrinkingSourceButton = () => {
    const addSourceControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            const button = L.DomUtil.create('button', 'add-source-button', container);
            button.innerHTML = 'Add Source';
            button.title = 'Add new source';

            L.DomEvent.on(button, 'click', function(e) {
                L.DomEvent.stopPropagation(e);  // Stop the click event from propagating to the map
                if (isAddingSource) return; // Prevent multiple clicks

                const hasSeenAddModal = Cookies.get('hasSeenAddModal');
                if (!hasSeenAddModal) {
                    showModal(() => {
                        map.getContainer().style.cursor = 'crosshair'; // Change cursor to crosshair
                        toastr.info('Click on the map to place a new source');

                        map.on('click', onMapClick);

                        // Change back to the default cursor after the user has clicked on the map
                        map.once('click', function() {
                            map.getContainer().style.cursor = ''; // Revert to default cursor
                        });

                        Cookies.set('hasSeenAddModal', 'true', { expires: 365 });
                    });
                } else {
                    map.getContainer().style.cursor = 'crosshair'; // Change cursor to crosshair
                    toastr.info('Click on the map to place a new source');

                    map.on('click', onMapClick);

                    // Change back to the default cursor after the user has clicked on the map
                    map.once('click', function() {
                        map.getContainer().style.cursor = ''; // Revert to default cursor
                    });
                }
            });

            return container;
        }
    });

    mymap.addControl(new addSourceControl({ position: 'bottomright' }));
};

const showModal = (onConfirm, isEdit = false, editUrl = '') => {
    const modal = document.getElementById('source-modal');
    modal.style.display = 'block';

    const confirmButton = document.getElementById('confirm-add-source');
    confirmButton.onclick = () => {
        onConfirm();
        hideModal();
    };

    const closeButton = document.getElementById('close-modal');
    closeButton.onclick = hideModal;

    window.onclick = (event) => {
        if (event.target === modal) {
            hideModal();
        }
    };

    if (isEdit) {
        confirmButton.textContent = 'Proceed to Edit';
        confirmButton.onclick = () => {
            window.open(editUrl, '_blank');
            hideModal();
            Cookies.set('hasSeenEditModal', 'true', { expires: 365 });
        };
    } else {
        confirmButton.textContent = 'Proceed';
        confirmButton.onclick = () => {
            onConfirm();
            hideModal();
            Cookies.set('hasSeenAddModal', 'true', { expires: 365 });
        };
    }
};

const hideModal = () => {
    const modal = document.getElementById('source-modal');
    modal.style.display = 'none';
};

const addNodeToOSM = async (lat, lon, tags) => {
    try {
        const response = await fetch('/addnode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ lat, lon, tags })
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

// Event listener for closing the modal
document.getElementById('close-modal').addEventListener('click', hideModal);

// Initialize the add source button
addNewDrinkingSourceButton();
