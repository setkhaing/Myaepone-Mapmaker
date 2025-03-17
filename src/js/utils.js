// utils.js
const Utils = {
    logError(message, error) {
        console.error(`[Error] ${message}:`, error);
    }
};

// Expose for use in other files (no module system without Node.js)
window.Utils = Utils;