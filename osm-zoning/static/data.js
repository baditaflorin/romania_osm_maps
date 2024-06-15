


document.addEventListener("DOMContentLoaded", async function () {
    const initialZoom = parseInt(getUrlParameter('z'), 10) || 7;

    if (initialZoom >= 15) {
        await fetchDataAndAddMarkers();
    }

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
});

