// layers.js
(function () {
    // Initialize layers object to store all layers with visibility state, order, and style
    const layers = {};
    let layerOrder = []; // Array to track the order of layer names
    let layerControl; // Global reference to the layer control element
    const categoryStyles = {}; // Store category styles dynamically: { columnName: { categoryValue: { style } } }

    // Function to add a layer
    function addLayer(name, layer) {
        // Convert point features to CircleMarkers upfront
        const convertedLayer = L.geoJSON(null, {
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 5,
                    color: '#e74c3c',
                    weight: 3,
                    fillColor: '#e74c3c',
                    fillOpacity: 0.5
                });
            },
            onEachFeature: function (feature, leafletLayer) {
                // Preserve the original feature's properties and bindings (e.g., popups)
                if (feature.properties) {
                    leafletLayer.feature = feature; // Ensure the feature properties are attached
                }
            }
        });

        // Add all features from the input layer to the converted layer
        layer.eachLayer(feature => {
            const geojson = feature.toGeoJSON();
            convertedLayer.addData(geojson);
        });

        layers[name] = {
            layer: convertedLayer,
            visible: true,
            style: {
                color: '#e74c3c',
                weight: 3,
                fillColor: '#e74c3c',
                fillOpacity: 0.5
            }
        };
        layerOrder.push(name);
        if (layers[name].visible) {
            applyLayerStyle(name);
            convertedLayer.addTo(window.map);
        }
        updateLayerControl();
    }

    // Function to remove a layer
    function removeLayer(name) {
        if (layers[name]) {
            window.map.removeLayer(layers[name].layer);
            delete layers[name];
            layerOrder = layerOrder.filter(n => n !== name);
            updateLayerOrderOnMap();
            updateLayerControl();
        }
    }

    // Function to toggle layer visibility
    function toggleLayer(name, state) {
        if (layers[name]) {
            const layerEntry = layers[name];
            if (state === 'on' && !layerEntry.visible) {
                layerEntry.layer.addTo(window.map);
                layerEntry.visible = true;
                applyLayerStyle(name);
                updateLayerOrderOnMap();
            } else if (state === 'off' && layerEntry.visible) {
                window.map.removeLayer(layerEntry.layer);
                layerEntry.visible = false;
            }
            updateLayerControl();
        }
    }

    // Function to get the geometry type of a layer
    function getLayerGeometryType(layer) {
        let geometryType = null;
        layer.eachLayer(feature => {
            const geojson = feature.toGeoJSON();
            if (geojson.geometry) {
                geometryType = geojson.geometry.type;
                return false; // Break after first feature
            }
        });
        return geometryType; // e.g., "Point", "LineString", "Polygon"
    }

    // Function to apply a layer's style, considering category styles and geometry type
    function applyLayerStyle(name) {
        if (layers[name] && layers[name].visible) {
            const layerEntry = layers[name];
            layerEntry.layer.eachLayer(feature => {
                const geojson = feature.toGeoJSON();
                const geometryType = geojson.geometry.type;
                let style = { ...layerEntry.style };

                // Apply category style if applicable
                for (const columnName in categoryStyles) {
                    const categoryMap = categoryStyles[columnName];
                    const categoryValue = geojson.properties?.[columnName];
                    if (categoryValue && categoryMap[categoryValue]) {
                        style = { ...style, ...categoryMap[categoryValue] };
                    }
                }

                // Apply style based on geometry type
                if (geometryType === 'Point' || geometryType === 'MultiPoint') {
                    feature.setStyle({
                        color: style.color,
                        weight: style.weight,
                        fillColor: style.fillColor,
                        fillOpacity: style.fillOpacity
                    });
                } else {
                    feature.setStyle({
                        color: style.color,
                        weight: style.weight,
                        fillColor: geometryType.includes('LineString') ? undefined : style.fillColor,
                        fillOpacity: geometryType.includes('LineString') ? 0 : style.fillOpacity
                    });
                }
            });
        }
    }

    // Function to update the order of layers on the map based on layerOrder
    function updateLayerOrderOnMap() {
        window.map.eachLayer(layer => {
            if (layer instanceof L.GeoJSON) {
                window.map.removeLayer(layer);
            }
        });
        layerOrder.forEach((name, index) => {
            const layerEntry = layers[name];
            if (layerEntry && layerEntry.visible) {
                layerEntry.layer.addTo(window.map);
                applyLayerStyle(name);
                layerEntry.layer.setZIndex(layerOrder.length - index);
                console.log(`Re-added layer: ${name} at position ${index} with zIndex ${layerOrder.length - index}`);
            }
        });
    }

    // Function to update a layer's style
    function updateLayerStyle(name, newStyle) {
        if (layers[name]) {
            const layerEntry = layers[name];
            Object.assign(layerEntry.style, newStyle);
            applyLayerStyle(name);
            updateLayerOrderOnMap();
        }
    }

    // Function to update category styles
    function updateCategoryStyle(columnName, categoryValue, newStyle) {
        if (!categoryStyles[columnName]) {
            categoryStyles[columnName] = {};
        }
        categoryStyles[columnName][categoryValue] = newStyle;
        // Apply to all layers
        Object.keys(layers).forEach(name => {
            applyLayerStyle(name);
            updateLayerOrderOnMap();
        });
    }

    // Function to move a layer up in the order
    function moveLayerUp(name) {
        const index = layerOrder.indexOf(name);
        if (index > 0) {
            [layerOrder[index], layerOrder[index - 1]] = [layerOrder[index - 1], layerOrder[index]];
            updateLayerOrderOnMap();
            updateLayerControl();
        }
    }

    // Function to move a layer down in the order
    function moveLayerDown(name) {
        const index = layerOrder.indexOf(name);
        if (index < layerOrder.length - 1) {
            [layerOrder[index], layerOrder[index + 1]] = [layerOrder[index + 1], layerOrder[index]];
            updateLayerOrderOnMap();
            updateLayerControl();
        }
    }

    // Function to get visible layers as GeoJSON
    function getVisibleLayersGeoJSON() {
        const geojson = {
            type: 'FeatureCollection',
            features: []
        };
        layerOrder.forEach(name => {
            const layerEntry = layers[name];
            if (layerEntry && layerEntry.visible) {
                layerEntry.layer.eachLayer(feature => {
                    const featureGeoJSON = feature.toGeoJSON();
                    featureGeoJSON.properties.layerName = name;
                    geojson.features.push(featureGeoJSON);
                });
            }
        });
        return geojson;
    }

    // Function to get all layers (for export selection)
    function getLayers() {
        const layerMap = {};
        layerOrder.forEach(name => {
            if (layers[name]) {
                layerMap[name] = layers[name].layer;
            }
        });
        return layerMap;
    }

    // Function to update the layer control panel
    function updateLayerControl() {
        if (!layerControl) {
            layerControl = document.createElement('div');
            layerControl.id = 'layer-control';
            layerControl.style.position = 'absolute';
            layerControl.style.top = '70px';
            layerControl.style.right = '10px';
            document.body.appendChild(layerControl);

            layerControl.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;

                const layerDiv = target.closest('.layer-item');
                const name = layerDiv?.dataset.layerName;

                if (target.classList.contains('up-btn') && !target.disabled) {
                    moveLayerUp(name);
                } else if (target.classList.contains('down-btn') && !target.disabled) {
                    moveLayerDown(name);
                } else if (target.classList.contains('on-btn')) {
                    toggleLayer(name, 'on');
                } else if (target.classList.contains('off-btn')) {
                    toggleLayer(name, 'off');
                } else if (target.classList.contains('delete-btn')) {
                    removeLayer(name);
                } else if (target.classList.contains('style-btn')) {
                    openStyleModal(name, layerDiv);
                }
            });
        }

        const currentState = Array.from(layerControl.querySelectorAll('.layer-item')).map(item => ({
            name: item.dataset.layerName,
            visible: item.querySelector('.on-btn')?.textContent === 'On'
        }));

        const newState = layerOrder.map((name, index) => ({
            name,
            visible: layers[name] ? layers[name].visible : false
        }));

        if (JSON.stringify(currentState) === JSON.stringify(newState)) {
            return;
        }

        layerControl.innerHTML = '<h4>Layers</h4>';

        layerOrder.forEach((name, index) => {
            const layerEntry = layers[name];
            if (!layerEntry) return;

            const layerDiv = document.createElement('div');
            layerDiv.className = 'layer-item';
            layerDiv.dataset.layerName = name;

            const label = document.createElement('span');
            label.textContent = name;

            const upBtn = document.createElement('button');
            upBtn.className = 'up-btn';
            upBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
            upBtn.disabled = index === 0;

            const downBtn = document.createElement('button');
            downBtn.className = 'down-btn';
            downBtn.innerHTML = '<i class="fas fa-arrow-down"></i>';
            downBtn.disabled = index === layerOrder.length - 1;

            const onBtn = document.createElement('button');
            onBtn.className = 'on-btn';
            onBtn.textContent = layerEntry.visible ? 'On' : 'Off';
            onBtn.style.backgroundColor = layerEntry.visible ? '#2ecc71' : '#95a5a6';

            const offBtn = document.createElement('button');
            offBtn.className = 'off-btn';
            offBtn.textContent = layerEntry.visible ? 'Off' : 'On';
            offBtn.style.backgroundColor = layerEntry.visible ? '#e74c3c' : '#95a5a6';

            const styleBtn = document.createElement('button');
            styleBtn.className = 'style-btn';
            styleBtn.textContent = 'Style';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';

            layerDiv.appendChild(label);
            layerDiv.appendChild(upBtn);
            layerDiv.appendChild(downBtn);
            layerDiv.appendChild(onBtn);
            layerDiv.appendChild(offBtn);
            layerDiv.appendChild(styleBtn);
            layerDiv.appendChild(deleteBtn);
            layerControl.appendChild(layerDiv);
        });
    }

    // Function to get unique properties from a layer's features
    function getLayerProperties(layer) {
        const properties = new Set();
        layer.eachLayer(feature => {
            const geojson = feature.toGeoJSON();
            if (geojson.properties) {
                Object.keys(geojson.properties).forEach(prop => properties.add(prop));
            }
        });
        return Array.from(properties);
    }

    // Function to get unique values for a property across all layers
    function getUniqueValuesForProperty(columnName) {
        const values = new Set();
        Object.keys(layers).forEach(name => {
            const layer = layers[name].layer;
            layer.eachLayer(feature => {
                const geojson = feature.toGeoJSON();
                const value = geojson.properties?.[columnName];
                if (value !== undefined && value !== null) {
                    values.add(value);
                }
            });
        });
        return Array.from(values);
    }

    // Function to open the style modal for a layer
    function openStyleModal(name, layerDiv) {
        if (!layerDiv) {
            console.error(`Layer div for ${name} not found`);
            return;
        }

        const existingModal = document.querySelector('#style-modal');
        if (existingModal) {
            existingModal.remove();
        }

        layerDiv.classList.add('styling-active');

        const layerEntry = layers[name];
        if (!layerEntry) {
            console.error(`Layer ${name} not found`);
            layerDiv.classList.remove('styling-active');
            return;
        }

        const geometryType = getLayerGeometryType(layerEntry.layer);
        const properties = getLayerProperties(layerEntry.layer);

        const modal = document.createElement('div');
        modal.id = 'style-modal';
        modal.className = 'modal';

        // Styling type selector
        const stylingTypeOptions = `
            <label>Styling Type:
                <select class="styling-type">
                    <option value="single">Single Styling</option>
                    <option value="category">Category Styling</option>
                </select>
            </label>
        `;

        // Single styling options
        let singleStylingOptions = '';
        if (geometryType === 'Point' || geometryType === 'MultiPoint') {
            singleStylingOptions = `
                <label>Color: <input type="color" class="style-color" value="${layerEntry.style.color}"></label>
                <label>Opacity: <input type="range" class="style-opacity" min="0" max="1" step="0.1" value="${layerEntry.style.fillOpacity}"></label>
                <label>Border Width: <input type="number" class="style-weight" min="1" max="10" step="1" value="${layerEntry.style.weight}"></label>
            `;
        } else if (geometryType.includes('LineString')) {
            singleStylingOptions = `
                <label>Border Color: <input type="color" class="style-color" value="${layerEntry.style.color}"></label>
                <label>Border Width: <input type="number" class="style-weight" min="1" max="10" step="1" value="${layerEntry.style.weight}"></label>
            `;
        } else {
            singleStylingOptions = `
                <label>Border Color: <input type="color" class="style-color" value="${layerEntry.style.color}"></label>
                <label>Border Width: <input type="number" class="style-weight" min="1" max="10" step="1" value="${layerEntry.style.weight}"></label>
                <label>Fill Color: <input type="color" class="style-fill-color" value="${layerEntry.style.fillColor}"></label>
                <label>Fill Opacity: <input type="range" class="style-fill-opacity" min="0" max="1" step="0.1" value="${layerEntry.style.fillOpacity}"></label>
            `;
        }

        // Category styling options (initially hidden)
        const columnOptions = properties.length > 0
            ? properties.map(prop => `<option value="${prop}">${prop}</option>`).join('')
            : '<option value="">No properties available</option>';

        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">×</span>
                <h2>Style Layer: ${name}</h2>
                <div class="style-options">
                    ${stylingTypeOptions}
                    <div class="single-styling-options">
                        ${singleStylingOptions}
                    </div>
                    <div class="category-styling-options" style="display: none;">
                        <label>Column Name:
                            <select class="category-column">
                                ${columnOptions}
                            </select>
                        </label>
                        <div class="category-values"></div>
                    </div>
                </div>
                <button class="apply-style-btn">Apply</button>
                <button class="cancel-style-btn">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);

        modal.style.display = 'flex';

        const closeBtn = modal.querySelector('.close');
        const applyBtn = modal.querySelector('.apply-style-btn');
        const cancelBtn = modal.querySelector('.cancel-style-btn');
        const stylingTypeSelect = modal.querySelector('.styling-type');
        const singleStylingDiv = modal.querySelector('.single-styling-options');
        const categoryStylingDiv = modal.querySelector('.category-styling-options');
        const categoryColumnSelect = modal.querySelector('.category-column');
        const categoryValuesDiv = modal.querySelector('.category-values');

        // Toggle between single and category styling
        const toggleStylingType = () => {
            const type = stylingTypeSelect.value;
            singleStylingDiv.style.display = type === 'single' ? 'block' : 'none';
            categoryStylingDiv.style.display = type === 'category' ? 'block' : 'none';
            if (type === 'category' && categoryColumnSelect.value) {
                updateCategoryValues();
            }
        };

        // Update category values when column is selected
        const updateCategoryValues = () => {
            const columnName = categoryColumnSelect.value;
            if (!columnName) {
                categoryValuesDiv.innerHTML = '<p>No column selected.</p>';
                return;
            }

            const uniqueValues = getUniqueValuesForProperty(columnName);
            if (uniqueValues.length === 0) {
                categoryValuesDiv.innerHTML = '<p>No values found for this column.</p>';
                return;
            }

            let categoryInputs = '';
            uniqueValues.forEach(value => {
                const existingStyle = categoryStyles[columnName]?.[value] || {
                    color: '#e74c3c',
                    weight: 3,
                    fillColor: '#e74c3c',
                    fillOpacity: 0.5
                };
                let styleInputs = '';
                if (geometryType === 'Point' || geometryType === 'MultiPoint') {
                    styleInputs = `
                        <label>Color: <input type="color" class="category-color" data-value="${value}" value="${existingStyle.color}"></label>
                        <label>Opacity: <input type="range" class="category-opacity" data-value="${value}" min="0" max="1" step="0.1" value="${existingStyle.fillOpacity}"></label>
                        <label>Border Width: <input type="number" class="category-weight" data-value="${value}" min="1" max="10" step="1" value="${existingStyle.weight}"></label>
                    `;
                } else if (geometryType.includes('LineString')) {
                    styleInputs = `
                        <label>Border Color: <input type="color" class="category-color" data-value="${value}" value="${existingStyle.color}"></label>
                        <label>Border Width: <input type="number" class="category-weight" data-value="${value}" min="1" max="10" step="1" value="${existingStyle.weight}"></label>
                    `;
                } else {
                    styleInputs = `
                        <label>Border Color: <input type="color" class="category-color" data-value="${value}" value="${existingStyle.color}"></label>
                        <label>Border Width: <input type="number" class="category-weight" data-value="${value}" min="1" max="10" step="1" value="${existingStyle.weight}"></label>
                        <label>Fill Color: <input type="color" class="category-fill-color" data-value="${value}" value="${existingStyle.fillColor}"></label>
                        <label>Fill Opacity: <input type="range" class="category-fill-opacity" data-value="${value}" min="0" max="1" step="0.1" value="${existingStyle.fillOpacity}"></label>
                    `;
                }
                categoryInputs += `
                    <div class="category-style-item">
                        <h3>${value}</h3>
                        ${styleInputs}
                    </div>
                `;
            });
            categoryValuesDiv.innerHTML = categoryInputs;
        };

        stylingTypeSelect.addEventListener('change', toggleStylingType);
        categoryColumnSelect.addEventListener('change', updateCategoryValues);

        const removeHighlight = () => {
            if (layerDiv) {
                layerDiv.classList.remove('styling-active');
            }
            modal.remove();
        };

        if (closeBtn) closeBtn.addEventListener('click', removeHighlight);
        if (cancelBtn) cancelBtn.addEventListener('click', removeHighlight);
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const type = stylingTypeSelect.value;
                if (type === 'single') {
                    const newStyle = {};
                    const colorInput = singleStylingDiv.querySelector('.style-color');
                    const weightInput = singleStylingDiv.querySelector('.style-weight');
                    const fillColorInput = singleStylingDiv.querySelector('.style-fill-color');
                    const fillOpacityInput = singleStylingDiv.querySelector('.style-fill-opacity') || singleStylingDiv.querySelector('.style-opacity');

                    if (colorInput) newStyle.color = colorInput.value;
                    if (weightInput) newStyle.weight = parseInt(weightInput.value);
                    if (fillColorInput) newStyle.fillColor = fillColorInput.value;
                    if (fillOpacityInput) newStyle.fillOpacity = parseFloat(fillOpacityInput.value);

                    updateLayerStyle(name, newStyle);
                } else {
                    const columnName = categoryColumnSelect.value;
                    if (columnName) {
                        const categoryItems = categoryValuesDiv.querySelectorAll('.category-style-item');
                        categoryItems.forEach(item => {
                            const value = item.querySelector('.category-color').dataset.value;
                            const newStyle = {};
                            const colorInput = item.querySelector('.category-color');
                            const weightInput = item.querySelector('.category-weight');
                            const fillColorInput = item.querySelector('.category-fill-color');
                            const fillOpacityInput = item.querySelector('.category-fill-opacity') || item.querySelector('.category-opacity');

                            if (colorInput) newStyle.color = colorInput.value;
                            if (weightInput) newStyle.weight = parseInt(weightInput.value);
                            if (fillColorInput) newStyle.fillColor = fillColorInput.value;
                            if (fillOpacityInput) newStyle.fillOpacity = parseFloat(fillOpacityInput.value);

                            updateCategoryStyle(columnName, value, newStyle);
                        });
                    }
                }
                removeHighlight();
            });
        }

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                removeHighlight();
            }
        });
    }

    // Expose functions for other scripts
    window.Layers = {
        addLayer,
        removeLayer,
        toggleLayer,
        updateLayerControl,
        getVisibleLayersGeoJSON,
        getLayers
    };
})();