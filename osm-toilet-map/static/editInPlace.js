// editInPlace.js

const fetchNodeDetails = async (nodeId) => {
    try {
        const response = await fetch(`/node/${nodeId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch node details');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching node details:', error);
        return null;
    }
};

const updateNodeDetails = async (nodeId, updatedTags) => {
    try {
        const response = await fetch(`/updateNode/${nodeId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedTags)
        });

        if (!response.ok) {
            throw new Error('Failed to update node details');
        }

        toastr.success('Node details updated successfully');

        // Close the popup after successful update
        const popup = document.querySelector(`.leaflet-popup`);
        if (popup) {
            const popupCloseButton = popup.querySelector('.leaflet-popup-close-button');
            if (popupCloseButton) {
                popupCloseButton.click();
            }
        }

    } catch (error) {
        console.error('Error updating node details:', error);
        toastr.error('Failed to update node details');
    }
};


const createElement = (tag, attrs = {}, children = [], style = '') => {
    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    if (style) {
        style.split(';').forEach(styleRule => {
            if (styleRule) {
                const [property, value] = styleRule.split(':').map(item => item.trim());
                if (property && value) {
                    element.style[property] = value;
                }
            }
        });
    }
    children.forEach(child => element.appendChild(child));
    return element;
};


const editInPlace = async (nodeId) => {
    const nodeDetails = await fetchNodeDetails(nodeId);
    if (!nodeDetails) return;

    const popupContent = document.querySelector(`.popup-content[data-node-id="${nodeId}"]`);
    if (!popupContent) return;

    const form = document.createElement('form');
    form.className = 'edit-in-place-form';

    let addToiletsTag = true;

    Object.entries(nodeDetails.tags).forEach(([key, value]) => {
        if (key === 'amenity' && value === 'toilets') {
            addToiletsTag = false;
        }
        const label = document.createElement('label');
        label.textContent = key;
        const input = document.createElement('input');
        input.type = 'text';
        input.name = key;
        input.value = value;
        form.appendChild(label);
        form.appendChild(input);
    });

    // Ensure toilets=yes is included only if the amenity is not toilets
    if (addToiletsTag && !nodeDetails.tags.toilets) {
        const label = document.createElement('label');
        label.textContent = 'toilets';
        const input = document.createElement('input');
        input.type = 'text';
        input.name = 'toilets';
        input.value = 'yes';
        form.appendChild(label);
        form.appendChild(input);
    }

    const additionalFieldsData = [
        { tag: 'label', attrs: { for: 'toilets:access' }, style: 'font-size: x-large', children: [document.createTextNode('🔓')] },
        { tag: 'select', attrs: { id: 'toilets:access', name: 'toilets:access' }, children: [
                createElement('option', { value: 'yes' }, [document.createTextNode('🔓Yes')]),
                createElement('option', { value: 'customers' }, [document.createTextNode('🔐Customers')]),
                createElement('option', { value: 'private' }, [document.createTextNode('🔒Private')]),
                createElement('option', { value: 'no' }, [document.createTextNode('🔒No')])
            ]},
        { tag: 'label', attrs: { for: 'toilets:fee' }, style: 'font-size: x-large', children: [document.createTextNode('💶')] },
        { tag: 'input', attrs: { type: 'checkbox', id: 'toilets:fee', name: 'fee' } },
        { tag: 'label', attrs: { for: 'toilets:paper_supplied' }, style: 'font-size: x-large', children: [document.createTextNode('🧻')] },
        { tag: 'select', attrs: { id: 'toilets:paper_supplied', name: 'toilets:paper_supplied' }, children: [
                createElement('option', { value: 'no' }, [document.createTextNode('No')]),
                createElement('option', { value: 'yes' }, [document.createTextNode('Yes')]),
            ]},
        { tag: 'label', attrs: { for: 'handwashing:soap' }, style: 'font-size: x-large', children: [document.createTextNode('🧼')] },
        { tag: 'select', attrs: { id: 'handwashing:soap', name: 'handwashing:soap' }, children: [
                createElement('option', { value: 'no' }, [document.createTextNode('No')]),
                createElement('option', { value: 'yes' }, [document.createTextNode('Yes')]),
            ]},
        { tag: 'label', attrs: { for: 'changing_table' }, children: [document.createTextNode('👶Table')] },
        { tag: 'input', attrs: { type: 'checkbox', id: 'changing_table', name: 'changing_table' } },
        { tag: 'label', attrs: { for: 'wheelchair' }, style: 'font-size: x-large', children: [document.createTextNode('♿')] },
        { tag: 'select', attrs: { id: 'wheelchair', name: 'wheelchair' }, children: [
                createElement('option', { value: 'no' }, [document.createTextNode('No')]),
                createElement('option', { value: 'yes' }, [document.createTextNode('Yes')]),
                createElement('option', { value: 'limited' }, [document.createTextNode('Limited')]),
            ]}
    ];

    const additionalFieldsContainer = document.createElement('div');
    additionalFieldsContainer.className = 'additional-fields';

    additionalFieldsData.forEach(field => {
        const element = createElement(field.tag, field.attrs, field.children, field.style);
        additionalFieldsContainer.appendChild(element);
    });

    form.appendChild(additionalFieldsContainer);

    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.textContent = 'Save';
    form.appendChild(saveButton);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const updatedTags = addToiletsTag ? { toilets: 'yes' } : {}; // Ensure toilets=yes is conditionally included
        formData.forEach((value, key) => {
            updatedTags[key] = value;
        });

        // Check toilets:access value and set toilets tag accordingly
        if (updatedTags['toilets:access'] === 'no' || updatedTags['toilets:access'] === 'private') {
            updatedTags['toilets'] = 'no';
        } else if (!updatedTags['toilets']) {
            updatedTags['toilets'] = 'yes';
        }

        await updateNodeDetails(nodeId, updatedTags);
    });

    popupContent.innerHTML = '';
    popupContent.appendChild(form);
};


export { fetchNodeDetails, updateNodeDetails, editInPlace };

