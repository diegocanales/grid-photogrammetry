// Calculate Ground Sample Distance (GSD) in cm/pixel
function calculateGSD(altitude, sensorWidth, focalLength, imageWidth) {
    return (altitude * 100 * sensorWidth) / (focalLength * imageWidth);
}

// Calculate the distance between two points in meters
function calculateDistance(point1, point2) {
    const line = turf.lineString([
        [point1.lng, point1.lat],
        [point2.lng, point2.lat]
    ]);
    return turf.length(line) * 1000; // Convert km to meters
}

// Calculate the area of a polygon in hectares
function calculateArea(polygon) {
    const coordinates = polygon.getLatLngs()[0].map(latLng => [latLng.lng, latLng.lat]);
    coordinates.push(coordinates[0]); // Close the polygon
    const turfPolygon = turf.polygon([coordinates]);
    return turf.area(turfPolygon) / 10000; // Convert square meters to hectares
}

// Format number with units
function formatNumber(number, unit, decimals = 2) {
    return `${number.toFixed(decimals)} ${unit}`;
}

// Convert degrees to radians
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

// Convert radians to degrees
function toDegrees(radians) {
    return radians * (180 / Math.PI);
}

// Calculate bearing between two points
function calculateBearing(point1, point2) {
    const lat1 = toRadians(point1.lat);
    const lat2 = toRadians(point2.lat);
    const lon1 = toRadians(point1.lng);
    const lon2 = toRadians(point2.lng);

    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
             Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    
    return toDegrees(Math.atan2(y, x));
} 