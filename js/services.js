// Store the current mission path
let currentMissionPath = null;

// Listen for mission update events
document.addEventListener('missionUpdate', handleMissionUpdate);

// Handle mission updates
function handleMissionUpdate(event) {
    const { polygon, parameters } = event.detail;
    generateFlightPath(polygon, parameters);
}

// Generate the flight path based on polygon and parameters
function generateFlightPath(polygon, parameters) {
    const { drone, altitude, frontOverlap, sideOverlap, speed, gsd } = parameters;
    
    // Get polygon bounds
    const bounds = polygon.getBounds();
    const coordinates = polygon.getLatLngs()[0];
    
    // Calculate image footprint dimensions
    const footprintWidth = (drone.imageWidth * gsd) / 100; // meters
    const footprintHeight = (drone.imageHeight * gsd) / 100; // meters
    
    // Calculate line spacing based on side overlap
    const lineSpacing = footprintWidth * (1 - sideOverlap / 100);
    
    // Calculate photo spacing based on front overlap
    const photoSpacing = footprintHeight * (1 - frontOverlap / 100);
    
    // Generate grid lines
    const gridLines = generateGrid(coordinates, lineSpacing);
    
    // Generate waypoints along grid lines
    const waypoints = generateWaypoints(gridLines, photoSpacing);
    
    // Calculate mission statistics
    const missionStats = calculateMissionStats(waypoints, speed, photoSpacing);
    
    // Update the mission path on the map
    updateMissionPathOnMap(waypoints);
    
    // Update mission statistics display
    updateMissionStatsDisplay(missionStats);
}

// Generate parallel grid lines for the flight path
function generateGrid(coordinates, lineSpacing) {
    // Convert polygon to turf feature
    const poly = turf.polygon([[...coordinates.map(p => [p.lng, p.lat]), [coordinates[0].lng, coordinates[0].lat]]]);
    
    // Get the bearing for grid lines (using the longest axis)
    const bearing = calculateGridBearing(poly);
    
    // Get bounding box
    const bbox = turf.bbox(poly);
    const bboxPoly = turf.bboxPolygon(bbox);
    
    // Generate parallel lines
    const lines = [];
    let currentLine = turf.lineString([[bbox[0], bbox[1]], [bbox[0], bbox[3]]]);
    currentLine = turf.transformRotate(currentLine, bearing);
    
    while (true) {
        // Check if line intersects polygon
        const intersection = turf.lineIntersect(currentLine, poly);
        if (intersection.features.length > 0) {
            lines.push(currentLine);
        }
        
        // Move line by spacing
        currentLine = turf.transformTranslate(currentLine, lineSpacing, 90 + bearing);
        
        // Check if we're outside the bbox
        const lastPoint = currentLine.geometry.coordinates[0];
        if (!turf.booleanPointInPolygon(turf.point(lastPoint), bboxPoly)) {
            break;
        }
    }
    
    return lines;
}

// Generate waypoints along grid lines
function generateWaypoints(gridLines, photoSpacing) {
    const waypoints = [];
    let isReversed = false;
    
    gridLines.forEach(line => {
        // Get points along the line
        const length = turf.length(line) * 1000; // Convert to meters
        const numPoints = Math.ceil(length / photoSpacing);
        const points = [];
        
        for (let i = 0; i <= numPoints; i++) {
            const along = turf.along(line, (i * photoSpacing) / 1000);
            points.push(along.geometry.coordinates);
        }
        
        // Alternate direction for efficiency
        if (isReversed) {
            points.reverse();
        }
        isReversed = !isReversed;
        
        waypoints.push(...points);
    });
    
    return waypoints;
}

// Calculate mission statistics
function calculateMissionStats(waypoints, speed, photoSpacing) {
    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < waypoints.length; i++) {
        const line = turf.lineString([waypoints[i-1], waypoints[i]]);
        totalDistance += turf.length(line) * 1000; // Convert to meters
    }
    
    // Calculate number of photos
    const numPhotos = waypoints.length;
    
    // Calculate estimated flight time
    const flightTime = (totalDistance / speed) / 60; // Convert to minutes
    
    return {
        totalDistance,
        numPhotos,
        flightTime
    };
}

// Update mission path visualization on the map
function updateMissionPathOnMap(waypoints) {
    // Remove existing path and markers
    if (currentMissionPath) {
        map.removeLayer(currentMissionPath);
        // If we have a feature group, remove it too
        if (currentMissionPath.markerGroup) {
            map.removeLayer(currentMissionPath.markerGroup);
        }
    }
    
    // Create a feature group for markers
    const markerGroup = L.featureGroup();
    
    // Create path layer
    currentMissionPath = L.polyline(waypoints.map(w => [w[1], w[0]]), {
        color: '#e74c3c',
        weight: 2,
        opacity: 0.8
    });
    
    // Add waypoint markers to the marker group
    waypoints.forEach((waypoint, index) => {
        L.circleMarker([waypoint[1], waypoint[0]], {
            radius: 3,
            color: '#e74c3c',
            fillColor: '#e74c3c',
            fillOpacity: 1
        }).addTo(markerGroup);
    });
    
    // Store marker group reference
    currentMissionPath.markerGroup = markerGroup;
    
    // Add both layers to the map
    currentMissionPath.addTo(map);
    markerGroup.addTo(map);
}

// Update mission statistics display
function updateMissionStatsDisplay(stats) {
    const missionStats = document.getElementById('mission-stats');
    missionStats.innerHTML = `
        <h2>Estadísticas de Misión</h2>
        <p>Distancia Total: ${formatNumber(stats.totalDistance, 'm')}</p>
        <p>Número de Fotos: ${stats.numPhotos}</p>
        <p>Tiempo Estimado: ${formatNumber(stats.flightTime, 'min')}</p>
        <button id="export-btn" class="btn btn-primary">Exportar Misión</button>
    `;
    
    // Add export button listener
    document.getElementById('export-btn').addEventListener('click', () => exportMission());
}

// Calculate optimal grid bearing based on polygon shape
function calculateGridBearing(polygon) {
    const bbox = turf.bbox(polygon);
    const width = bbox[2] - bbox[0];
    const height = bbox[3] - bbox[1];
    
    // Use the longest axis for grid direction
    return width > height ? 0 : 90;
}

// Export mission in Litchi format
function exportMission(format = 'json') {
    if (!currentMissionPath) return;
    
    const waypoints = currentMissionPath.getLatLngs();
    
    if (format === 'csv') {
        // CSV format for Litchi
        const csvHeader = 'latitude,longitude,altitude(m),heading(deg),curvesize(m),rotationdir,gimbalmode,gimbalpitchangle,actiontype1,actionparam1,actiontype2,actionparam2,speed(m/s),poi_latitude,poi_longitude,poi_altitude(m),poi_altitudemode,photo_timeinterval,photo_distinterval\n';
        
        const csvRows = waypoints.map((wp, index) => {
            const heading = index > 0 ? calculateBearing(waypoints[index-1], wp) : 0;
            return [
                wp.lat,                    // latitude
                wp.lng,                    // longitude
                CONFIG.mission.altitude,   // altitude(m)
                heading,                   // heading(deg)
                0,                         // curvesize(m)
                0,                         // rotationdir
                1,                         // gimbalmode
                -90,                       // gimbalpitchangle
                0,                         // actiontype1
                0,                         // actionparam1
                0,                         // actiontype2
                0,                         // actionparam2
                CONFIG.mission.speed,      // speed(m/s)
                0,                         // poi_latitude
                0,                         // poi_longitude
                0,                         // poi_altitude(m)
                0,                         // poi_altitudemode
                0,                         // photo_timeinterval
                0                          // photo_distinterval
            ].join(',');
        }).join('\n');
        
        const csvContent = csvHeader + csvRows;
        const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        const exportName = 'mission_' + new Date().toISOString().slice(0,10) + '.csv';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportName);
        linkElement.click();
    } else {
        // Original JSON format
        const missionData = {
            mission: waypoints.map((wp, index) => ({
                latitude: wp.lat,
                longitude: wp.lng,
                altitude: CONFIG.mission.altitude,
                heading: index > 0 ? calculateBearing(waypoints[index-1], wp) : 0,
                curvesize: 0,
                gimbalmode: 1,
                gimbalpitchangle: -90,
                actiontype1: 0,
                actionparam1: 0,
                actiontype2: 0,
                actionparam2: 0,
                speed: CONFIG.mission.speed
            }))
        };
        
        const dataStr = JSON.stringify(missionData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportName = 'mission_' + new Date().toISOString().slice(0,10) + '.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportName);
        linkElement.click();
    }
} 