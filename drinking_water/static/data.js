// data.js

const markers = L.markerClusterGroup();

const waterIcon = L.icon({
    iconUrl: '/static/water_icon.png',
    iconSize: [32, 37],
    iconAnchor: [16, 37],
    popupAnchor: [0, -28],
    className: 'blue-icon'
});

const waterWellIcon = (safe) => L.icon({
    iconUrl: safe ? '/static/water_icon.png' : '/static/water_icon.png',
    iconSize: [32, 37],
    iconAnchor: [16, 37],
    popupAnchor: [0, -28],
    className: safe ? 'green-icon' : 'red-icon'
});

// Fetch the data and add markers using the custom icon
const fetchDataAndAddMarkers = () => {
    $.getJSON('/data', (data) => {
        const filteredData = data.filter((node) => {
            return (node.tags.amenity === 'drinking_water') ||
                (node.tags.man_made === 'water_well' && (node.tags.drinking_water === 'yes') || (node.tags.drinking_water === 'no')) ||
                (node.tags.natural === 'spring' && (node.tags.drinking_water === 'yes') || (node.tags.drinking_water === 'no')) ||
                (node.tags.amenity === 'toilets' && (node.tags.drinking_water === 'yes' || node.tags.drinking_water === 'no')) ||
                (node.tags.man_made === 'water_tap' && (node.tags.drinking_water === 'yes' || node.tags.drinking_water === 'no')) ||
                (node.tags.amenity === 'shelter' && (node.tags.drinking_water === 'yes' || node.tags.drinking_water === 'no')) ||
                (node.tags.tourism === 'wilderness_hut' && (node.tags.drinking_water === 'yes' || node.tags.drinking_water === 'no')) ||
                (node.tags.tourism === 'camp_site' && (node.tags.drinking_water === 'yes' || node.tags.drinking_water === 'no')) ||
                (node.tags.tourism === 'camp_pitch' && (node.tags.drinking_water === 'yes' || node.tags.drinking_water === 'no')) ||
                (node.tags.highway === 'rest_area' && (node.tags.drinking_water === 'yes' || node.tags.drinking_water === 'no')) ||
                (node.tags.amenity === 'fountain' && (node.tags.drinking_water === 'yes' || node.tags.drinking_water === 'no')) ||
                (node.tags.waterway === 'stream' && (node.tags.drinking_water === 'yes' || node.tags.drinking_water === 'no')) ||
                (node.tags.amenity === 'watering_place' && (node.tags.drinking_water === 'yes' || node.tags.drinking_water === 'no'));
        });

        filteredData.forEach((node) => {
            let icon;
            let denumire;
            if (node.tags.amenity === 'drinking_water') {
                icon = waterIcon;
                denumire = "Drinking Water";
            } else if (node.tags.man_made === 'water_well') {
                const safe = node.tags.drinking_water === 'yes';
                icon = waterWellIcon(safe);
                denumire = "Water Well";
            } else if (node.tags.natural === 'spring') {
                const safe = node.tags.drinking_water === 'yes';
                icon = waterWellIcon(safe);
                denumire = "Spring";
            } else if (node.tags.amenity === 'toilets') {
                const safe = node.tags.drinking_water === 'yes';
                icon = waterWellIcon(safe);
                denumire = "Toilet";
            } else if (node.tags.man_made === 'water_tap') {
                const safe = node.tags.drinking_water === 'yes';
                icon = waterWellIcon(safe);
                denumire = "Water Tap";
            } else if (node.tags.amenity === 'shelter') {
                const safe = node.tags.drinking_water === 'yes';
                icon = waterWellIcon(safe);
                denumire = "Shelter";
            } else if (node.tags.tourism === 'wilderness_hut') {
                const safe = node.tags.drinking_water === 'yes';
                icon = waterWellIcon(safe);
                denumire = "Wilderness Hut";
            } else if (node.tags.tourism === 'camp_site') {
                const safe = node.tags.drinking_water === 'yes';
                icon = waterWellIcon(safe);
                denumire = "Camp Site";
            } else if (node.tags.tourism === 'camp_pitch') {
                const safe = node.tags.drinking_water === 'yes';
                icon = waterWellIcon(safe);
                denumire = "Camp Pitch";
            } else if (node.tags.highway === 'rest_area') {
                const safe = node.tags.drinking_water === 'yes';
                icon = waterWellIcon(safe);
                denumire = "Rest Area";
            } else if (node.tags.amenity === 'fountain') {
                const safe = node.tags.drinking_water === 'yes';
                icon = waterWellIcon(safe);
                denumire = "Fountain";
            } else if (node.tags.waterway === 'stream') {
                const safe = node.tags.drinking_water === 'yes';
                icon = waterWellIcon(safe);
                denumire = "Stream";
            } else if (node.tags.amenity === 'watering_place') {
                const safe = node.tags.drinking_water === 'yes';
                icon = waterWellIcon(safe);
                denumire = "Watering Place";
            } else {
                return;
            }

            const popupContent = `
            <div class="popup-content">
                <b>${denumire}</b><br>
                ${Object.entries(node.tags).map(([key, value]) => `${key}: ${value}`).join('<br>')}
                <br>
                <a href="https://www.openstreetmap.org/edit?editor=id&node=${node.id}" target="_blank" class="edit-link">Edit this node</a>
                <br>
                <button onclick="routeToNode(${node.lat.toFixed(6)},${node.lon.toFixed(6)})" class="route-button">Route to here</button>
            </div>`;
            const marker = L.marker([node.lat, node.lon], { icon }).bindPopup(popupContent);
            markers.addLayer(marker);
        });
        mymap.addLayer(markers);
        // Call the function returned by updateTitleAndCount
        const updateTitle = updateTitleAndCount(filteredData.length);
        updateTitle();
    });
};

document.addEventListener("DOMContentLoaded", fetchDataAndAddMarkers);
