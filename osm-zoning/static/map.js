// map.js

import { getUrlParameter, setUrlParameters } from './utils.js';
import { initializeMap } from './mapInitialization.js';
import { setupMapEventListeners } from './events.js';
import { fetchDataAndAddMarkers } from './markers.js';
import { editWay, submitEditWayForm } from './wayUtils.js';

document.addEventListener("DOMContentLoaded", async function () {
    const initialLat = parseFloat(getUrlParameter('lat')) || 45.9432;
    const initialLon = parseFloat(getUrlParameter('lon')) || 24.9668;
    const initialZoom = parseInt(getUrlParameter('z'), 10) || 7;

    window.mymap = initializeMap(initialLat, initialLon, initialZoom); // Define mymap globally

    // Attach editWay and submitEditWayForm to the global window object
    window.editWay = editWay;
    window.submitEditWayForm = submitEditWayForm;

    setupMapEventListeners(window.mymap);

    if (initialZoom >= 15) {
        await fetchDataAndAddMarkers(window.mymap);
    }

    document.getElementById("saveChangesButton").addEventListener("click", async function() {
        await saveChanges();
    });

    document.getElementById("searchBar").addEventListener("input", searchStreets);
});

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
            window.mymap.setView(latlngs[0], 18); // Zoom to the first point of the street
            L.popup()
                .setLatLng(latlngs[0])
                .setContent(`
                    <div class="popup-content">
                        <b>Road Segment</b><br>
                        ${formatTags(result.tags)}
                        <a href="#" class="edit-link" onclick='editWay(${result.id}, ${JSON.stringify(result.tags)}); return false;'>Edit this segment</a>
                    </div>
                `)
                .openOn(window.mymap);
        };
        resultsContainer.appendChild(resultItem);
    });
};

const formatTags = (tags) => {
    if (!tags) return 'No tags available';

    return Object.entries(tags)
        .map(([key, value]) => `${key}: ${value}`)
        .join('<br>');
};
