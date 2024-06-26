// Filename: ./static/data.js

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
    safe ? 'blue-icon' : 'red-icon'
);

const otherWaterIcon = (safe) => createIcon(
    safe ? '/static/water_icon.png' : '/static/water_icon.png',
    safe ? 'green-icon' : 'red-icon'
);

const isNodeSafeWaterSource = (node) => node.tags.drinking_water === 'yes';

const getNodeTypeAndIcon = (node) => {
    const typeToIcon = {
        'drinking_water': waterIcon,
        'water_well': waterWellIcon(isNodeSafeWaterSource(node)),
        'spring': waterWellIcon(isNodeSafeWaterSource(node)),
        'toilets': otherWaterIcon(isNodeSafeWaterSource(node)),
        'water_tap': waterWellIcon(isNodeSafeWaterSource(node)),
        'shelter': otherWaterIcon(isNodeSafeWaterSource(node)),
        'wilderness_hut': otherWaterIcon(isNodeSafeWaterSource(node)),
        'camp_site': otherWaterIcon(isNodeSafeWaterSource(node)),
        'camp_pitch': otherWaterIcon(isNodeSafeWaterSource(node)),
        'rest_area': otherWaterIcon(isNodeSafeWaterSource(node)),
        'fountain': otherWaterIcon(isNodeSafeWaterSource(node)),
        'stream': otherWaterIcon(isNodeSafeWaterSource(node)),
        'watering_place': otherWaterIcon(isNodeSafeWaterSource(node)),
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

const fetchMapillaryThumbnail = async (mapillaryId) => {
    const accessToken = 'MLY|7215581891904266|30d41880cf205a42d203b9d95a632579';
    const url = `https://graph.mapillary.com/${mapillaryId}?access_token=${accessToken}&fields=thumb_original_url`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.thumb_original_url;
    } catch (error) {
        console.error('Error fetching Mapillary thumbnail:', error);
        return null;
    }
};

const loadMapillaryImage = async (element, mapillaryId) => {
    const thumbnailUrl = await fetchMapillaryThumbnail(mapillaryId);
    if (thumbnailUrl) {
        element.innerHTML = `<a href="https://www.mapillary.com/app/?pKey=${mapillaryId}" target="_blank"><img src="${thumbnailUrl}" alt="Mapillary Photo" style="max-width: 100%; height: auto;"></a>`;
    }
};

const createPopupContent = async (node, denumire) => {
    let mapillaryLink = '';
    if (node.tags.mapillary) {
        const thumbnailUrl = await fetchMapillaryThumbnail(node.tags.mapillary);
        if (thumbnailUrl) {
            mapillaryLink = `<a href="https://www.mapillary.com/app/?pKey=${node.tags.mapillary}" target="_blank"><img src="${thumbnailUrl}" alt="Mapillary Photo" style="max-width: 100%; height: auto;"></a><br>`;
        }
    }
    return `
        <div class="popup-content">
            <b>${denumire}</b><br>
            ${formatTags(node.tags)}
            <div class="mapillary-thumbnail">${mapillaryLink}</div>
            <a href="#" class="edit-link" onclick="editNode('${node.id}'); return false;">Edit this node</a>
            <br>
            <button onclick="routeToNode(${node.lat.toFixed(6)},${node.lon.toFixed(6)})" class="route-button">Route to here</button>
        </div>`;
};

const editNode = (nodeId) => {
    const hasSeenEditModal = Cookies.get('hasSeenEditModal');
    const editUrl = `https://www.openstreetmap.org/edit?editor=id&node=${nodeId}`;

    if (!hasSeenEditModal) {
        showModal(() => {}, true, editUrl);
    } else {
        window.open(editUrl, '_blank');
    }
};

const createMarker = async (node) => {
    const { type, icon } = getNodeTypeAndIcon(node) || {};
    if (!type || !icon) return null;
    const popupContent = await createPopupContent(node, type);
    return L.marker([node.lat, node.lon], { icon }).bindPopup(popupContent);
};

const filterAndMapNodes = async (data) => {
    const seenNodeIds = new Set();

    // Step 1: Filter nodes based on type and uniqueness
    const filteredNodes = data.filter((node) => {
        const nodeInfo = getNodeTypeAndIcon(node);
        if (nodeInfo && !seenNodeIds.has(node.id)) {
            seenNodeIds.add(node.id);
            return true;
        }
        return false;
    });

    // Step 2: Create markers for filtered nodes
    const markers = await Promise.all(filteredNodes.map(async (node) => {
        try {
            const marker = await createMarker(node);
            if (marker) {
                return marker;
            }
        } catch (error) {
            console.error(`Error creating marker for node ID: ${node.id}`, error);
        }
        return null;
    }));

    // Step 3: Return non-null markers
    return markers.filter(marker => marker !== null);
};

// Function to fetch data and add markers to the map
const fetchDataAndAddMarkers = async (criteria = {}) => {
    try {
        const response = await fetch('/data');
        const data = await response.json();

        console.log('Fetched data:', data);

        const filteredData = filterData(data, criteria); // Apply the filter

        markers.clearLayers(); // Clear existing markers to avoid duplicates
        const markersToAdd = await filterAndMapNodes(filteredData);
        console.log('Markers to add:', markersToAdd);
        markersToAdd.forEach((marker) => markers.addLayer(marker));
        mymap.addLayer(markers);

        // Update the title with the count of markers
        const updateTitle = updateTitleAndCount(markersToAdd.length);
        updateTitle();
    } catch (error) {
        console.error('Error fetching data and adding markers:', error);
    }
};

// Load the filter.js script
const loadFilterScript = () => {
    const script = document.createElement('script');
    script.src = 'static/filter.js';
    script.onload = () => {
        console.log('Filter script loaded successfully.');
    };
    document.head.appendChild(script);
};

loadFilterScript();
