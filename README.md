# Grid Photogrammetry

Una herramienta web simple para planificar rutas de vuelo para fotogrametría con drones. Genera patrones de vuelo en cuadrícula (grid) optimizados para capturar imágenes aéreas.

## Características

- Interfaz de mapa interactivo usando Leaflet
- Dibujo de polígonos para definir área de vuelo
- Cálculos automáticos de:
  - GSD (Ground Sample Distance)
  - Área de cobertura
  - Número de imágenes necesarias
  - Distancia entre líneas de vuelo
- Soporte para múltiples modelos de drones
- Exportación de rutas en formato compatible con Litchi

## Tecnologías

- Vanilla JavaScript (ES Modules)
- Leaflet para mapas interactivos
- Leaflet.draw para herramientas de dibujo
- Turf.js para cálculos geoespaciales
- CDNs para todas las dependencias (sin necesidad de npm)

## Estructura del Proyecto

```
/
├── index.html        # Página principal
├── css/
│   ├── reset.css     # Reset de estilos
│   └── style.css     # Estilos personalizados
├── js/
│   ├── main.js       # Punto de entrada
│   ├── map.js        # Manejo del mapa
│   ├── drawing.js    # Herramientas de dibujo
│   ├── controls.js   # Panel de control
│   ├── services.js   # Cálculos y exportación
│   ├── config.js     # Configuraciones y drones
│   └── utils.js      # Utilidades
└── assets/           # Imágenes y recursos
```

## Instalación y Uso

Para ejecutar localmente:

1. Clona este repositorio
2. Simplemente abre `index.html` en tu navegador
3. No requiere instalación de dependencias ya que usa CDNs

## Uso

1. Usa las herramientas de dibujo en la parte superior derecha para dibujar un polígono que defina tu área de vuelo
2. Configura los parámetros de vuelo en el panel de control:
   - Selecciona un modelo de dron
   - Ajusta altura de vuelo, superposición, etc.
3. Haz clic en "Generate Mission" para generar la ruta de vuelo
4. Revisa las estadísticas (GSD, número de imágenes)
5. Haz clic en "Export Litchi" para exportar la misión en formato compatible con la app Litchi

## Cálculos y Fórmulas

Las principales fórmulas utilizadas son:

### Ground Sample Distance (GSD)
```
GSD = (Ancho Sensor / Ancho Imagen) * (Altura * 100) / (Distancia Focal)
```
Donde:
- GSD se expresa en cm/pixel
- Ancho Sensor en mm (convertido a cm)
- Altura de vuelo en metros (convertida a cm)
- Distancia Focal en mm (convertida a cm)

### Área de Cobertura de Imagen
```
Ancho Cobertura = (Ancho Sensor / Distancia Focal) * Altura
Alto Cobertura = (Alto Sensor / Distancia Focal) * Altura
```

### Distancia Entre Líneas
```
Paso Lateral = Ancho Cobertura * (1 - Superposición Lateral/100)
Paso Longitudinal = Alto Cobertura * (1 - Superposición Frontal/100)
```

## Mejoras sobre la Versión Original

- Código modular usando ES Modules
- Soporte para más modelos de drones
- Interfaz más limpia y amigable
- Mejoras de rendimiento en la generación de rutas
- Diseño responsivo para dispositivos móviles
- Uso exclusivo de CDNs sin necesidad de gestores de paquetes

## Licencia

MIT

## Contribuir

Las contribuciones son bienvenidas. Por favor:
1. Haz fork del repositorio
2. Crea una rama para tu feature
3. Envía un pull request

## Referencias y Agradecimientos

- Repositorio original: [afbayonac.github.io/grid-photogrammetry/](https://afbayonac.github.io/grid-photogrammetry/)
- [Leaflet](https://leafletjs.com/) para mapas interactivos
- [Turf.js](https://turfjs.org/) para análisis espacial
- [jsDelivr](https://www.jsdelivr.com/) para entrega de CDNs

## Modelos de Drones Soportados

- DJI Mini 3 & 4 Pro
- DJI Air 2/2S/3
- DJI Mavic series
- Y otros modelos profesionales
