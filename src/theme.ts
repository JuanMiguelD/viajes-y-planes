export interface ThemeColors {
  /** Fondo: nav, huecos de foto y el resto de tonos beige se derivan de este. */
  paper: string
  /** Botones y acentos café: hover, selección y bordes se derivan de este. */
  coffee: string
  /** Corazones y el toque rojo de la marca. */
  heart: string
}

export const DEFAULT_THEME: ThemeColors = {
  paper: '#f1e4d0',
  coffee: '#8a5a34',
  heart: '#d6304a',
}

// ---------- Matemática de color: para derivar tonos claros/oscuros a partir de un solo color elegido ----------

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r:
        h = ((g - b) / d) % 6
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let [r, g, b] = [0, 0, 0]
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

/** Aclara (porcentaje positivo, hacia blanco) u oscurece (negativo, hacia negro) un color. */
function shade(hex: string, percent: number): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex))
  const nl = percent >= 0 ? l + (1 - l) * percent : l * (1 + percent)
  return rgbToHex(...hslToRgb(h, s, Math.max(0, Math.min(1, nl))))
}

/** Mezcla dos colores en cierta proporción (0 = el primero, 1 = el segundo). */
function mix(hexA: string, hexB: string, amount: number): string {
  const [ra, ga, ba] = hexToRgb(hexA)
  const [rb, gb, bb] = hexToRgb(hexB)
  return rgbToHex(ra + (rb - ra) * amount, ga + (gb - ga) * amount, ba + (bb - ba) * amount)
}

/**
 * Aplica los 3 colores elegidos a toda la app. El texto (ink, muted) y el resto de la paleta no
 * elegible se quedan fijos para no arriesgar la legibilidad; solo se derivan los tonos que dependen
 * directamente del fondo y del café (líneas, superficies, selección, hover).
 */
export function applyTheme(theme: ThemeColors): void {
  const root = document.documentElement.style
  root.setProperty('--paper', theme.paper)
  root.setProperty('--surface', shade(theme.paper, 0.55))
  root.setProperty('--line', shade(theme.paper, -0.06))
  root.setProperty('--line-strong', shade(theme.paper, -0.18))
  root.setProperty('--faint', shade(theme.paper, -0.35))
  root.setProperty('--coffee', theme.coffee)
  root.setProperty('--coffee-deep', shade(theme.coffee, -0.2))
  root.setProperty('--coffee-tint', mix(theme.coffee, theme.paper, 0.78))
  root.setProperty('--heart', theme.heart)
}
