document.addEventListener("DOMContentLoaded", async function () {
    const initialLat = parseFloat(getUrlParameter('lat')) || 45.9432;
    const initialLon = parseFloat(getUrlParameter('lon')) || 24.9668;
    const initialZoom = parseInt(getUrlParameter('z'), 10) || 7;

    window.mymap = L.map('mapid').setView([initialLat, initialLon], initialZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(mymap);

    window.markers = L.markerClusterGroup(); // Define markers globally
    mymap.addLayer(markers);

    mymap.on('zoomend', async () => {
        const zoomLevel = mymap.getZoom();
        if (zoomLevel >= 15) {
            await fetchDataAndAddMarkers();
        } else {
            clearMarkers();
        }
    });

    mymap.on('moveend', async () => {
        const center = mymap.getCenter();
        const z = mymap.getZoom();
        setUrlParameters({
            lat: center.lat.toFixed(6),
            lon: center.lng.toFixed(6),
            z: z
        });

        if (z >= 15) {
            await fetchDataAndAddMarkers();
        }
    });

    if (initialZoom >= 15) {
        await fetchDataAndAddMarkers();
    }

    document.getElementById("saveChangesButton").addEventListener("click", async function() {
        await saveChanges();
    });

    document.getElementById("searchBar").addEventListener("input", searchStreets);
});

const clearMarkers = () => {
    markers.clearLayers();
};

const fetchDataAndAddMarkers = async () => {
    try {
        const bounds = mymap.getBounds();
        const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;

        const response = await fetch(`/data?bbox=${bbox}`);
        const data = await response.json();

        markers.clearLayers();

        const waysToAdd = data
            .filter(element => element.type === 'way')
            .map(createWay);

        waysToAdd.forEach(way => way.addTo(mymap));
        createLegend(data);

        // Store data globally for search
        window.wayData = data;
    } catch (error) {
        console.error('Error fetching data and adding markers:', error);
    }
};

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

const createWay = (way) => {
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
        mymap.setView(latlngs[0], 18); // Zoom to the way
    });

    return wayPolyline;
};

const createLegend = (data) => {
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

const editWay = (wayId, tags) => {
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
        .setLatLng(mymap.getCenter())
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
        .openOn(mymap);
};

const submitEditWayForm = async (wayId) => {
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

const saveChanges = async () => {
    try {
        const response = await fetch(`/savechanges`, {
            method: "POST"
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert("You are not authenticated. Redirecting to login page.");
                window.location.href = "/login";
            } else {
                const errorText = await response.text();
                alert("Failed to save changes: " + errorText);
            }
            return;
        }

        alert("Changes saved successfully");
    } catch (error) {
        console.error('Error saving changes:', error);
        alert("Failed to save changes");
    }
};

const normalizeString = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const searchStreets = () => {
    const query = normalizeString(document.getElementById("searchBar").value);
    const resultsContainer = document.getElementById("searchResults");
    resultsContainer.innerHTML = '';

    if (!query) {
        return;
    }

    const results = window.wayData.filter(way => {
        const name = normalizeString(way.tags['name'] || '');
        return name.includes(query);
    });

    results.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.textContent = result.tags['name'];
        resultItem.onclick = () => {
            const latlngs = result.geometry.map(point => [point.lat, point.lon]);
            mymap.setView(latlngs[0], 18); // Zoom to the first point of the street
            L.popup()
                .setLatLng(latlngs[0])
                .setContent(`
                    <div class="popup-content">
                        <b>Road Segment</b><br>
                        ${formatTags(result.tags)}
                        <a href="#" class="edit-link" onclick='editWay(${result.id}, ${JSON.stringify(result.tags)}); return false;'>Edit this segment</a>
                    </div>
                `)
                .openOn(mymap);
        };
        resultsContainer.appendChild(resultItem);
    });
};
