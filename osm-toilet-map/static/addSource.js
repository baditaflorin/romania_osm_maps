// addSource.js

let isAddingSource = false;


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
                <option value="amenity:toilets">Toilets</option>
            </select>
            <label for="accessible">Accessible:</label>
            <input type="checkbox" id="accessible" name="accessible">
            <label for="unisex">Unisex:</label>
            <input type="checkbox" id="unisex" name="unisex">
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
        <label for="name">Name:</label>
        <input type="text" id="name" name="name">
        <label for="description">Description:</label>
        <input type="text" id="description" name="description">
    `;
};

const toggleAdditionalFieldsVisibility = () => {
    const additionalFields = document.getElementById('additional-fields');
    additionalFields.style.display = additionalFields.style.display === 'none' ? 'flex' : 'none';
};

const handleFormSubmit = (event, lat, lon) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const type = formData.get('type').split(':');
    const tags = {
        [type[0]]: type[1],
        'accessible': formData.get('accessible') ? 'yes' : 'no',
        'unisex': formData.get('unisex') ? 'yes' : 'no',
    };

    const optionalTags = ['name', 'description'];
    optionalTags.forEach(tag => {
        const value = formData.get(tag);
        if (value) {
            tags[tag] = value;
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
        isAddingSource = false;
    });

    document.getElementById('toggle-additional-fields').addEventListener('click', toggleAdditionalFieldsVisibility);
};

const onMapClick = (e) => {
    if (isAddingSource) return;
    isAddingSource = true;
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    addMarkerToMap(lat, lon);
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

            setTimeout(() => {
                window.location.href = "/login";
            }, 2000);
        }
    }
};

