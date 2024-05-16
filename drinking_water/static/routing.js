// routing.js

const drawRoute = (route, steps) => {
    if (routeLayer) {
        mymap.removeLayer(routeLayer);
    }
    const routeCoordinates = polyline.decode(route);
    routeLayer = L.polyline(routeCoordinates, { color: 'blue' }).addTo(mymap);
    mymap.fitBounds(routeLayer.getBounds());

    const instructions = document.getElementById('instructions');
    instructions.innerHTML = '<h4>Route Instructions</h4>';
    steps.forEach((step, index) => {
        const stepHtml = `<p id="step-${index}" class="step-instruction">${index + 1}. ${getStepInstruction(step)} (${step.distance.toFixed(1)} meters)</p>`;
        instructions.innerHTML += stepHtml;
    });

    // Add event listeners after DOM elements have been created
    steps.forEach((step, index) => {
        document.getElementById(`step-${index}`).addEventListener('click', () => highlightSegment(step));
    });

    // Show and expand the instructions
    document.getElementById('toggle-instructions').style.display = 'block';
    document.getElementById('instructions').style.display = 'block';
    document.getElementById('toggle-instructions').textContent = 'Hide Route Instructions';
};

const highlightSegment = (step) => {
    if (highlightedSegment) {
        mymap.removeLayer(highlightedSegment);
    }
    const segmentCoordinates = polyline.decode(step.geometry);
    highlightedSegment = L.polyline(segmentCoordinates, { color: 'red', weight: 5 }).addTo(mymap);
    mymap.fitBounds(highlightedSegment.getBounds());
};

const routeToNode = (lat, lon) => {
    getUserPosition((position) => {
        const userLat = position.coords.latitude.toFixed(6);
        const userLon = position.coords.longitude.toFixed(6);
        const routingUrl = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${userLon},${userLat};${lon},${lat}?overview=full&steps=true&geometries=polyline`;

        $.getJSON(routingUrl, (data) => {
            if (data.code === 'Ok') {
                const route = data.routes[0].geometry;
                const steps = data.routes[0].legs[0].steps;
                drawRoute(route, steps);
            } else {
                console.error("Error fetching route:", data);
            }
        });
    });
};
