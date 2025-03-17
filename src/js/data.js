// data.js
(function () {
    // GeoJSON URLs for Open Data MM (using local files)
    const openDataMMLayers = {
        'myanmar-boundary': 'data/myanmar-boundary.geojson',
        'myanmar-states': 'data/myanmar-states.geojson',
        'myanmar-districts': 'data/myanmar-districts.geojson',
        'myanmar-townships': 'data/myanmar-townships.geojson'
    };

    // Initialize shapefile upload
    const shapefileInput = document.getElementById('shapefile-input');
    const uploadShapefileBtn = document.getElementById('upload-shapefile-btn');

    uploadShapefileBtn.addEventListener('click', () => {
        shapefileInput.click();
    });

    shapefileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                shp(e.target.result).then((geojson) => {
                    const layerName = file.name.replace('.zip', '');
                    const geojsonLayer = L.geoJSON(geojson, {
                        style: {
                            color: '#3388ff',
                            fillColor: '#3388ff',
                            fillOpacity: 0.2
                        }
                    });
                    window.Layers.addLayer(layerName, geojsonLayer);
                    window.map.fitBounds(geojsonLayer.getBounds());
                }).catch((error) => {
                    window.Utils.logError('Failed to parse shapefile', error);
                    alert('Error parsing shapefile. Please ensure it’s a valid .zip file.');
                });
            };
            reader.readAsArrayBuffer(file);
        }
    });

    // Initialize Open Data MM modal
    const openDataMMBtn = document.getElementById('open-data-mm-btn');
    const openDataMMModal = document.getElementById('open-data-mm-modal');
    const closeModalBtn = openDataMMModal.querySelector('.close');
    const addOpenDataMMBtn = document.getElementById('add-open-data-mm-btn');

    openDataMMBtn.addEventListener('click', () => {
        openDataMMModal.style.display = 'flex';
    });

    closeModalBtn.addEventListener('click', () => {
        openDataMMModal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === openDataMMModal) {
            openDataMMModal.style.display = 'none';
        }
    });

    addOpenDataMMBtn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('#open-data-mm-list input[type="checkbox"]:checked');
        checkboxes.forEach((checkbox) => {
            const layerId = checkbox.value;
            const url = openDataMMLayers[layerId];
            if (url) {
                fetch(url)
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then((geojson) => {
                        const layerName = layerId.replace('myanmar-', 'Myanmar ').replace('boundary', 'Boundary');
                        const geojsonLayer = L.geoJSON(geojson, {
                            style: {
                                color: '#ff7800',
                                fillColor: '#ff7800',
                                fillOpacity: 0.2
                            }
                        });
                        window.Layers.addLayer(layerName, geojsonLayer);
                        window.map.fitBounds(geojsonLayer.getBounds());
                    })
                    .catch((error) => {
                        window.Utils.logError('Failed to load Open Data MM layer', error);
                        alert('Error loading layer: ' + layerId);
                    });
            }
        });
        openDataMMModal.style.display = 'none';
    });
})();