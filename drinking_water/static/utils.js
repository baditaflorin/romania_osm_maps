//utils.js Utility functions
const getUrlParameter = (name) => {
    const regex = new RegExp(`[\\?&]${name}=([^&#]*)`);
    const results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

const setUrlParameter = (key, value) => {
    const baseUrl = [location.protocol, '//', location.host, location.pathname].join('');
    const urlQueryString = document.location.search;
    const newParam = `${key}=${value}`;
    const params = urlQueryString ? urlQueryString.replace(new RegExp(`([?&])${key}[^&]*`), `$1${newParam}`) : `?${newParam}`;
    window.history.replaceState({}, '', baseUrl + params);
};

// Function to update the title and count of the elements
const updateTitleAndCount = (count) => {
    document.getElementById('title').textContent = `Drinking Water Locations in Romania: ${count} locations found`;
};

// Function to generate step instructions
const getStepInstruction = (step) => {
    const { type, modifier } = step.maneuver;
    const action = modifier ? `Turn ${modifier}` : 'Continue';
    const road = step.name || 'the road';
    return type === 'depart' ? `Start on ${road}` : type === 'arrive' ? 'Arrive at your destination' : `${action} onto ${road}`;
};