export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

/** Sin API key de Google Maps no se puede dibujar el mapa. */
export const mapsEnabled = Boolean(GOOGLE_MAPS_API_KEY)
