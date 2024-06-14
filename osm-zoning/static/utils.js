// utils.js

// Utility function to get URL parameter
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Function to set URL parameters
function setUrlParameters(params) {
    const baseUrl = `${location.protocol}//${location.host}${location.pathname}`;
    const urlParams = new URLSearchParams(location.search);

    for (const key in params) {
        urlParams.set(key, params[key]);
    }

    window.history.replaceState({}, '', `${baseUrl}?${urlParams.toString()}`);
}
