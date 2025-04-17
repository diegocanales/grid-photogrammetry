# Grid Photogrammetry Logic

## Overview
This application generates optimized flight paths for drone photogrammetry, calculating camera positions and image capture points to ensure proper coverage of a target area with specified overlap.

## Key Components

### 1. Camera Parameters
- Focal length (mm)
- Image dimensions (pixels)
- Sensor dimensions (mm)
- Flying height (m)
- Camera angle (degrees)

### 2. Coverage Calculations
The application calculates:
- Ground Sample Distance (GSD) - pixel size on ground
  - GSD_width = (sensor_width / image_width) * (fly_height / focal_length)
  - GSD_height = (sensor_height / image_height) * (fly_height / focal_length)
- Ground Coverage - area captured in one image
  - Coverage_width = (sensor_width * fly_height) / focal_length
  - Coverage_height = (sensor_height * fly_height) / focal_length

### 3. Flight Path Generation Process

1. **Area Selection**
   - User draws a polygon on the map
   - System calculates the total area

2. **Grid Generation**
   - Calculates step sizes based on overlap requirements:
     - Step_width = Coverage_width * (1 - sidelap%)
     - Step_height = Coverage_height * (1 - overlap%)

3. **Route Planning**
   The `genRoute` function:
   a. Creates a bounding box for the polygon
   b. Calculates flight lines based on the specified angle
   c. Determines intersection points with the polygon
   d. Generates parallel flight lines
   e. Optimizes the route order using nearest neighbor approach

4. **Camera Positions**
   - Calculates individual camera positions along flight lines
   - Distance between shots based on overlap requirements
   - Generates camera frames (if enabled) showing ground coverage

### 4. Output
- Visual display of flight path on map
- Camera positions and coverage frames
- Total number of images required
- Exportable flight plan in Litchi CSV format

## Key Algorithms

### Route Sorting
Uses a nearest neighbor approach to optimize the flight path:
1. Starts with first line segment
2. Finds nearest endpoint of remaining segments
3. Continues until all segments are connected

### Frame Generation
Creates visual representation of image coverage:
1. Calculates corner points based on coverage area
2. Rotates frame according to flight direction
3. Generates polygon representation

## Parameters
- Overlap: Frontal overlap between consecutive images (%)
- Sidelap: Side overlap between parallel flight lines (%)
- Flight angle: Direction of flight lines (degrees)
- Flying height: Distance above ground (meters)
