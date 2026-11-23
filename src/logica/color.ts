export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Oklch {
  l: number
  c: number
  h: number
}

export const PASOS_ESCALA = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
export type PasoEscala = (typeof PASOS_ESCALA)[number]
export type EscalaColor = Record<PasoEscala, string>

export type Temperatura = 'frio' | 'puro' | 'calido'

// Curva fija de luminosidad OKLCH, del paso 50 al 950. El índice 5 corresponde al 500.
const CURVA_LUMINOSIDAD = [0.97, 0.935, 0.875, 0.8, 0.71, 0.62, 0.53, 0.445, 0.36, 0.27, 0.18]
// Reducción de croma en los extremos para que los tonos muy claros u oscuros no se saturen
const FACTOR_CROMA = [0.14, 0.28, 0.5, 0.74, 0.92, 1, 0.96, 0.86, 0.74, 0.6, 0.46]

// El 400 queda lo bastante oscuro para que un borde de campo alcance 3:1 sobre blanco
const CURVA_NEUTRA = [0.985, 0.967, 0.922, 0.87, 0.63, 0.556, 0.439, 0.371, 0.269, 0.205, 0.145]
const FACTOR_CROMA_NEUTRO = [0.3, 0.4, 0.6, 0.8, 1, 1, 1, 1, 1, 0.9, 0.8]
const CROMA_NEUTRO = 0.014
const TONO_FRIO = 255
const TONO_CALIDO = 60

export function normalizarHex(valor: string): string | null {
  const limpio = valor.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(limpio)) {
    return '#' + limpio.split('').map((c) => c + c).join('')
  }
  if (/^[0-9a-f]{6}$/.test(limpio)) return '#' + limpio
  return null
}

export function hexARgb(hex: string): Rgb {
  const normal = normalizarHex(hex) ?? '#000000'
  return {
    r: parseInt(normal.slice(1, 3), 16) / 255,
    g: parseInt(normal.slice(3, 5), 16) / 255,
    b: parseInt(normal.slice(5, 7), 16) / 255,
  }
}

export function rgbAHex({ r, g, b }: Rgb): string {
  const canal = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${canal(r)}${canal(g)}${canal(b)}`
}

const aLineal = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const aGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

export function rgbAOklch(rgb: Rgb): Oklch {
  const r = aLineal(rgb.r)
  const g = aLineal(rgb.g)
  const b = aLineal(rgb.b)

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s

  const c = Math.sqrt(A * A + B * B)
  let h = (Math.atan2(B, A) * 180) / Math.PI
  if (h < 0) h += 360
  return { l: L, c, h }
}

function oklchARgbLineal({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180
  const A = c * Math.cos(rad)
  const B = c * Math.sin(rad)

  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3

  return {
    r: 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    g: -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    b: -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  }
}

const TOLERANCIA_GAMUT = 0.0001
const enGamut = ({ r, g, b }: Rgb) =>
  [r, g, b].every((v) => v >= -TOLERANCIA_GAMUT && v <= 1 + TOLERANCIA_GAMUT)

// Si el color cae fuera de sRGB, reduce el croma (búsqueda binaria) manteniendo luminosidad y tono
export function oklchAHex(color: Oklch): string {
  let lineal = oklchARgbLineal(color)
  if (!enGamut(lineal)) {
    let bajo = 0
    let alto = color.c
    for (let i = 0; i < 24; i++) {
      const medio = (bajo + alto) / 2
      if (enGamut(oklchARgbLineal({ ...color, c: medio }))) bajo = medio
      else alto = medio
    }
    lineal = oklchARgbLineal({ ...color, c: bajo })
  }
  return rgbAHex({ r: aGamma(lineal.r), g: aGamma(lineal.g), b: aGamma(lineal.b) })
}

export const hexAOklch = (hex: string) => rgbAOklch(hexARgb(hex))

function mezclarTono(desde: number, hacia: number, t: number): number {
  const diferencia = ((hacia - desde + 540) % 360) - 180
  return (desde + diferencia * t + 360) % 360
}

function crearEscala(pasos: (indice: number) => string): EscalaColor {
  const escala = {} as EscalaColor
  PASOS_ESCALA.forEach((paso, indice) => {
    escala[paso] = pasos(indice)
  })
  return escala
}

/**
 * Escala de 11 pasos. El 500 es exactamente el color de entrada; el resto reparte la curva
 * fija de luminosidad a cada lado de la luminosidad real del color, para que la escala
 * quede monótona aunque el color elegido sea más claro u oscuro que el 500 de la curva.
 */
export function generarEscala(hex: string): EscalaColor {
  const base = normalizarHex(hex) ?? '#000000'
  const { l, c, h } = hexAOklch(base)
  const ancla = Math.min(0.9, Math.max(0.3, l))
  const curvaAncla = CURVA_LUMINOSIDAD[5]
  const extremoClaro = CURVA_LUMINOSIDAD[0]
  const extremoOscuro = CURVA_LUMINOSIDAD[10]

  return crearEscala((indice) => {
    if (indice === 5) return base
    const curva = CURVA_LUMINOSIDAD[indice]
    const luminosidad =
      indice < 5
        ? extremoClaro + ((curva - extremoClaro) / (curvaAncla - extremoClaro)) * (ancla - extremoClaro)
        : ancla + ((curva - curvaAncla) / (extremoOscuro - curvaAncla)) * (extremoOscuro - ancla)
    return oklchAHex({ l: luminosidad, c: c * FACTOR_CROMA[indice], h })
  })
}

export function generarEscalaNeutra(hexPrimario: string, temperatura: Temperatura): EscalaColor {
  const { h } = hexAOklch(hexPrimario)
  const tono =
    temperatura === 'frio' ? mezclarTono(h, TONO_FRIO, 0.65) : mezclarTono(h, TONO_CALIDO, 0.65)
  const croma = temperatura === 'puro' ? 0 : CROMA_NEUTRO

  return crearEscala((indice) =>
    oklchAHex({ l: CURVA_NEUTRA[indice], c: croma * FACTOR_CROMA_NEUTRO[indice], h: tono }),
  )
}

export function rgba(hex: string, alfa: number): string {
  const { r, g, b } = hexARgb(hex)
  const a = Math.round(Math.min(1, Math.max(0, alfa)) * 1000) / 1000
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`
}
