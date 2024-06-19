// data.js

import { updateTitleAndCount } from "./utils.js";
import { routeToNode } from "./routing.js";
import {filterData} from "./filter.js";
import { fetchNodeDetails, updateNodeDetails, editInPlace } from './editInPlace.js';

const markers = L.markerClusterGroup();
let allData = { toilets: [], gasStations: [], restaurants: [] }; // Store all fetched data

const icons = {
    toilet: L.icon({
        iconUrl: '/static/toilet_icon.png',
        iconSize: [32, 37],
        iconAnchor: [16, 37],
        popupAnchor: [0, -28],
        className: 'toilet-icon'
    }),
    gasStation: L.icon({
        iconUrl: '/static/gas_station_icon.png',
        iconSize: [32, 37],
        iconAnchor: [16, 37],
        popupAnchor: [0, -28],
        className: 'gas-station-icon'
    }),
    restaurant: L.icon({
        iconUrl: '/static/restaurant_icon.png',
        iconSize: [32, 37],
        iconAnchor: [16, 37],
        popupAnchor: [0, -28],
        className: 'restaurant-icon'
    })
};

const getNodeTypeAndIcon = (node) => {
    if (node.tags.amenity === 'toilets' || node.tags.toilets === 'yes') {
        return { type: 'toilet', icon: icons.toilet };
    } else if (node.tags.amenity === 'fuel') {
        return { type: 'gasStation', icon: icons.gasStation };
    } else if (node.tags.amenity === 'restaurant') {
        return { type: 'restaurant', icon: icons.restaurant };
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
    const div = document.createElement('div');
    div.className = 'popup-content';
    div.setAttribute('data-node-id', node.id); // Set node ID as data attribute
    div.innerHTML = `
        <b>${denumire}</b><br>
        ${formatTags(node.tags)}
        <div class="mapillary-thumbnail">${mapillaryLink}</div>
        <a href="#" class="edit-link" data-node-id="${node.id}">Edit this node</a><br>
        <a href="#" class="edit-in-place-link" data-node-id="${node.id}">Edit In place</a><br>
        <button class="route-button" data-lat="${node.lat}" data-lon="${node.lon}">Route to here</button>
    `;

    return div;
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

// Create markers and popups for each type of node
const createMarker = async (node) => {
    const { type, icon } = getNodeTypeAndIcon(node) || {};
    if (!type || !icon) return null;
    const popupContent = await createPopupContent(node, type);
    const marker = L.marker([node.lat, node.lon], { icon }).bindPopup(popupContent);

    marker.on('popupopen', () => {
        const popupElement = marker.getPopup().getElement();
        popupElement.querySelector('.edit-link').addEventListener('click', (event) => {
            event.preventDefault();
            editNode(event.target.dataset.nodeId);
        });
        popupElement.querySelector('.edit-in-place-link').addEventListener('click', (event) => {
            event.preventDefault();
            editInPlace(event.target.dataset.nodeId);
        });
        popupElement.querySelector('.route-button').addEventListener('click', (event) => {
            const lat = parseFloat(event.target.dataset.lat);
            const lon = parseFloat(event.target.dataset.lon);
            routeToNode(lat, lon);
        });
    });

    return marker;
};



const filterAndMapNodes = async (data) => {
    const seenNodeIds = new Set();

    const filteredNodes = data.filter((node) => {
        const nodeInfo = getNodeTypeAndIcon(node);
        if (nodeInfo && !seenNodeIds.has(node.id)) {
            seenNodeIds.add(node.id);
            return true;
        }
        return false;
    });

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

    return markers.filter(marker => marker !== null);
};


// Fetch data and add markers for all types of nodes
export const fetchDataAndAddMarkers = async (map, criteria = {}) => {
    if (!map || typeof map.getBounds !== 'function') {
        console.error('Invalid map object');
        return;
    }

    if (allData.toilets.length === 0 && allData.gasStations.length === 0 && allData.restaurants.length === 0) {
        const bounds = map.getBounds();
        const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;

        try {
            const response = await fetch(`/data?bbox=${bbox}`);
            const data = await response.json();
            allData.toilets = data.toilets;
            allData.toiletsPois = data.toiletsPois;
            allData.gasStations = data.gasStations;
            allData.restaurants = data.restaurants;
        } catch (error) {
            console.error('Error fetching data:', error);
            return;
        }
    }

    markers.clearLayers();

    if (map.getZoom() < 7) {
        alert("Zoom in to see locations");
        return;
    }

    // Combine all data into a single array for filtering and mapping
    const combinedData = [
        ...allData.toilets,
        ...allData.toiletsPois,
        ...allData.gasStations,
        ...allData.restaurants
    ];

    const filteredData = filterData(combinedData, criteria);
    const markersToAdd = await filterAndMapNodes(filteredData);
    markersToAdd.forEach((marker) => markers.addLayer(marker));
    map.addLayer(markers);

    const updateTitle = updateTitleAndCount(markersToAdd.length);
    updateTitle();
};
