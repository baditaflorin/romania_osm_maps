const markers = L.markerClusterGroup();

const createIcon = (iconUrl, className) => L.icon({
    iconUrl,
    iconSize: [32, 37],
    iconAnchor: [16, 37],
    popupAnchor: [0, -28],
    className
});

const waterIcon = createIcon('/static/water_icon.png', 'blue-icon');

const waterWellIcon = (safe) => createIcon(
    safe ? '/static/water_icon.png' : '/static/water_icon.png',
    safe ? 'green-icon' : 'red-icon'
);

const isNodeSafeWaterSource = (node) => node.tags.drinking_water === 'yes';

const getNodeTypeAndIcon = (node) => {
    const typeToIcon = {
        'drinking_water': waterIcon,
        'water_well': waterWellIcon(isNodeSafeWaterSource(node)),
        'spring': waterWellIcon(isNodeSafeWaterSource(node)),
        'toilets': waterWellIcon(isNodeSafeWaterSource(node)),
        'water_tap': waterWellIcon(isNodeSafeWaterSource(node)),
        'shelter': waterWellIcon(isNodeSafeWaterSource(node)),
        'wilderness_hut': waterWellIcon(isNodeSafeWaterSource(node)),
        'camp_site': waterWellIcon(isNodeSafeWaterSource(node)),
        'camp_pitch': waterWellIcon(isNodeSafeWaterSource(node)),
        'rest_area': waterWellIcon(isNodeSafeWaterSource(node)),
        'fountain': waterWellIcon(isNodeSafeWaterSource(node)),
        'stream': waterWellIcon(isNodeSafeWaterSource(node)),
        'watering_place': waterWellIcon(isNodeSafeWaterSource(node)),
    };

    for (const key in typeToIcon) {
        if (
            node.tags.amenity === key ||
            node.tags.man_made === key ||
            node.tags.natural === key ||
            node.tags.highway === key ||
            node.tags.waterway === key ||
            node.tags.tourism === key
        ) {
            return {
                type: key,
                icon: typeToIcon[key]
            };
        }
    }
    return null;
};

const formatTags = (tags) => {
    return Object.entries(tags)
        .map(([key, value]) => `${key}: ${value}`)
        .join('<br>');
};

const createPopupContent = (node, denumire) => `
    <div class="popup-content">
        <b>${denumire}</b><br>
        ${formatTags(node.tags)}
        <br>
        <a href="https://www.openstreetmap.org/edit?editor=id&node=${node.id}" target="_blank" class="edit-link">Edit this node</a>
        <br>
        <button onclick="routeToNode(${node.lat.toFixed(6)},${node.lon.toFixed(6)})" class="route-button">Route to here</button>
    </div>`;

const createMarker = (node) => {
    const { type, icon } = getNodeTypeAndIcon(node) || {};
    if (!type || !icon) return null;
    const popupContent = createPopupContent(node, type);
    return L.marker([node.lat, node.lon], { icon }).bindPopup(popupContent);
};

const filterAndMapNodes = (data) => {
    return data
        .filter((node) => getNodeTypeAndIcon(node) !== null)
        .map(createMarker)
        .filter((marker) => marker !== null);
};

const fetchDataAndAddMarkers = () => {
    $.getJSON('/data', (data) => {
        const markersToAdd = filterAndMapNodes(data);
        markersToAdd.forEach((marker) => markers.addLayer(marker));
        mymap.addLayer(markers);

        // Call the function returned by updateTitleAndCount
        const updateTitle = updateTitleAndCount(markersToAdd.length);
        updateTitle();
    });
};

document.addEventListener("DOMContentLoaded", fetchDataAndAddMarkers);
