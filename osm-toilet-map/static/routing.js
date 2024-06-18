let routeLayer;
let highlightedSegment;

const createRouteLayer = (route) => {
    const routeCoordinates = polyline.decode(route);
    return L.polyline(routeCoordinates, { color: 'blue' });
};

const setRouteLayer = (routeLayer, map) => {
    return (newRouteLayer) => {
        if (routeLayer) {
            map.removeLayer(routeLayer);
        }
        newRouteLayer.addTo(map);
        map.fitBounds(newRouteLayer.getBounds());
        return newRouteLayer;
    };
};

const createStepHtml = (step, index) => {
    return `<p id="step-${index}" class="step-instruction">${index + 1}. ${getStepInstruction(step)} (${step.distance.toFixed(0)} meters)</p>`;
};

const setInstructionsContent = (instructionsElement, steps) => {
    instructionsElement.innerHTML = '<h4>Route Instructions</h4>';
    steps.forEach((step, index) => {
        instructionsElement.innerHTML += createStepHtml(step, index);
    });
};

const addStepClickListeners = (steps) => {
    steps.forEach((step, index) => {
        document.getElementById(`step-${index}`).addEventListener('click', () => highlightSegment(step));
    });
};

const updateInstructionsVisibility = (visibility) => {
    document.getElementById('toggle-instructions').style.display = visibility ? 'block' : 'none';
    document.getElementById('instructions').style.display = visibility ? 'block' : 'none';
    document.getElementById('toggle-instructions').textContent = visibility ? 'Hide Route Instructions' : 'Show Route Instructions';
};

const drawRoute = (route, steps) => {
    const newRouteLayer = createRouteLayer(route);
    routeLayer = setRouteLayer(routeLayer, mymap)(newRouteLayer);

    const instructionsElement = document.getElementById('instructions');
    setInstructionsContent(instructionsElement, steps);
    addStepClickListeners(steps);

    updateInstructionsVisibility(true);
};

const createHighlightedSegment = (step) => {
    const segmentCoordinates = polyline.decode(step.geometry);
    return L.polyline(segmentCoordinates, { color: 'red', weight: 5 });
};

const setHighlightedSegment = (highlightedSegment, map) => {
    return (newSegment) => {
        if (highlightedSegment) {
            map.removeLayer(highlightedSegment);
        }
        newSegment.addTo(map);
        map.fitBounds(newSegment.getBounds());
        return newSegment;
    };
};

const highlightSegment = (step) => {
    const newSegment = createHighlightedSegment(step);
    highlightedSegment = setHighlightedSegment(highlightedSegment, mymap)(newSegment);
};

const createRoutingUrl = (userLat, userLon, lat, lon) => {
    return `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${userLon},${userLat};${lon},${lat}?overview=full&steps=true&geometries=polyline`;
};

const fetchRouteData = (routingUrl) => {
    return $.getJSON(routingUrl);
};

const handleRouteData = (data) => {
    if (data.code === 'Ok') {
        const route = data.routes[0].geometry;
        const steps = data.routes[0].legs[0].steps;
        drawRoute(route, steps);
    } else {
        console.error("Error fetching route:", data);
    }
};

const routeToNode = (lat, lon) => {
    getUserPosition((position) => {
        const userLat = position.coords.latitude.toFixed(6);
        const userLon = position.coords.longitude.toFixed(6);
        if (!isNaN(userLat) && !isNaN(userLon) && !isNaN(lat) && !isNaN(lon)) {
            const routingUrl = createRoutingUrl(userLat, userLon, lat, lon);
            fetchRouteData(routingUrl).then(handleRouteData);
        } else {
            console.error("Invalid coordinates for routing");
        }
    });
};
