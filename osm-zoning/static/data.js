// data.js

import { fetchDataAndAddMarkers, clearMarkers } from './markers.js';
import { getUrlParameter, setUrlParameters } from './utils.js';

document.addEventListener("DOMContentLoaded", async function () {
    const initialZoom = parseInt(getUrlParameter('z'), 10) || 7;

    if (initialZoom >= 15) {
        await fetchDataAndAddMarkers(window.mymap); // Ensure window.mymap is passed
    }

    window.mymap.on('zoomend', async () => {
        const zoomLevel = window.mymap.getZoom();
        if (zoomLevel >= 15) {
            await fetchDataAndAddMarkers(window.mymap);
        } else {
            clearMarkers();
        }
    });

    window.mymap.on('moveend', async () => {
        const center = window.mymap.getCenter();
        const z = window.mymap.getZoom();
        setUrlParameters({
            lat: center.lat.toFixed(6),
            lon: center.lng.toFixed(6),
            z: z
        });

        if (z >= 15) {
            await fetchDataAndAddMarkers(window.mymap);
        }
    });
});
