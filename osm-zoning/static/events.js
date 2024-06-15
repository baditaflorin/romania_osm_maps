// events.js

import { fetchDataAndAddMarkers, clearMarkers } from './markers.js';
import { setUrlParameters } from './utils.js';

export function setupMapEventListeners(mymap) {
    mymap.on('zoomend', async () => {
        const zoomLevel = mymap.getZoom();
        if (zoomLevel >= 15) {
            await fetchDataAndAddMarkers(mymap);
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
            await fetchDataAndAddMarkers(mymap);
        }
    });
}
