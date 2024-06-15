// wayUtils.js

const zoningCodeColors = {
    residential: 'blue',
    commercial: 'green',
    industrial: 'red',
    A: 'gold',
    B: 'orange',
    C: 'red',
    D: 'red',
    // Add more zoning codes and their colors here
};

export const createWay = (way) => {
    const latlngs = way.geometry.map(point => [point.lat, point.lon]);
    const zoningCode = way.tags['zoning_code'];
    const color = zoningCodeColors[zoningCode] || 'gray'; // Default color

    const wayPolyline = L.polyline(latlngs, {
        color,
        weight: 15,  // Adjust the width here
        opacity: 0.3 // Adjust the transparency here
    });

    const popupContent = `
        <div class="popup-content">
            <b>Road Segment</b><br>
            ${formatTags(way.tags)}
            <a href="#" class="edit-link" onclick='editWay(${way.id}, ${JSON.stringify(way.tags)}); return false;'>Edit this segment</a>
        </div>
    `;
    wayPolyline.bindPopup(popupContent);

    wayPolyline.on('click', () => {
        wayPolyline.openPopup();
        window.mymap.setView(latlngs[0], 18); // Zoom to the way
    });

    return wayPolyline;
};

export const createLegend = (data) => {
    const legendContainer = document.getElementById('legend');
    legendContainer.innerHTML = ''; // Clear previous legend

    const zoningCodes = [...new Set(data.map(way => way.tags['zoning_code']))];

    zoningCodes.forEach(zoningCode => {
        const color = zoningCodeColors[zoningCode] || 'blue';
        const legendItem = document.createElement('div');
        legendItem.classList.add('legend-item');
        legendItem.innerHTML = `
            <span class="legend-color" style="background-color: ${color};"></span>
            <span>${zoningCode}</span>
        `;
        legendContainer.appendChild(legendItem);
    });
};

const formatTags = (tags) => {
    if (!tags) return 'No tags available';

    return Object.entries(tags)
        .map(([key, value]) => `${key}: ${value}`)
        .join('<br>');
};

const createFormField = (label, id, value) => `
    <label for="${id}">${label}:</label>
    <input type="text" id="${id}" name="${id}" value="${value}"><br>
`;

export const editWay = (wayId, tags) => {
    const uniqueFields = {};
    const commonFields = ['addr:neighborhood', 'zoning_code', 'old_name'];

    commonFields.forEach(field => {
        if (tags[field]) {
            uniqueFields[field] = tags[field];
            delete tags[field];
        } else {
            uniqueFields[field] = '';
        }
    });

    const formFields = Object.entries(tags).map(([key, value]) => createFormField(key, key, value)).join('');

    const commonFormFields = Object.entries(uniqueFields).map(([key, value]) => createFormField(key, key, value)).join('');

    const popup = L.popup()
        .setLatLng(window.mymap.getCenter())
        .setContent(`
            <div>
                <h3>Edit Way ${wayId}</h3>
                <form id="editWayForm" onsubmit="submitEditWayForm(${wayId}); return false;">
                    ${commonFormFields}
                    ${formFields}
                    <button type="submit">Save</button>
                </form>
            </div>
        `)
        .openOn(window.mymap);
};

export const submitEditWayForm = async (wayId) => {
    const form = document.getElementById("editWayForm");
    const formData = new FormData(form);
    const tags = {};
    formData.forEach((value, key) => {
        tags[key] = value;
    });

    try {
        const response = await fetch(`/updateway`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id: wayId, tags })
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert("You are not authenticated. Redirecting to login page.");
                window.location.href = "/login";
            } else {
                const errorText = await response.text();
                alert("Failed to update way: " + errorText);
            }
            return;
        }

        alert("Way updated successfully");
    } catch (error) {
        console.error('Error updating way:', error);
        alert("Failed to update way");
    }
};
