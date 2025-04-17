// Create a FeatureGroup to store editable layers
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Initialize draw control
const drawControl = new L.Control.Draw({
    draw: {
        // Only allow polygon drawing
        polygon: {
            allowIntersection: false,
            drawError: {
                color: '#e1e100',
                message: '<strong>Error:</strong> ¡Los polígonos no pueden intersectarse!'
            },
            shapeOptions: {
                color: '#2c3e50'
            }
        },
        // Disable all other drawing tools
        polyline: false,
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false
    },
    edit: {
        featureGroup: drawnItems,
        remove: true
    }
});
map.addControl(drawControl);

// Store the current polygon
let currentPolygon = null;

// Event handler for when a polygon is created
map.on(L.Draw.Event.CREATED, function (event) {
    const layer = event.layer;
    
    // Remove previous polygon if it exists
    if (currentPolygon) {
        drawnItems.removeLayer(currentPolygon);
    }
    
    // Store the new polygon
    currentPolygon = layer;
    drawnItems.addLayer(layer);
    
    // Calculate area and perimeter using Turf.js
    const coordinates = layer.getLatLngs()[0].map(latLng => [latLng.lng, latLng.lat]);
    coordinates.push(coordinates[0]); // Close the polygon
    
    const polygon = turf.polygon([coordinates]);
    const area = turf.area(polygon);
    const perimeter = turf.length(turf.lineString(coordinates)) * 1000; // Convert to meters
    
    // Update only the mission stats section
    const missionStats = document.getElementById('mission-stats');
    missionStats.innerHTML = `
        <h2>Estadísticas de Misión</h2>
        <p>Área: ${(area / 10000).toFixed(2)} hectáreas</p>
        <p>Perímetro: ${perimeter.toFixed(2)} metros</p>
    `;
    
    // Trigger a custom event that services.js will listen to
    const drawCompleteEvent = new CustomEvent('drawComplete', {
        detail: { polygon: layer }
    });
    document.dispatchEvent(drawCompleteEvent);
});

// Event handler for when a polygon is edited
map.on(L.Draw.Event.EDITED, function (event) {
    const layers = event.layers;
    layers.eachLayer(function (layer) {
        if (layer === currentPolygon) {
            // Recalculate area and perimeter
            const coordinates = layer.getLatLngs()[0].map(latLng => [latLng.lng, latLng.lat]);
            coordinates.push(coordinates[0]); // Close the polygon
            
            const polygon = turf.polygon([coordinates]);
            const area = turf.area(polygon);
            const perimeter = turf.length(turf.lineString(coordinates)) * 1000;
            
            // Update only the mission stats section
            const missionStats = document.getElementById('mission-stats');
            missionStats.innerHTML = `
                <h2>Estadísticas de Misión</h2>
                <p>Área: ${(area / 10000).toFixed(2)} hectáreas</p>
                <p>Perímetro: ${perimeter.toFixed(2)} metros</p>
            `;
            
            // Trigger update event
            const drawCompleteEvent = new CustomEvent('drawComplete', {
                detail: { polygon: layer }
            });
            document.dispatchEvent(drawCompleteEvent);
        }
    });
});

// Event handler for when a polygon is deleted
map.on(L.Draw.Event.DELETED, function (event) {
    currentPolygon = null;
    const missionStats = document.getElementById('mission-stats');
    missionStats.innerHTML = `
        <h2>Estadísticas de Misión</h2>
        <p>Dibuja un polígono en el mapa para comenzar</p>
    `;
    
    // Trigger delete event
    document.dispatchEvent(new Event('drawDeleted'));
}); 