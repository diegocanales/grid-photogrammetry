/**
 * Main entry point for Grid Photogrammetry
 * Initializes the application and connects the different modules
 */

import { initMap, getMap, addFlightPathToMap, addCameraPointsToMap } from './map.js';
import { initDrawingTools, calculateArea, getCurrentPolygon } from './drawing.js';
import { initControlPanel, updateArea, getSettings } from './controls.js';
import { generateFlightPath, calculateFootprint, calculateStepDistances, generateCameraFrame } from './services.js';

// Map layers for flight path and cameras
let flightPathLayer = null;
let cameraPointsLayer = null;
let cameraFramesLayer = null;

/**
 * Initialize the application
 */
function init() {
    // Initialize map
    const map = initMap('map');
    
    // Initialize control panel
    initControlPanel('control-container', handleSettingsChanged);
    
    // Initialize drawing tools with callbacks
    initDrawingTools(
        handlePolygonCreated,
        handlePolygonDeleted,
        handlePolygonEdited
    );
}

/**
 * Handle polygon creation
 * @param {Object} polygon - GeoJSON polygon
 * @param {number} area - Area in square meters
 */
function handlePolygonCreated(polygon, area) {
    updateArea(area);
    
    // Generate initial flight path
    generateMission();
}

/**
 * Handle polygon deletion
 */
function handlePolygonDeleted() {
    updateArea(0);
    clearLayers();
    
    // Disable export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.disabled = true;
    }
}

/**
 * Handle polygon editing
 * @param {Object} polygon - GeoJSON polygon
 * @param {number} area - Area in square meters
 */
function handlePolygonEdited(polygon, area) {
    updateArea(area);
    
    // Regenerate flight path
    generateMission();
}

/**
 * Handle settings changes
 * @param {Object} settings - New settings
 */
function handleSettingsChanged(settings) {
    const polygon = getCurrentPolygon();
    
    if (polygon) {
        // Regenerate mission with new settings if we have a polygon
        generateMission();
    }
}

/**
 * Generate mission based on current settings
 */
function generateMission() {
    const polygon = getCurrentPolygon();
    if (!polygon) return;
    
    // Clear existing layers
    clearLayers();
    
    // Get current settings
    const settings = getSettings();
    
    // Calculate footprint
    const footprint = calculateFootprint(
        settings.customDrone.sensorWidth, 
        settings.customDrone.sensorHeight,
        settings.customDrone.focalLength,
        settings.flyHeight
    );
    
    // Calculate step distances
    const stepDistances = calculateStepDistances(
        footprint,
        settings.overlap,
        settings.sidelap
    );
    
    // Generate flight path
    const waypoints = generateFlightPath(
        polygon,
        settings.angle,
        stepDistances
    );
    
    // Add flight path to map
    flightPathLayer = addFlightPathToMap(waypoints, {
        color: '#FF7800',
        weight: 3,
        opacity: 0.8
    });
    
    // Add camera points if enabled
    if (settings.showCameras && waypoints.length > 0) {
        cameraPointsLayer = addCameraPointsToMap(waypoints);
    }
    
    // Add camera frames if enabled
    if (settings.showFrames && waypoints.length > 0) {
        const frames = waypoints.map(point => 
            generateCameraFrame(
                footprint,
                settings.angle,
                point.geometry.coordinates
            )
        );
        
        cameraFramesLayer = addGeoJsonToMap(frames, {
            style: {
                color: '#3388FF',
                weight: 1,
                opacity: 0.5,
                fillOpacity: 0.2
            }
        });
    }
    
    // Update images count
    const imagesElement = document.getElementById('images-value');
    if (imagesElement) {
        imagesElement.textContent = waypoints.length;
    }
    
    // Enable export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.disabled = false;
    }
}

/**
 * Clear all map layers related to mission
 */
function clearLayers() {
    const map = getMap();
    if (!map) return;
    
    // Remove flight path layer
    if (flightPathLayer) {
        map.removeLayer(flightPathLayer);
        flightPathLayer = null;
    }
    
    // Remove camera points layer
    if (cameraPointsLayer) {
        map.removeLayer(cameraPointsLayer);
        cameraPointsLayer = null;
    }
    
    // Remove camera frames layer
    if (cameraFramesLayer) {
        map.removeLayer(cameraFramesLayer);
        cameraFramesLayer = null;
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init); 