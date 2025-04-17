const CONFIG = {
    // Map default configuration
    map: {
        center: [4.6097, -74.0817], // Bogotá coordinates
        zoom: 13,
        maxZoom: 19,
        minZoom: 3
    },
    
    // Drone models with their specifications
    drones: {
        'dji-mini-3-pro': {
            name: 'DJI Mini 3 Pro',
            sensorWidth: 6.7, // mm
            sensorHeight: 8.9, // mm
            focalLength: 24, // mm
            imageWidth: 4000, // pixels
            imageHeight: 3000, // pixels
            defaultAltitude: 120, // meters
            defaultSpeed: 8, // m/s
        },
        'dji-air-2s': {
            name: 'DJI Air 2S',
            sensorWidth: 13.2, // mm
            sensorHeight: 8.8, // mm
            focalLength: 22, // mm
            imageWidth: 5472, // pixels
            imageHeight: 3648, // pixels
            defaultAltitude: 120, // meters
            defaultSpeed: 10, // m/s
        }
    },
    
    // Default mission parameters
    mission: {
        frontOverlap: 75, // percentage
        sideOverlap: 65, // percentage
        altitude: 120, // meters
        speed: 8, // m/s
        defaultDrone: 'dji-mini-3-pro'
    }
}; 