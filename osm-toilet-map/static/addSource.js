// addSource.js

let isAddingSource = false;

// Utility function to create elements with attributes and children
const createElement = (tag, attrs = {}, children = []) => {
    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    children.forEach(child => element.appendChild(child));
    return element;
};

// Generic function to generate form elements
const generateFormElements = (fields) => fields.map(({ tag, attrs, children }) => createElement(tag, attrs, children));

// Function to generate form structure
const generateFormStructure = (fieldData, additionalFieldsData) => [
    ...generateFormElements(fieldData),
    createElement('button', { type: 'button', id: 'toggle-additional-fields' }, [document.createTextNode('Add More Details')]),
    createElement('div', { class: 'additional-fields', id: 'additional-fields' }, generateFormElements(additionalFieldsData)),
    createElement('button', { type: 'submit' }, [document.createTextNode('Add Source')])
];

// Function to generate initial form HTML
// Update the .additional-fields CSS to apply the same grid layout
const generateInitialFormHTML = (fieldData, additionalFieldsData) => {
    const form = createElement('form', { id: 'add-source-form', class: 'popup-form' }, generateFormStructure(fieldData, additionalFieldsData));
    const style = `
        .popup-form {
            display: grid;
            grid-template-columns: 30% 70%;
            gap: 10px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            padding: 10px;
            width: 100%;
            max-width: 400px;
            box-sizing: border-box;
        }
        .popup-form label {
            font-weight: bold;
            margin-bottom: 2px;
            align-self: center;
        }
        .popup-form select, .popup-form input[type="checkbox"], .popup-form input[type="text"] {
            padding: 5px;
            font-size: 14px;
            width: 100%;
            box-sizing: border-box;
        }
        .popup-form button {
            grid-column: span 2;
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
            grid-template-columns: 30% 70%;
            gap: 10px;
            margin-top: 10px;
        }
        @media (max-width: 600px) {
            .popup-form {
                grid-template-columns: 1fr;
                font-size: 12px;
            }
            .popup-form button {
                padding: 8px;
                font-size: 12px;
            }
            .additional-fields {
                grid-template-columns: 1fr;
            }
        }
    `;
    return `<style>${style}</style>${form.outerHTML}`;
};



// Function to toggle the visibility of additional fields
// Function to toggle the visibility of additional fields
const toggleAdditionalFieldsVisibility = () => {
    const additionalFields = document.getElementById('additional-fields');
    additionalFields.style.display = additionalFields.style.display === 'none' ? 'contents' : 'none';
};


// Function to extract form data and create tags
const extractTagsFromForm = (formData, mandatoryFields, optionalFields) => {
    const tags = {};

    mandatoryFields.forEach(field => {
        const value = formData.get(field);
        if (value) {
            tags[field] = value.includes(':') ? value.split(':')[1] : value;
        }
    });

    optionalFields.forEach(field => {
        const value = formData.get(field);
        if (value) {
            tags[field] = value;
        }
    });

    return tags;
};

// Function to handle form submission
const handleFormSubmit = (event, lat, lon, mandatoryFields, optionalFields) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const tags = extractTagsFromForm(formData, mandatoryFields, optionalFields);
    addNodeToOSM(lat, lon, tags);
};

// Function to add a marker to the map
const addMarkerToMap = (lat, lon, fieldData, additionalFieldsData, mandatoryFields, optionalFields) => {
    const popupContent = generateInitialFormHTML(fieldData, additionalFieldsData);
    const marker = L.marker([lat, lon]).addTo(mymap).bindPopup(popupContent).openPopup();

    document.getElementById('add-source-form').addEventListener('submit', (event) => {
        handleFormSubmit(event, lat, lon, mandatoryFields, optionalFields);
        mymap.off('click', onMapClick);
        marker.remove();
        isAddingSource = false;
    });

    document.getElementById('toggle-additional-fields').addEventListener('click', toggleAdditionalFieldsVisibility);
};

// Function to handle map click
const onMapClick = (e) => {
    if (isAddingSource) return;
    isAddingSource = true;
    const { lat, lng: lon } = e.latlng;

    const fieldData = [
        { tag: 'label', attrs: { for: 'type' }, children: [document.createTextNode('Type:')] },
        { tag: 'select', attrs: { id: 'type', name: 'amenity', required: true }, children: [
                createElement('option', { value: 'toilets' }, [document.createTextNode('Public Toilet')])
            ]},
        { tag: 'label', attrs: { for: 'access' }, children: [document.createTextNode('Access:')] },
        { tag: 'select', attrs: { id: 'access', name: 'access' }, children: [
                createElement('option', { value: 'yes' }, [document.createTextNode('Yes')]),
                createElement('option', { value: 'customers' }, [document.createTextNode('Customers')]),
                createElement('option', { value: 'destination' }, [document.createTextNode('Destination')]),
                createElement('option', { value: 'private' }, [document.createTextNode('Private')]),
                createElement('option', { value: 'no' }, [document.createTextNode('No')])
            ]},
        { tag: 'label', attrs: { for: 'fee' }, children: [document.createTextNode('Fee:')] },
        { tag: 'input', attrs: { type: 'checkbox', id: 'fee', name: 'fee' } },
        { tag: 'label', attrs: { for: 'toilets:paper_supplied' }, children: [document.createTextNode('Paper Supplied:')] },
        { tag: 'select', attrs: { id: 'toilets:paper_supplied', name: 'toilets:paper_supplied' }, children: [
                createElement('option', { value: 'yes' }, [document.createTextNode('Yes')]),
                createElement('option', { value: 'no' }, [document.createTextNode('No')])
            ]},

    ];

    const additionalFieldsData = [
        { tag: 'label', attrs: { for: 'unisex' }, children: [document.createTextNode('Unisex:')] },
        { tag: 'input', attrs: { type: 'checkbox', id: 'unisex', name: 'unisex' } },
        { tag: 'label', attrs: { for: 'wheelchair' }, children: [document.createTextNode('Wheelchair Accessibility:')] },
        { tag: 'select', attrs: { id: 'wheelchair', name: 'wheelchair' }, children: [
                createElement('option', { value: 'yes' }, [document.createTextNode('Yes')]),
                createElement('option', { value: 'limited' }, [document.createTextNode('Limited')]),
                createElement('option', { value: 'no' }, [document.createTextNode('No')])
            ]},
        { tag: 'label', attrs: { for: 'wheelchair:description:en' }, children: [document.createTextNode('Wheelchair Description:')] },
        { tag: 'input', attrs: { type: 'text', id: 'wheelchair:description:en', name: 'wheelchair:description:en' } },
        { tag: 'label', attrs: { for: 'opening_hours' }, children: [document.createTextNode('Opening Hours:')] },
        { tag: 'input', attrs: { type: 'text', id: 'opening_hours', name: 'opening_hours' } },
        { tag: 'label', attrs: { for: 'toilets:wheelchair' }, children: [document.createTextNode('Toilets Wheelchair Accessibility:')] },
        { tag: 'select', attrs: { id: 'toilets:wheelchair', name: 'toilets:wheelchair' }, children: [
                createElement('option', { value: 'yes' }, [document.createTextNode('Yes')]),
                createElement('option', { value: 'no' }, [document.createTextNode('No')])
            ]},
        { tag: 'label', attrs: { for: 'changing_table' }, children: [document.createTextNode('Changing Table:')] },
        { tag: 'input', attrs: { type: 'checkbox', id: 'changing_table', name: 'changing_table' } },
        { tag: 'label', attrs: { for: 'toilets:disposal' }, children: [document.createTextNode('Disposal Method:')] },
        { tag: 'select', attrs: { id: 'toilets:disposal', name: 'toilets:disposal' }, children: [
                createElement('option', { value: 'flush' }, [document.createTextNode('Flush')]),
                createElement('option', { value: 'pitlatrine' }, [document.createTextNode('Pit Latrine')]),
                createElement('option', { value: 'chemical' }, [document.createTextNode('Chemical')]),
                createElement('option', { value: 'bucket' }, [document.createTextNode('Bucket')]),
                createElement('option', { value: 'dry_toilet' }, [document.createTextNode('Dry Toilet')]),
                createElement('option', { value: 'tank' }, [document.createTextNode('Tank')]),
                createElement('option', { value: 'incineration' }, [document.createTextNode('Incineration')])
            ]},
        { tag: 'label', attrs: { for: 'toilets:position' }, children: [document.createTextNode('Position:')] },
        { tag: 'select', attrs: { id: 'toilets:position', name: 'toilets:position' }, children: [
                createElement('option', { value: 'seated' }, [document.createTextNode('Seated')]),
                createElement('option', { value: 'urinal' }, [document.createTextNode('Urinal')]),
                createElement('option', { value: 'squat' }, [document.createTextNode('Squat')])
            ]},
        { tag: 'label', attrs: { for: 'toilets:hands_drying' }, children: [document.createTextNode('Hands Drying:')] },
        { tag: 'select', attrs: { id: 'toilets:hands_drying', name: 'toilets:hands_drying' }, children: [
                createElement('option', { value: 'electric_hand_dryer' }, [document.createTextNode('Electric Hand Dryer')]),
                createElement('option', { value: 'paper_towel' }, [document.createTextNode('Paper Towel')]),
                createElement('option', { value: 'towel' }, [document.createTextNode('Towel')])
            ]},
        { tag: 'label', attrs: { for: 'toilets:handwashing' }, children: [document.createTextNode('Handwashing:')] },
        { tag: 'select', attrs: { id: 'toilets:handwashing', name: 'toilets:handwashing' }, children: [
                createElement('option', { value: 'yes' }, [document.createTextNode('Yes')]),
                createElement('option', { value: 'no' }, [document.createTextNode('No')])
            ]},
        { tag: 'label', attrs: { for: 'handwashing:soap' }, children: [document.createTextNode('Soap:')] },
        { tag: 'select', attrs: { id: 'handwashing:soap', name: 'handwashing:soap' }, children: [
                createElement('option', { value: 'yes' }, [document.createTextNode('Yes')]),
                createElement('option', { value: 'no' }, [document.createTextNode('No')])
            ]},
        { tag: 'label', attrs: { for: 'handwashing:hand_disinfection' }, children: [document.createTextNode('Hand Disinfection:')] },
        { tag: 'select', attrs: { id: 'handwashing:hand_disinfection', name: 'handwashing:hand_disinfection' }, children: [
                createElement('option', { value: 'yes' }, [document.createTextNode('Yes')]),
                createElement('option', { value: 'no' }, [document.createTextNode('No')])
            ]},
        { tag: 'label', attrs: { for: 'handwashing:creme' }, children: [document.createTextNode('Hand Care Cream:')] },
        { tag: 'select', attrs: { id: 'handwashing:creme', name: 'handwashing:creme' }, children: [
                createElement('option', { value: 'yes' }, [document.createTextNode('Yes')]),
                createElement('option', { value: 'no' }, [document.createTextNode('No')])
            ]},
        { tag: 'label', attrs: { for: 'hot_water' }, children: [document.createTextNode('Hot Water:')] },
        { tag: 'select', attrs: { id: 'hot_water', name: 'hot_water' }, children: [
                createElement('option', { value: 'yes' }, [document.createTextNode('Yes')]),
                createElement('option', { value: 'no' }, [document.createTextNode('No')])
            ]},
        { tag: 'label', attrs: { for: 'toilets:menstrual_products' }, children: [document.createTextNode('Menstrual Products:')] },
        { tag: 'select', attrs: { id: 'toilets:menstrual_products', name: 'toilets:menstrual_products' }, children: [
                createElement('option', { value: 'yes' }, [document.createTextNode('Yes')]),
                createElement('option', { value: 'limited' }, [document.createTextNode('Limited')]),
                createElement('option', { value: 'no' }, [document.createTextNode('No')])
            ]}
    ];

    const mandatoryFields = ['amenity'];
    const optionalFields = [
        'access', 'wheelchair', 'wheelchair:description:en', 'unisex', 'fee',
        'opening_hours', 'toilets:wheelchair', 'changing_table', 'toilets:disposal', 'toilets:position'
    ];

    addMarkerToMap(lat, lon, fieldData, additionalFieldsData, mandatoryFields, optionalFields);
};

// Function to show modal
const showModal = (onConfirm, isEdit = false, editUrl = '') => {
    const modal = document.getElementById('source-modal');
    modal.style.display = 'block';

    const confirmButton = document.getElementById('confirm-add-source');
    confirmButton.onclick = () => {
        if (isEdit) {
            window.open(editUrl, '_blank');
            Cookies.set('hasSeenEditModal', 'true', { expires: 365 });
        } else {
            onConfirm();
            Cookies.set('hasSeenAddModal', 'true', { expires: 365 });
        }
        hideModal();
    };

    const closeButton = document.getElementById('close-modal');
    closeButton.onclick = hideModal;

    window.onclick = (event) => {
        if (event.target === modal) {
            hideModal();
        }
    };
};

// Function to hide modal
const hideModal = () => {
    const modal = document.getElementById('source-modal');
    modal.style.display = 'none';
};

// Function to add node to OSM
const addNodeToOSM = async (lat, lon, tags) => {
    try {
        const response = await fetch('/addnode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lon, tags })
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        toastr.success(await response.text());
    } catch (error) {
        console.error('Error adding node:', error);
        toastr.error(error.message);

        if (error.message.includes('You are not authenticated')) {
            toastr.info('You are not authenticated. Redirecting to login page...');
            setTimeout(() => window.location.href = '/login', 2000);
        }
    }
};

// Event listener for map clicks
mymap.on('click', onMapClick);
