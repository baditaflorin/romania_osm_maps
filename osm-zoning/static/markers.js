// markers.js

import { fetchWays } from './api.js';
import { createWay, createLegend } from './wayUtils.js';

export const clearMarkers = () => {
    console.log('Clearing markers');
    markers.clearLayers();
};

export const fetchDataAndAddMarkers = async (mymap) => {
    try {
        const bounds = mymap.getBounds();
        const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;

        const data = await fetchWays(bbox);

        clearMarkers();

        // Clear the global way data before adding new data
        window.wayData = [];
        console.log('Clearing wayData');

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
