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
    } catch (error) {
        console.error('Error updating node details:', error);
        toastr.error('Failed to update node details');
    }
};

const editInPlace = async (nodeId) => {
    const nodeDetails = await fetchNodeDetails(nodeId);
    if (!nodeDetails) return;

    const popupContent = document.querySelector(`.popup-content[data-node-id="${nodeId}"]`);
    if (!popupContent) return;

    const form = document.createElement('form');
    form.className = 'edit-in-place-form';

    Object.entries(nodeDetails.tags).forEach(([key, value]) => {
        const label = document.createElement('label');
        label.textContent = key;
        const input = document.createElement('input');
        input.type = 'text';
        input.name = key;
        input.value = value;
        form.appendChild(label);
        form.appendChild(input);
    });

    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.textContent = 'Save';
    form.appendChild(saveButton);

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const updatedTags = {};
        formData.forEach((value, key) => {
            updatedTags[key] = value;
        });
        updateNodeDetails(nodeId, updatedTags);
    });

    popupContent.innerHTML = '';
    popupContent.appendChild(form);
};

export { fetchNodeDetails, updateNodeDetails, editInPlace };

