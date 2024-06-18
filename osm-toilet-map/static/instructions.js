// instructions.js

const toggleInstructions = () => {
    const instructions = document.getElementById('instructions');
    const isHidden = instructions.style.display === 'none';
    instructions.style.display = isHidden ? 'block' : 'none';
    document.getElementById('toggle-instructions').textContent = isHidden ? 'Hide Route Instructions' : 'Show Route Instructions';
};

const toggleProjectInfo = () => {
    const projectInfo = document.getElementById('project-info');
    const isHidden = projectInfo.style.display === 'none';
    projectInfo.style.display = isHidden ? 'block' : 'none';
    document.getElementById('toggle-project-info').textContent = isHidden ? 'Hide Project Info' : 'Show Project Info';
};

const attachEventListeners = () => {
    document.getElementById('toggle-instructions').addEventListener('click', toggleInstructions);
    document.getElementById('toggle-project-info').addEventListener('click', toggleProjectInfo);
};

const initializeDOM = () => {
    attachEventListeners();
};

document.addEventListener("DOMContentLoaded", initializeDOM);
