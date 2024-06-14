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
});



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

    } catch (error) {
        console.error('Error fetching data and adding markers:', error);
    }
};

const createWay = (way) => {
    const latlngs = way.geometry.map(point => [point.lat, point.lon]);

    const wayPolyline = L.polyline(latlngs, { color: 'blue' });

    const popupContent = `
        <div class="popup-content">
            <b>Road Segment</b><br>
            ${formatTags(way.tags)}
            <a href="#" class="edit-link" onclick="editNode('${way.id}'); return false;">Edit this segment</a>
        </div>
    `;
    wayPolyline.bindPopup(popupContent);

    return wayPolyline;
};

const formatTags = (tags) => {
    if (!tags) return 'No tags available';

    return Object.entries(tags)
        .map(([key, value]) => `${key}: ${value}`)
        .join('<br>');
};

const editNode = (nodeId) => {
    const editUrl = `https://www.openstreetmap.org/edit?editor=id&node=${nodeId}`;
    window.open(editUrl, '_blank');
};
