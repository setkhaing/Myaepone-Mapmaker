// map.js
(function () {
    // Initialize the map
    window.map = L.map('map', {
        center: [21.9162, 95.9560], // Center on Myanmar
        zoom: 6,
        minZoom: 3,
        maxZoom: 18
    });

    // Basemap configurations
    const basemaps = {
        'cartodb-light': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }),
        'cartodb-dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }),
        'osm': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }),
        'satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 19
        })
    };

    // Set default basemap
    basemaps['cartodb-light'].addTo(window.map);

    // Basemap switcher
    const basemapSelect = document.getElementById('basemap-select');
    basemapSelect.addEventListener('change', function () {
        const selectedBasemap = this.value;
        window.map.eachLayer(layer => {
            if (basemaps[Object.keys(basemaps).find(key => basemaps[key] === layer)]) {
                window.map.removeLayer(layer);
            }
        });
        basemaps[selectedBasemap].addTo(window.map);
        // Fade transition
        window.map.getPane('tilePane').style.opacity = 0;
        setTimeout(() => {
            window.map.getPane('tilePane').style.opacity = 1;
        }, 10);
    });


    // Drawing Functionality
    let drawingMode = null; // 'point', 'line', or 'polygon'
    let drawingPoints = [];
    let drawingLayer = null;
    let isDrawing = false;
    let drawCount = { point: 0, line: 0, polygon: 0 }; // Counter for naming drawn layers
    let currentPopup = null; // Store reference to the current popup

    // Draw modal handlers
    const drawBtn = document.getElementById('draw-btn');
    const drawModal = document.getElementById('draw-modal');
    const closeModalBtn = drawModal.querySelector('.close');
    const drawPointBtn = document.getElementById('draw-point-btn');
    const drawLineBtn = document.getElementById('draw-line-btn');
    const drawPolygonBtn = document.getElementById('draw-polygon-btn');

    drawBtn.addEventListener('click', () => {
        drawModal.style.display = 'flex';
    });

    closeModalBtn.addEventListener('click', () => {
        drawModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === drawModal) {
            drawModal.style.display = 'none';
        }
    });

    // Start drawing for each type
    drawPointBtn.addEventListener('click', () => {
        startDrawing('point');
        drawModal.style.display = 'none';
    });

    drawLineBtn.addEventListener('click', () => {
        startDrawing('line');
        drawModal.style.display = 'none';
    });

    drawPolygonBtn.addEventListener('click', () => {
        startDrawing('polygon');
        drawModal.style.display = 'none';
    });

    // Start drawing
    function startDrawing(mode) {
        if (isDrawing) stopDrawing(false); // Cancel any ongoing drawing without saving
        isDrawing = true;
        drawingMode = mode;
        drawingPoints = [];
        if (drawingLayer) {
            window.map.removeLayer(drawingLayer);
            drawingLayer = null;
        }

        // Lock map interactions to prevent movement
        window.map.dragging.disable();
        window.map.scrollWheelZoom.disable();
        window.map.doubleClickZoom.disable();
        window.map.boxZoom.disable();
        window.map.keyboard.disable();

        // Add event listeners for drawing
        window.map.on('click', onMapClick);

        // Add Cancel and Finish buttons to the map
        const controlContainer = L.control({ position: 'bottomright' });
        controlContainer.onAdd = function () {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom draw-controls');
            div.innerHTML = `
                <button class="draw-cancel-btn">Cancel</button>
                <button class="draw-finish-btn" style="display: ${mode === 'point' ? 'none' : 'inline-block'}">Finish</button>
            `;
            div.style.backgroundColor = 'white';
            div.style.padding = '5px';
            div.style.border = '2px solid rgba(0,0,0,0.2)';
            div.style.borderRadius = '4px';
            div.style.cursor = 'pointer';
            div.style.marginRight = '10px'; // Offset to avoid layer control overlap
            L.DomEvent.disableClickPropagation(div);
            return div;
        };
        controlContainer.addTo(window.map);
        window.currentControl = controlContainer; // Store reference to remove later

        // Event listeners for buttons
        const cancelBtn = controlContainer.getContainer().querySelector('.draw-cancel-btn');
        const finishBtn = controlContainer.getContainer().querySelector('.draw-finish-btn');
        cancelBtn.onclick = () => stopDrawing(false);
        finishBtn.onclick = () => {
            if (drawingPoints.length > 1) {
                stopDrawing(true); // Only finish if there are points to save
            }
        };
    }

    // Stop drawing
    function stopDrawing(save = true) {
        isDrawing = false;
        window.map.off('click', onMapClick);

        // Unlock map interactions
        window.map.dragging.enable();
        window.map.scrollWheelZoom.enable();
        window.map.doubleClickZoom.enable();
        window.map.boxZoom.enable();
        window.map.keyboard.enable();

        // Remove control buttons
        if (window.currentControl) {
            window.currentControl.remove();
            window.currentControl = null;
        }

        // Handle the drawn shape
        if (drawingLayer && save && drawingPoints.length > 0) {
            // Create popup with group layer selection and name input
            const centroid = drawingMode === 'point' ? drawingLayer.getLatLng() : drawingLayer.getBounds().getCenter();
            const layerOptions = Object.keys(window.Layers.getLayers()).map(name => `<option value="${name}">${name}</option>`).join('');
            const popupContent = `
                <div>
                    <label for="feature-name">Feature Name:</label>
                    <input type="text" id="feature-name" placeholder="Enter feature name" style="margin-top:5px; width:100%;">
                    <label for="group-layer-select" style="margin-top:10px; display:block;">Select Layer:</label>
                    <select id="group-layer-select">
                        <option value="new">New Layer...</option>
                        ${layerOptions}
                    </select>
                    <input type="text" id="new-layer-name" placeholder="Enter new layer name" style="display:block; margin-top:5px; width:100%;">
                    <button onclick="window.saveDrawnLayer()" style="margin-top:10px;">Save</button>
                    <button onclick="window.deleteDrawnLayer()" style="margin-top:10px;">Delete</button>
                </div>
            `;
            currentPopup = L.popup({
                autoPan: false,
                keepInView: false,
                closeButton: false
            }).setLatLng(centroid).setContent(popupContent).addTo(window.map);

            // Handle layer selection and new layer input
            const select = currentPopup.getElement().querySelector('#group-layer-select');
            const newLayerInput = currentPopup.getElement().querySelector('#new-layer-name');
            select.addEventListener('change', function () {
                if (this.value === 'new') {
                    newLayerInput.style.display = 'block';
                } else {
                    newLayerInput.style.display = 'none';
                }
            });
        } else if (drawingLayer) {
            window.map.removeLayer(drawingLayer);
            drawingLayer = null;
        }
    }

    // Handle map clicks for drawing
    function onMapClick(e) {
        if (!isDrawing) return;

        drawingPoints.push(e.latlng);

        if (drawingMode === 'point') {
            drawingLayer = L.marker(e.latlng, {
                icon: L.icon({
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                })
            }).addTo(window.map);
            stopDrawing(true);
        } else if (drawingMode === 'line' || drawingMode === 'polygon') {
            updateDrawing();
        }
    }

    // Update the drawing in progress (without mouse move)
    function updateDrawing() {
        if (drawingLayer) {
            window.map.removeLayer(drawingLayer);
        }

        if (drawingMode === 'line' && drawingPoints.length > 1) {
            drawingLayer = L.polyline(drawingPoints, {
                color: '#e74c3c', // Default color
                weight: 3,
                opacity: 1.0
            }).addTo(window.map);
        } else if (drawingMode === 'polygon' && drawingPoints.length > 2) {
            drawingLayer = L.polygon(drawingPoints, {
                color: '#e74c3c', // Default color
                weight: 3,
                fillOpacity: 0.5
            }).addTo(window.map);
        }
    }

    // Utility function to ensure GeoJSON is a FeatureCollection
    function ensureFeatureCollection(geojson) {
        if (geojson.type === 'FeatureCollection') {
            return geojson;
        }
        return {
            type: 'FeatureCollection',
            features: [geojson]
        };
    }

    // Expose functions to handle drawn layer
    window.saveDrawnLayer = function () {
        if (!currentPopup || !currentPopup.getElement()) {
            console.error('No valid popup available for saving.');
            return;
        }
        const select = currentPopup.getElement().querySelector('#group-layer-select');
        const newLayerInput = currentPopup.getElement().querySelector('#new-layer-name');
        const featureNameInput = currentPopup.getElement().querySelector('#feature-name');
        let layerName;

        if (select.value === 'new' && newLayerInput.value.trim()) {
            layerName = newLayerInput.value.trim();
        } else if (select.value !== 'new' && select.value) {
            layerName = select.value;
        } else {
            layerName = `Drawn ${drawingMode.charAt(0).toUpperCase() + drawingMode.slice(1)} ${++drawCount[drawingMode]}`;
        }

        // Get the feature name from the input
        const featureName = featureNameInput.value.trim() || `Unnamed ${drawingMode.charAt(0).toUpperCase() + drawingMode.slice(1)}`;

        // Convert drawn layer to GeoJSON and add the name property
        let geojson = ensureFeatureCollection(drawingLayer.toGeoJSON());
        geojson.features.forEach(feature => {
            feature.properties = feature.properties || {};
            feature.properties.name = featureName;
        });

        let existingLayer = window.Layers.getLayers()[layerName];
        if (existingLayer) {
            // Append to existing layer (combine GeoJSON features)
            let existingGeojson = ensureFeatureCollection(existingLayer.toGeoJSON());
            existingGeojson.features = [...existingGeojson.features, ...geojson.features];
            window.Layers.removeLayer(layerName); // Remove the old layer
            const updatedLayer = L.geoJSON(existingGeojson, {
                style: {
                    color: existingLayer.options.style?.color || '#e74c3c',
                    fillColor: existingLayer.options.style?.color || '#e74c3c',
                    fillOpacity: existingLayer.options.style?.fillOpacity || 0.5,
                    opacity: existingLayer.options.style?.opacity || 1.0,
                    weight: 3
                },
                onEachFeature: (feature, layer) => {
                    if (feature.properties && feature.properties.name) {
                        layer.bindTooltip(feature.properties.name, { permanent: false, direction: 'auto' });
                    }
                }
            });
            window.Layers.addLayer(layerName, updatedLayer); // Add updated layer
        } else {
            const newLayer = L.geoJSON(geojson, {
                style: {
                    color: '#e74c3c', // Default color
                    fillColor: '#e74c3c',
                    fillOpacity: 0.5,
                    opacity: 1.0,
                    weight: 3
                },
                onEachFeature: (feature, layer) => {
                    if (feature.properties && feature.properties.name) {
                        layer.bindTooltip(feature.properties.name, { permanent: false, direction: 'auto' });
                    }
                }
            });
            window.Layers.addLayer(layerName, newLayer);
        }
        window.map.removeLayer(drawingLayer);
        window.map.closePopup();
        drawingLayer = null;
        currentPopup = null;
    };

    window.deleteDrawnLayer = function () {
        if (!drawingLayer) return;
        window.map.removeLayer(drawingLayer);
        if (currentPopup) {
            window.map.closePopup();
            currentPopup = null;
        }
        drawingLayer = null;
    };

    // Expose basemaps for other scripts
    window.Basemaps = {
        getBasemap: (name) => basemaps[name]
    };
})();