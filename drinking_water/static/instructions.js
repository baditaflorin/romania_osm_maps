// instructions.js
// Toggle instructions visibility
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('toggle-instructions').addEventListener('click', () => {
        const instructions = document.getElementById('instructions');
        const isHidden = instructions.style.display === 'none';
        instructions.style.display = isHidden ? 'block' : 'none';
        document.getElementById('toggle-instructions').textContent = isHidden ? 'Hide Route Instructions' : 'Show Route Instructions';
    });
});
