// Initialize the control panel
function initializeControlPanel() {
    const controlPanel = document.getElementById('control-panel');
    controlPanel.innerHTML = `
        <div class="control-section" id="flight-config">
            <h2>Configuración de Vuelo</h2>
            
            <div class="form-group">
                <label for="drone-select">Modelo de Dron:</label>
                <select id="drone-select" class="form-control">
                    ${Object.entries(CONFIG.drones).map(([id, drone]) => 
                        `<option value="${id}">${drone.name}</option>`
                    ).join('')}
                </select>
            </div>

            <div class="form-group">
                <label for="altitude">Altura de Vuelo (m):</label>
                <input type="number" id="altitude" class="form-control" 
                       value="${CONFIG.mission.altitude}" min="20" max="500">
            </div>

            <div class="form-group">
                <label for="front-overlap">Superposición Frontal (%):</label>
                <input type="number" id="front-overlap" class="form-control" 
                       value="${CONFIG.mission.frontOverlap}" min="60" max="90">
            </div>

            <div class="form-group">
                <label for="side-overlap">Superposición Lateral (%):</label>
                <input type="number" id="side-overlap" class="form-control" 
                       value="${CONFIG.mission.sideOverlap}" min="60" max="85">
            </div>

            <div class="form-group">
                <label for="speed">Velocidad (m/s):</label>
                <input type="number" id="speed" class="form-control" 
                       value="${CONFIG.mission.speed}" min="1" max="15">
            </div>

            <div class="form-group">
                <label for="camera-angle">Ángulo de Cámara (°):</label>
                <input type="number" id="camera-angle" class="form-control" 
                       value="-90" min="-90" max="0">
            </div>

            <div class="form-group">
                <label for="flight-angle">Ángulo de Vuelo (°):</label>
                <input type="number" id="flight-angle" class="form-control" 
                       value="0" min="0" max="359">
            </div>

            <div class="form-group">
                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" id="show-frames" checked>
                        Mostrar Cobertura
                    </label>
                </div>
                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" id="show-cameras" checked>
                        Mostrar Puntos de Foto
                    </label>
                </div>
            </div>

            <div class="form-group">
                <label for="location-search">Buscar Ubicación:</label>
                <div class="search-group">
                    <input type="text" id="location-search" class="form-control" 
                           placeholder="Ingresa una ubicación...">
                    <button id="search-btn" class="btn btn-secondary">
                        Buscar
                    </button>
                </div>
            </div>

            <div class="form-group">
                <button id="toggle-map" class="btn btn-secondary">
                    Cambiar Vista del Mapa
                </button>
            </div>

            <div class="form-group">
                <button id="process-mission" class="btn btn-primary" style="display: none;">
                    Procesar Misión
                </button>
            </div>
        </div>

        <div class="control-section" id="mission-stats">
            <h2>Estadísticas de Misión</h2>
            <p>Dibuja un polígono en el mapa para comenzar</p>
        </div>

        <div class="control-section" id="export-options" style="display: none;">
            <h2>Exportar Misión</h2>
            <div class="btn-group">
                <button id="export-litchi" class="btn btn-primary">
                    Exportar CSV Litchi
                </button>
            </div>
        </div>
    `;

    // Add event listeners
    setupEventListeners();
}

// Setup event listeners for all controls
function setupEventListeners() {
    const droneSelect = document.getElementById('drone-select');
    const altitudeInput = document.getElementById('altitude');
    const frontOverlapInput = document.getElementById('front-overlap');
    const sideOverlapInput = document.getElementById('side-overlap');
    const speedInput = document.getElementById('speed');
    const cameraAngleInput = document.getElementById('camera-angle');
    const flightAngleInput = document.getElementById('flight-angle');
    const showFramesCheckbox = document.getElementById('show-frames');
    const showCamerasCheckbox = document.getElementById('show-cameras');
    const locationSearchInput = document.getElementById('location-search');
    const searchButton = document.getElementById('search-btn');
    const toggleMapButton = document.getElementById('toggle-map');
    const processMissionButton = document.getElementById('process-mission');
    const exportLitchiButton = document.getElementById('export-litchi');

    // Update mission parameters when any input changes
    [droneSelect, altitudeInput, frontOverlapInput, sideOverlapInput, speedInput,
     cameraAngleInput, flightAngleInput].forEach(input => {
        input.addEventListener('change', updateMissionStats);
    });

    // Visualization toggles
    [showFramesCheckbox, showCamerasCheckbox].forEach(checkbox => {
        checkbox.addEventListener('change', updateVisualization);
    });

    // Location search
    searchButton.addEventListener('click', searchLocation);
    locationSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchLocation();
    });

    // Map style toggle
    toggleMapButton.addEventListener('click', toggleMapStyle);

    // Process mission button
    processMissionButton.addEventListener('click', () => {
        updateMissionStats(true); // true indicates we should process the mission
    });

    // Export button
    exportLitchiButton.addEventListener('click', () => exportMission('csv'));

    // Listen for polygon drawing events
    document.addEventListener('drawComplete', handleDrawComplete);
    document.addEventListener('drawDeleted', handleDrawDeleted);
}

// Update mission statistics when polygon is drawn or parameters change
function updateMissionStats(shouldProcess = false) {
    const missionStats = document.getElementById('mission-stats');
    const processButton = document.getElementById('process-mission');
    const exportOptions = document.getElementById('export-options');
    
    const selectedDrone = CONFIG.drones[document.getElementById('drone-select').value];
    const altitude = parseFloat(document.getElementById('altitude').value);
    const frontOverlap = parseFloat(document.getElementById('front-overlap').value);
    const sideOverlap = parseFloat(document.getElementById('side-overlap').value);
    const speed = parseFloat(document.getElementById('speed').value);

    // Calculate GSD
    const gsd = calculateGSD(
        altitude,
        selectedDrone.sensorWidth,
        selectedDrone.focalLength,
        selectedDrone.imageWidth
    );

    // Update mission parameters in CONFIG
    CONFIG.mission = {
        ...CONFIG.mission,
        altitude,
        frontOverlap,
        sideOverlap,
        speed
    };

    // If there's no polygon drawn, hide process button and export options
    if (!currentPolygon) {
        processButton.style.display = 'none';
        exportOptions.style.display = 'none';
        missionStats.innerHTML = `
            <h2>Estadísticas de Misión</h2>
            <p>GSD: ${formatNumber(gsd, 'cm/pixel')}</p>
            <p>Dibuja un polígono en el mapa para ver más detalles</p>
        `;
        return;
    }

    // Show process button when polygon is drawn
    processButton.style.display = 'block';

    // Only process and show export options if shouldProcess is true
    if (shouldProcess) {
        // Calculate area and trigger mission planning
        const area = calculateArea(currentPolygon);
        
        // Trigger mission calculation event
        const missionUpdateEvent = new CustomEvent('missionUpdate', {
            detail: {
                polygon: currentPolygon,
                parameters: {
                    drone: selectedDrone,
                    altitude,
                    frontOverlap,
                    sideOverlap,
                    speed,
                    gsd
                }
            }
        });
        document.dispatchEvent(missionUpdateEvent);
        
        // Show export options
        exportOptions.style.display = 'block';
    } else {
        // Just show basic stats when polygon is drawn but not processed
        const area = calculateArea(currentPolygon);
        missionStats.innerHTML = `
            <h2>Estadísticas de Misión</h2>
            <p>GSD: ${formatNumber(gsd, 'cm/pixel')}</p>
            <p>Área: ${formatNumber(area, 'ha')}</p>
            <p>Haz clic en "Procesar Misión" para generar el plan de vuelo</p>
        `;
        
        // Hide export options until mission is processed
        exportOptions.style.display = 'none';
    }
}

// Handle polygon drawing complete
function handleDrawComplete(event) {
    currentPolygon = event.detail.polygon;
    updateMissionStats();
}

// Handle polygon deletion
function handleDrawDeleted() {
    currentPolygon = null;
    updateMissionStats();
}

// New functions for added functionality
async function searchLocation() {
    const query = document.getElementById('location-search').value.trim();
    if (!query) return;

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
        const [location] = await response.json();

        if (location) {
            map.setView([location.lat, location.lon], 15);
        } else {
            alert('Ubicación no encontrada. Por favor, intenta con otra búsqueda.');
        }
    } catch (error) {
        console.error('Error buscando ubicación:', error);
        alert('Error al buscar la ubicación. Por favor, intenta de nuevo.');
    }
}

function toggleMapStyle() {
    const currentStyle = map.getContainer().style.filter;
    if (currentStyle === 'saturate(0)') {
        map.getContainer().style.filter = 'none';
    } else {
        map.getContainer().style.filter = 'saturate(0)';
    }
}

function updateVisualization() {
    const showFrames = document.getElementById('show-frames').checked;
    const showCameras = document.getElementById('show-cameras').checked;
    
    // Trigger visualization update event
    document.dispatchEvent(new CustomEvent('visualizationUpdate', {
        detail: { showFrames, showCameras }
    }));
}

// Initialize control panel when the page loads
initializeControlPanel(); 