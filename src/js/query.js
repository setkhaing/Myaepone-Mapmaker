// query.js
(function() {
    // Query state
    let currentLayer = null;
    let queryConditions = [];
    let queryResults = [];
    
    // DOM elements
    const queryModal = document.getElementById('query-modal');
    const queryLayerSelect = document.getElementById('query-layer-select');
    const queryConditionsContainer = document.getElementById('query-conditions');
    const addConditionBtn = document.getElementById('add-condition-btn');
    const runQueryBtn = document.getElementById('run-query-btn');
    const clearQueryBtn = document.getElementById('clear-query-btn');
    const resultCount = document.getElementById('result-count');
    const resultList = document.getElementById('result-list');
    
    // Operators for different data types
    const operators = {
        string: ['equals', 'contains', 'starts with', 'ends with', 'not equals'],
        number: ['equals', 'greater than', 'less than', 'greater than or equal', 'less than or equal', 'not equals'],
        boolean: ['is true', 'is false'],
        default: ['equals', 'not equals']
    };
    
    // Initialize query functionality
    function init() {
        // Set up event listeners
        document.getElementById('query-btn').addEventListener('click', openQueryModal);
        queryModal.querySelector('.close').addEventListener('click', closeQueryModal);
        addConditionBtn.addEventListener('click', addCondition);
        runQueryBtn.addEventListener('click', runQuery);
        clearQueryBtn.addEventListener('click', clearQuery);
        queryLayerSelect.addEventListener('change', onLayerChange);
        
        // Close modal when clicking outside
        queryModal.addEventListener('click', (e) => {
            if (e.target === queryModal) {
                closeQueryModal();
            }
        });
    }
    
    // Open query modal
    function openQueryModal() {
        // Populate layer select
        populateLayerSelect();
        
        // Show modal
        queryModal.style.display = 'flex';
        
        // Initialize with first layer if available
        if (queryLayerSelect.options.length > 0) {
            queryLayerSelect.selectedIndex = 0;
            onLayerChange();
        }
    }
    
    // Close query modal
    function closeQueryModal() {
        queryModal.style.display = 'none';
        clearHighlights();
    }
    
    // Populate layer select dropdown
    function populateLayerSelect() {
        queryLayerSelect.innerHTML = '';
        const layers = window.Layers.getLayers();
        
        if (Object.keys(layers).length === 0) {
            queryLayerSelect.innerHTML = '<option value="">No layers available</option>';
            return;
        }
        
        Object.keys(layers).forEach(layerName => {
            const option = document.createElement('option');
            option.value = layerName;
            option.textContent = layerName;
            queryLayerSelect.appendChild(option);
        });
    }
    
    // Handle layer change
    function onLayerChange() {
        const layerName = queryLayerSelect.value;
        if (!layerName) return;
        
        const layers = window.Layers.getLayers();
        currentLayer = layers[layerName];
        
        // Reset conditions when layer changes
        queryConditions = [];
        queryConditionsContainer.innerHTML = '';
        
        // Add initial condition
        addCondition();
    }
    
    // Add a new condition
    function addCondition() {
        if (!currentLayer) return;
        
        // Get properties from the current layer
        const properties = getLayerProperties(currentLayer);
        if (properties.length === 0) {
            console.error('No properties found in the selected layer');
            return;
        }
        
        const conditionId = Date.now(); // Unique ID for this condition
        const conditionDiv = document.createElement('div');
        conditionDiv.className = 'query-condition';
        conditionDiv.dataset.id = conditionId;
        
        // Create property select
        const propertySelect = document.createElement('select');
        propertySelect.className = 'property-select';
        properties.forEach(prop => {
            const option = document.createElement('option');
            option.value = prop;
            option.textContent = prop;
            propertySelect.appendChild(option);
        });
        
        // Initial operator select based on first property
        const operatorSelect = document.createElement('select');
        operatorSelect.className = 'operator-select';
        
        // Value input
        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.className = 'value-input';
        valueInput.placeholder = 'Value';
        
        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-condition-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => removeCondition(conditionId));
        
        // Add elements to condition div
        conditionDiv.appendChild(propertySelect);
        conditionDiv.appendChild(operatorSelect);
        conditionDiv.appendChild(valueInput);
        conditionDiv.appendChild(removeBtn);
        
        // Add condition div to container
        queryConditionsContainer.appendChild(conditionDiv);
        
        // Update operators based on selected property
        updateOperators(propertySelect, operatorSelect, valueInput);
        
        // Add event listener for property change
        propertySelect.addEventListener('change', () => {
            updateOperators(propertySelect, operatorSelect, valueInput);
        });
        
        // Add new condition to state
        queryConditions.push({
            id: conditionId,
            property: propertySelect.value,
            operator: operatorSelect.value,
            value: valueInput.value
        });
        
        // Update event listeners for inputs to keep state in sync
        propertySelect.addEventListener('change', () => updateConditionState(conditionId));
        operatorSelect.addEventListener('change', () => updateConditionState(conditionId));
        valueInput.addEventListener('input', () => updateConditionState(conditionId));
    }
    
    // Remove a condition
    function removeCondition(conditionId) {
        const conditionDiv = queryConditionsContainer.querySelector(`.query-condition[data-id="${conditionId}"]`);
        if (conditionDiv) {
            conditionDiv.remove();
            queryConditions = queryConditions.filter(c => c.id !== conditionId);
        }
    }
    
    // Update operators based on property type
    function updateOperators(propertySelect, operatorSelect, valueInput) {
        const property = propertySelect.value;
        const dataType = getPropertyDataType(currentLayer, property);
        
        // Clear existing operators
        operatorSelect.innerHTML = '';
        
        // Get appropriate operators for data type
        const availableOperators = operators[dataType] || operators.default;
        
        // Add operators to select
        availableOperators.forEach(op => {
            const option = document.createElement('option');
            option.value = op;
            option.textContent = op;
            operatorSelect.appendChild(option);
        });
        
        // Update input type for boolean
        if (dataType === 'boolean') {
            valueInput.style.display = 'none';
        } else {
            valueInput.style.display = 'inline-block';
            valueInput.type = dataType === 'number' ? 'number' : 'text';
        }
    }
    
    // Update condition state when inputs change
    function updateConditionState(conditionId) {
        const conditionDiv = queryConditionsContainer.querySelector(`.query-condition[data-id="${conditionId}"]`);
        if (!conditionDiv) return;
        
        const propertySelect = conditionDiv.querySelector('.property-select');
        const operatorSelect = conditionDiv.querySelector('.operator-select');
        const valueInput = conditionDiv.querySelector('.value-input');
        
        const conditionIndex = queryConditions.findIndex(c => c.id === conditionId);
        if (conditionIndex !== -1) {
            queryConditions[conditionIndex] = {
                id: conditionId,
                property: propertySelect.value,
                operator: operatorSelect.value,
                value: valueInput.value
            };
        }
    }
    
    // Run the query with current conditions
    function runQuery() {
        if (!currentLayer || queryConditions.length === 0) return;
        
        // Clear previous results
        queryResults = [];
        resultList.innerHTML = '';
        clearHighlights();
        
        // Process each feature in the layer
        let matchCount = 0;
        const matchedFeatures = [];
        
        currentLayer.eachLayer(feature => {
            const geojson = feature.toGeoJSON();
            const properties = geojson.properties || {};
            
            // Check if feature matches all conditions
            const matches = queryConditions.every(condition => {
                return evaluateCondition(properties, condition);
            });
            
            if (matches) {
                matchCount++;
                queryResults.push(geojson);
                matchedFeatures.push(geojson);
                
                // Add to result list
                addResultItem(geojson, properties);
            }
        });
        
        // Update result count
        resultCount.textContent = matchCount;
        
        // Create a new layer with the query results
        if (matchedFeatures.length > 0) {
            const layerName = `Query Results (${new Date().toLocaleTimeString()})`;
            const resultsLayer = L.geoJSON(matchedFeatures, {
                style: {
                    color: '#ffff00',
                    weight: 3,
                    fillColor: '#ffff00',
                    fillOpacity: 0.5
                },
                pointToLayer: function(feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 8,
                        color: '#ffff00',
                        weight: 3,
                        fillColor: '#ffff00',
                        fillOpacity: 0.5
                    });
                }
            });
            
            // Add the results layer to the map using the Layers module
            window.Layers.addLayer(layerName, resultsLayer);
            
            // Fit map to the results layer bounds
            window.map.fitBounds(resultsLayer.getBounds(), { padding: [50, 50] });
        }
    }
    
    // Evaluate a single condition against feature properties
    function evaluateCondition(properties, condition) {
        const { property, operator, value } = condition;
        const propValue = properties[property];
        
        // Handle undefined property
        if (propValue === undefined) return false;
        
        // Get data type
        const dataType = typeof propValue;
        
        // Evaluate based on operator and data type
        switch (operator) {
            case 'equals':
                return dataType === 'number' ? Number(propValue) === Number(value) : String(propValue) === value;
            case 'not equals':
                return dataType === 'number' ? Number(propValue) !== Number(value) : String(propValue) !== value;
            case 'contains':
                return String(propValue).includes(value);
            case 'starts with':
                return String(propValue).startsWith(value);
            case 'ends with':
                return String(propValue).endsWith(value);
            case 'greater than':
                return Number(propValue) > Number(value);
            case 'less than':
                return Number(propValue) < Number(value);
            case 'greater than or equal':
                return Number(propValue) >= Number(value);
            case 'less than or equal':
                return Number(propValue) <= Number(value);
            case 'is true':
                return Boolean(propValue) === true;
            case 'is false':
                return Boolean(propValue) === false;
            default:
                return false;
        }
    }
    
    // Add a result item to the result list
    function addResultItem(geojson, properties) {
        const item = document.createElement('div');
        item.className = 'result-item';
        
        // Try to find a name property
        let name = properties.name || properties.NAME || properties.title || properties.id || 'Unnamed feature';
        
        item.textContent = name;
        item.addEventListener('click', () => {
            // Zoom to feature
            const layer = L.geoJSON(geojson);
            window.map.fitBounds(layer.getBounds(), { padding: [50, 50] });
        });
        
        resultList.appendChild(item);
    }
    
    // Clear the query form
    function clearQuery() {
        queryConditions = [];
        queryConditionsContainer.innerHTML = '';
        queryResults = [];
        resultList.innerHTML = '';
        resultCount.textContent = '0';
        
        // Add initial condition
        addCondition();
    }
    
    // Remove the clearHighlights function since we're now using layers
    function clearHighlights() {
        // This function is now empty as we're using the layer system
        // to manage the query results instead of temporary highlights
    }
    
    // Helper function to get properties from a layer
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
    
    // Helper function to determine property data type
    function getPropertyDataType(layer, property) {
        let dataType = 'string'; // Default type
        
        // Check first feature with this property
        layer.eachLayer(feature => {
            const geojson = feature.toGeoJSON();
            if (geojson.properties && geojson.properties[property] !== undefined) {
                const value = geojson.properties[property];
                dataType = typeof value;
                return false; // Break after first match
            }
        });
        
        return dataType;
    }
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', init);
    
    // Expose functions for other modules
    window.Query = {
        open: openQueryModal,
        close: closeQueryModal
    };
})();