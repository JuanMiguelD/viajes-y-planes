import { useEffect, useState } from 'react'

/**
 * Estilo cálido de Google Maps a juego con la paleta de la app. Muestra negocios, calles y
 * estaciones (para reconocer dónde queda cada cosa), con colores suaves para que los
 * marcadores de nuestros planes sigan siendo lo que más resalta.
 */
export const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f6ecdd' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5d4631' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#fdf8f0' }] },
  { elementType: 'labels.icon', stylers: [{ saturation: -35 }, { lightness: 8 }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#efe1c8' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#7a5c3e' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dfe6c8' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#5f7041' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f1e3cc' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e3ddbf' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#fffaf1' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e6d6b8' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8c7355' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ecd9b0' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#d9c08f' }] },
  { featureType: 'transit.line', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#7a5c3e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfdfe6' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5f7f90' }] },
]

/** Props comunes para los tres mapas de la app (principal, selector de lugar y miniatura de ficha). */
export const MAP_BASE_PROPS = {
  styles: MAP_STYLES,
  disableDefaultUI: true,
  clickableIcons: false,
}

/** Oculta el control de zoom nativo en pantallas pequeñas (igual que antes con Leaflet). */
export function useShowZoomControl(): boolean {
  const query = '(max-width: 899px)'
  const [show, setShow] = useState(() => !window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setShow(!mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return show
}
