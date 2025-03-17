// export.js
(function () {
    // Initialize export modal
    const exportBtn = document.getElementById('export-btn');
    const exportModal = document.getElementById('export-modal');
    const closeModalBtn = exportModal.querySelector('.close');
    const exportPngBtn = document.getElementById('export-png-btn');
    const exportGeojsonBtn = document.getElementById('export-geojson-btn');
    const exportLayerList = document.getElementById('export-layer-list');

    exportBtn.addEventListener('click', () => {
        // Populate layer selection
        exportLayerList.innerHTML = '';
        const layers = window.Layers.getLayers();
        Object.keys(layers).forEach(name => {
            if (window.map.hasLayer(layers[name])) {
                const li = document.createElement('li');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = name;
                checkbox.checked = true; // Default to all visible layers
                const label = document.createElement('label');
                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(` ${name}`));
                li.appendChild(label);
                exportLayerList.appendChild(li);
            }
        });
        exportModal.style.display = 'flex';
    });

    closeModalBtn.addEventListener('click', () => {
        exportModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === exportModal) {
            exportModal.style.display = 'none';
        }
    });

    // Export as PNG
    exportPngBtn.addEventListener('click', () => {
        const mapElement = document.getElementById('map');
        const controls = document.querySelector('.leaflet-control-container');
        controls.style.display = 'none';

        // Wait for tiles to load
        window.map.whenReady(() => {
            html2canvas(mapElement, {
                useCORS: true,
                scale: 2,
                logging: false
            }).then(canvas => {
                controls.style.display = '';
                const link = document.createElement('a');
                link.download = 'map-export.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }).catch(error => {
                console.error('PNG Export Error:', error);
                controls.style.display = '';
                alert('Failed to export as PNG. Check console for details.');
            });
        });

        exportModal.style.display = 'none';
    });

    // Export as GeoJSON
    exportGeojsonBtn.addEventListener('click', () => {
        const checkboxes = exportLayerList.querySelectorAll('input[type="checkbox"]:checked');
        const selectedLayers = Array.from(checkboxes).map(cb => cb.value);
        const allGeojson = window.Layers.getVisibleLayersGeoJSON();
        const filteredGeojson = {
            type: 'FeatureCollection',
            features: allGeojson.features.filter(feature => selectedLayers.includes(feature.properties.layerName))
        };

        const blob = new Blob([JSON.stringify(filteredGeojson, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'selected-layers.geojson';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        exportModal.style.display = 'none';
    });
})();