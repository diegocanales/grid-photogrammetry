/* global L, turf, Blob */
import droneModels from './droneModels.js'

const DEBUG = true;

// Math utility functions
Math.degrees = radians => {
    return radians * 180 / Math.PI;
};

Math.radians = degrees => {
    return Math.PI * degrees / 180;
};

// Download utility function
const download = (filename, data) => {
    console.log('download');
    const blob = new Blob([data], {
        type: 'text/csv'
    });
    if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    } else {
        const elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
};

// Initialize map with Leaflet
const initMap = () => {
    // Create map
    const map = L.map('map').setView([0, 0], 2);
    
    // Add OSM tile layer
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap Contributors',
        maxZoom: 19
    });
    
    // Add satellite layer and add it to the map by default
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
    }).addTo(map);
    
    // Initialize draw control
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    
    const drawControl = new L.Control.Draw({
        draw: {
            marker: false,
            circlemarker: false,
            circle: false,
            polyline: false,
            rectangle: false,
            polygon: {
                allowIntersection: false,
                showArea: true
            }
        },
        edit: {
            featureGroup: drawnItems
        }
    });
    map.addControl(drawControl);
    
    // Add layer control
    const baseMaps = {
        "OpenStreetMap": osmLayer,
        "Satellite": satelliteLayer
    };
    
    L.control.layers(baseMaps, null, {
        position: 'topright'
    }).addTo(map);
    
    return { map, drawnItems, drawControl, osmLayer, satelliteLayer };
};

const { map, drawnItems, drawControl, osmLayer, satelliteLayer } = initMap();

// State object to replace Vue data
const state = {
    droneModels,
    droneModel: 'custom',
    focalLength: 8.4,
    imageWidth: 5472,
    imageHeight: 3648,
    sensorWidth: 13.31,
    sensorHeight: 8.88,
    flyHeight: 50,
    overlap: 80,
    sidelap: 80,
    angle: 270,
    showFrames: false,
    showCameras: true,
    images: 0,
    H: 0,
    area: 0,
    cameraAngle: -90,
    route: null,
    show: true,
    locationQuery: '',
    currentPolygon: null,
    routeLayer: null,
    framesLayer: null,
    camerasLayer: null
};

// Computed properties
const getComputedValues = () => {
    const GDSW = ((state.sensorWidth / 10) / state.imageWidth) * (state.flyHeight * 100) / (state.focalLength / 10);
    const GDSH = ((state.sensorHeight / 10) / state.imageHeight) * (state.flyHeight * 100) / (state.focalLength / 10);
    const CoverageW = (state.sensorWidth / 10) * (state.flyHeight * 100) / (state.focalLength / 10);
    const CoverageH = (state.sensorHeight / 10) * (state.flyHeight * 100) / (state.focalLength / 10);
    const stepW = CoverageW / 100000 * (1 - (state.sidelap / 100));
    const stepH = CoverageH / 100000 * (1 - (state.overlap / 100));
    
    return { GDSW, GDSH, CoverageW, CoverageH, stepW, stepH };
};

// UI setup
const setupUI = () => {
    // Set initial panel state to visible
    state.show = true;
    
    // Populate drone models dropdown
    const droneModelSelect = document.getElementById('drone-model');
    Object.keys(droneModels).forEach((key, index) => {
        const model = droneModels[key];
        const option = document.createElement('option');
        option.value = key;
        option.textContent = model.name;
        droneModelSelect.appendChild(option);
    });
    
    // Toggle control panel visibility
    document.getElementById('toggle-panel').addEventListener('click', () => {
        state.show = !state.show;
        if (state.show) {
            document.getElementById('control-panel').classList.remove('hidden');
        } else {
            document.getElementById('control-panel').classList.add('hidden');
        }
    });
    
    document.getElementById('close-panel').addEventListener('click', () => {
        state.show = false;
        document.getElementById('control-panel').classList.add('hidden');
    });
    
    // Location search
    document.getElementById('search-location').addEventListener('click', searchLocation);
    
    // Drone model selection
    document.getElementById('drone-model').addEventListener('change', (e) => {
        state.droneModel = e.target.value;
        if (state.droneModel !== 'custom') {
            const model = droneModels[Number(state.droneModel)];
            state.focalLength = model.focalLength;
            state.imageHeight = model.imageHeight;
            state.imageWidth = model.imageWidth;
            state.sensorHeight = model.sensorHeight;
            state.sensorWidth = model.sensorWidth;
            
            // Update UI
            document.getElementById('focal-length').value = state.focalLength;
            document.getElementById('image-width').value = state.imageWidth;
            document.getElementById('image-height').value = state.imageHeight;
            document.getElementById('sensor-width').value = state.sensorWidth;
            document.getElementById('sensor-height').value = state.sensorHeight;
            
            // Disable inputs
            document.getElementById('focal-length').disabled = true;
            document.getElementById('image-width').disabled = true;
            document.getElementById('image-height').disabled = true;
            document.getElementById('sensor-width').disabled = true;
            document.getElementById('sensor-height').disabled = true;
        } else {
            // Enable inputs
            document.getElementById('focal-length').disabled = false;
            document.getElementById('image-width').disabled = false;
            document.getElementById('image-height').disabled = false;
            document.getElementById('sensor-width').disabled = false;
            document.getElementById('sensor-height').disabled = false;
        }
        updateRoute();
    });
    
    // Input change handlers
    const inputIds = [
        'focal-length', 'image-width', 'image-height', 'sensor-width', 
        'sensor-height', 'fly-height', 'angle', 'overlap', 'sidelap',
        'camera-angle'
    ];
    
    inputIds.forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => {
            const key = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            state[key] = parseFloat(e.target.value);
            updateRoute();
        });
    });
    
    // Checkbox handlers
    document.getElementById('show-frames').addEventListener('change', (e) => {
        state.showFrames = e.target.checked;
        updateRoute();
    });
    
    document.getElementById('show-cameras').addEventListener('change', (e) => {
        state.showCameras = e.target.checked;
        updateRoute();
    });
    
    // Download button
    document.getElementById('download-csv').addEventListener('click', downloadNadirLitchiCSV);
};

// Location search function
const searchLocation = () => {
    const query = document.getElementById('location-query').value;
    if (!query) return;
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const location = data[0];
                map.setView([location.lat, location.lon], 15);
            } else {
                alert('Location not found');
            }
        })
        .catch(error => {
            console.error('Error searching location:', error);
            alert('Error searching location');
        });
};

// Download CSV function
const downloadNadirLitchiCSV = () => {
    if (!state.route) {
        alert('No route generated');
        return;
    }
    
    const { stepH } = getComputedValues();
    
    // Generate points along route
    const points = state.route
        .reduce((points, s) => {
            const distance = turf.distance(s[0], s[1]);
            const angle = turf.bearing(s[0], s[1]);
            
            return [
                ...points,
                ...Array(Math.ceil(distance / stepH))
                    .fill(null)
                    .map((_, i) => turf.rhumbDestination(s[0], stepH * i, angle))
            ];
        }, []);
    
    // Generate CSV content
    const csv = [
        'latitude,longitude,altitude(m),heading(deg),curvesize(m),rotationdir,gimbalmode,gimbalpitchangle,actiontype1,actionparam1,actiontype2,actionparam2,actiontype3,actionparam3,actiontype4,actionparam4,actiontype5,actionparam5,actiontype6,actionparam6,actiontype7,actionparam7,actiontype8,actionparam8,actiontype9,actionparam9,actiontype10,actionparam10,actiontype11,actionparam11,actiontype12,actionparam12,actiontype13,actionparam13,actiontype14,actionparam14,actiontype15,actionparam15,altitudemode',
        ...points.map((p, i) => {
            const coords = p.geometry.coordinates;
            const nextPoint = i < points.length - 1 ? points[i + 1] : null;
            const heading = nextPoint ? turf.bearing(p, nextPoint) : 0;
            
            return [
                coords[1],                  // latitude
                coords[0],                  // longitude
                state.flyHeight,            // altitude
                heading,                    // heading
                0,                          // curvesize
                0,                          // rotationdir
                0,                          // gimbalmode
                state.cameraAngle,          // gimbalpitchangle
                0, '', 0, '', 0, '', 0, '', // actiontype1-4 and params
                0, '', 0, '', 0, '', 0, '', // actiontype5-8 and params
                0, '', 0, '', 0, '', 0, '', // actiontype9-12 and params
                0, '', 0, '', 0, '',        // actiontype13-15 and params
                0                           // altitudemode
            ].join(',');
        })
    ].join('\n');
    
    download('litchi_mission.csv', csv);
};

// Update UI with computed values
const updateUIValues = () => {
    const { GDSW, GDSH, CoverageW, CoverageH, stepW } = getComputedValues();
    
    document.getElementById('gds-w').textContent = `${GDSW.toFixed(2)} cm`;
    document.getElementById('gds-h').textContent = `${GDSH.toFixed(2)} cm`;
    document.getElementById('coverage-w').textContent = `${(CoverageW / 100).toFixed(2)} m`;
    document.getElementById('coverage-h').textContent = `${(CoverageH / 100).toFixed(2)} m`;
    document.getElementById('area').textContent = state.area.toFixed(2);
    document.getElementById('step').textContent = (stepW * 1000).toFixed(2);
    document.getElementById('images').textContent = state.images;
};

// Update route based on current polygon and settings
const updateRoute = () => {
    // Clear existing layers
    if (state.routeLayer) map.removeLayer(state.routeLayer);
    if (state.framesLayer) map.removeLayer(state.framesLayer);
    if (state.camerasLayer) map.removeLayer(state.camerasLayer);
    
    state.routeLayer = L.featureGroup().addTo(map);
    state.framesLayer = L.featureGroup().addTo(map);
    state.camerasLayer = L.featureGroup().addTo(map);
    
    if (!state.currentPolygon) return;
    
    const { CoverageW, CoverageH, stepW, stepH } = getComputedValues();
    
    // Calculate area
    state.area = turf.area(state.currentPolygon);
    
    // Asegurarse de pasar explícitamente state.angle a genRoute
    state.route = genRoute(state.angle, stepW, state.currentPolygon);
    
    // Generate points along route
    const points = state.route
        .reduce((points, s) => {
            const distance = turf.distance(s[0], s[1]);
            const angle = turf.bearing(s[0], s[1]);
            
            return [
                ...points,
                ...Array(Math.ceil(distance / stepH))
                    .fill(null)
                    .map((_, i) => turf.rhumbDestination(s[0], stepH * i, angle))
            ];
        }, []);
    
    state.images = points.length;
    
    // Add frames and cameras to map
    points.forEach(p => {
        const coords = p.geometry.coordinates;
        
        if (state.showCameras) {
            L.circleMarker([coords[1], coords[0]], {
                radius: 3,
                color: '#3388ff',
                fillColor: '#3388ff',
                fillOpacity: 1
            }).addTo(state.camerasLayer);
        }
        
        if (state.showFrames) {
            const framePolygon = frame(CoverageW, CoverageH, state.angle, p);
            const frameCoords = framePolygon.geometry.coordinates[0].map(c => [c[1], c[0]]);
            L.polygon(frameCoords, {
                color: '#ff3388',
                weight: 1,
                fillOpacity: 0.2
            }).addTo(state.framesLayer);
        }
    });
    
    // Add route lines to map
    state.route.forEach(segment => {
        const start = segment[0].geometry.coordinates;
        const end = segment[1].geometry.coordinates;
        L.polyline([[start[1], start[0]], [end[1], end[0]]], {
            color: '#33ff88',
            weight: 2
        }).addTo(state.routeLayer);
    });
    
    // Update UI values
    updateUIValues();
};

// Frame generation function
const frame = (CoverageW, CoverageH, angle, origin) => {
    const hypot = Math.hypot(CoverageH, CoverageW) / 200000;
    const offsetAngle = (angle - 90) % 360;
    const teta = Math.degrees(Math.atan2(CoverageH, CoverageW));
    
    const x1 = turf.rhumbDestination(origin, hypot, teta + offsetAngle).geometry.coordinates;
    const x2 = turf.rhumbDestination(origin, hypot, 180 - teta + offsetAngle).geometry.coordinates;
    const x3 = turf.rhumbDestination(origin, hypot, 180 + teta + offsetAngle).geometry.coordinates;
    const x4 = turf.rhumbDestination(origin, hypot, 360 - teta + offsetAngle).geometry.coordinates;
    
    return {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Polygon',
            coordinates: [
                [
                    [x1[0], x1[1]],
                    [x2[0], x2[1]],
                    [x3[0], x3[1]],
                    [x4[0], x4[1]],
                    [x1[0], x1[1]]
                ]
            ]
        }
    };
};

// Route generation function
const genRoute = (angle, step, polygon) => {
    // Boundary box
    const bbox = turf.bbox(polygon);
    const pointA = turf.point([bbox[0], bbox[1]]);
    const pointB = turf.point([bbox[2], bbox[3]]);
    const pointC = turf.point([bbox[0], bbox[3]]);
    
    const alfa = turf.bearing(pointA, pointB);
    const beta = Math.abs(90 - alfa);
    const hypot = turf.distance(pointA, pointB);
    
    if (DEBUG) {
        console.log('angle', angle);
        console.log('α', alfa);
        console.log('β', beta);
        console.log('h', hypot);
    }
    
    const angleIdentity = angle % 180;
    const stepCorrection = angleIdentity > 90 ?
        Math.abs(step / Math.cos(Math.radians((angleIdentity - 90) - alfa))) :
        Math.abs(step / Math.cos(Math.radians(angleIdentity - beta)));
    
    const segments = Math.floor(hypot / stepCorrection);
    const origin = angleIdentity > 90 ? pointB : pointC;
    const angleH = angleIdentity > 90 ? 180 + alfa : 90 + beta;
    
    if (DEBUG) {
        console.log(step, stepCorrection);
    }
    
    const route = Array(segments + 1).fill(null)
        .map((_, i) => {
            const p0 = turf.rhumbDestination(origin, stepCorrection * i, angleH);
            const p1 = turf.rhumbDestination(p0, hypot, angleIdentity).geometry.coordinates;
            const p2 = turf.rhumbDestination(p0, hypot, angleIdentity + 180).geometry.coordinates;
            return {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: [p1, p2]
                }
            };
        })
        .map(line => turf.lineIntersect(line, polygon).features
            .sort((a, b) => b.geometry.coordinates.reduce((aco, cur) => aco + cur, 0) - a.geometry.coordinates.reduce((aco, cur) => aco + cur, 0))
        )
        .filter(intersects => intersects.length > 0 && intersects.length % 2 === 0)
        .reduce((route, intersects) => {
            return [
                ...route,
                ...Array(intersects.length / 2)
                    .fill([])
                    .map((_, i) => intersects.slice(2 * i, 2 * (i + 1)))
                    .map(s => [
                        s[0],
                        s[1]
                    ])
            ];
        }, []);
    
    return sortRoute(route);
};

// Not is the best route only findNearest
const findNearest = (point, lines) => {
    const {
        nearest,
        others
    } = lines
        .map(l => ({
            p: l,
            d: l.map(p => turf.distance(point, p))
        }))
        .reduce((result, current) => {
            if (result.nearest === null) {
                return {
                    ...result,
                    nearest: current
                };
            }
            
            if (Math.min(...result.nearest.d) < Math.min(...current.d)) {
                return {
                    ...result,
                    others: [...result.others, current]
                };
            }
            
            return {
                nearest: current,
                others: [result.nearest, ...result.others]
            };
        }, {
            nearest: null,
            others: []
        });
    
    return [
        nearest.d[0] < nearest.d[1] ? nearest.p : [nearest.p[1], nearest.p[0]],
        ...others.map(o => o.p)
    ];
};

const sortRoute = lines => lines.length === 1 ?
    lines : [lines[0], ...sortRoute(findNearest(lines[0][1], lines.slice(1)))];

// Event handlers for Leaflet Draw
map.on('draw:created', (e) => {
    drawnItems.clearLayers();
    drawnItems.addLayer(e.layer);
    
    // Convert Leaflet layer to GeoJSON
    const geoJson = e.layer.toGeoJSON();
    state.currentPolygon = geoJson;
    
    updateRoute();
});

map.on('draw:edited', (e) => {
    // Get the edited layer
    const layers = e.layers;
    layers.eachLayer((layer) => {
        // Convert Leaflet layer to GeoJSON
        const geoJson = layer.toGeoJSON();
        state.currentPolygon = geoJson;
    });
    
    updateRoute();
});

map.on('draw:deleted', () => {
    state.currentPolygon = null;
    state.route = null;
    state.images = 0;
    state.area = 0;
    
    updateUIValues();
});

// Initialize UI after DOM is loaded
document.addEventListener('DOMContentLoaded', setupUI);
