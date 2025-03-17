// config.js
const Config = {
    map: {
        defaultCenter: [0, 0],
        defaultZoom: 2,
        minZoom: 1,
        maxZoom: 18
    },
    basemaps: {
        light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        satellite: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    }
};

// Expose for use in other scripts
window.Config = Config;