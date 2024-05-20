// instructions.js

// Function to toggle instructions visibility
const toggleInstructions = () => {
    const instructions = document.getElementById('instructions');
    const isHidden = instructions.style.display === 'none';
    instructions.style.display = isHidden ? 'block' : 'none';
    document.getElementById('toggle-instructions').textContent = isHidden ? 'Hide Route Instructions' : 'Show Route Instructions';
};

// Function to attach event listeners
const attachEventListeners = () => {
    document.getElementById('toggle-instructions').addEventListener('click', toggleInstructions);
};

// Function to initialize the DOM
const initializeDOM = () => {
    attachEventListeners();
};

// DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", initializeDOM);
