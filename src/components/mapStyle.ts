import { useEffect, useState } from 'react'

/**
 * Estilo cálido de Google Maps a juego con la paleta de la app, en vez de las teselas
 * por defecto de Google (colores, iconos de negocio y transporte apagados).
 */
export const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f6ecdd' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5d4631' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#fdf8f0' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#dfe6c8' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f1e3cc' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e3ddbf' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e9dcc4' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ddc89e' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#8c7355' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
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
