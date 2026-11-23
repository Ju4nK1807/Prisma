import { hexAOklch, oklchAHex } from './color'
import { ajustarContraste, mejorTextoSobre, razonContraste } from './contraste'
import { diferenciaColor, type ColorPaleta } from './paleta'

export type Modo = 'claro' | 'oscuro'
export type Esquinas = 'rectas' | 'suaves' | 'redondas'
export type Densidad = 'compacta' | 'normal' | 'amplia'
export type IdFuentes = 'moderna' | 'elegante' | 'editorial' | 'tecnica' | 'amigable' | 'clasica'

/** Qué color de la paleta cumple cada papel en la página. */
export interface Asignacion {
  fondo: string
  primario: string
  acento: string
}

export interface Tema {
  fondo: string
  superficie: string
  superficieAlt: string
  borde: string
  texto: string
  textoSuave: string
  primario: string
  primarioHover: string
  sobrePrimario: string
  primarioTexto: string
  acento: string
  sobreAcento: string
  acentoSuave: string
}

export interface ParFuentes {
  id: IdFuentes
  nombre: string
  titulos: string
  texto: string
  pesoTitulos: number
}

const INTER = '"Inter Variable", "Segoe UI", system-ui, sans-serif'
const SISTEMA = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

export const PARES_FUENTES: ParFuentes[] = [
  { id: 'moderna', nombre: 'Moderna', titulos: INTER, texto: INTER, pesoTitulos: 700 },
  { id: 'elegante', nombre: 'Elegante', titulos: 'Georgia, "Times New Roman", serif', texto: INTER, pesoTitulos: 600 },
  {
    id: 'editorial',
    nombre: 'Editorial',
    titulos: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
    texto: SISTEMA,
    pesoTitulos: 700,
  },
  { id: 'tecnica', nombre: 'Técnica', titulos: '"JetBrains Mono Variable", Consolas, monospace', texto: INTER, pesoTitulos: 650 },
  {
    id: 'amigable',
    nombre: 'Amigable',
    titulos: '"Trebuchet MS", "Segoe UI", sans-serif',
    texto: '"Segoe UI", system-ui, sans-serif',
    pesoTitulos: 700,
  },
  { id: 'clasica', nombre: 'Clásica', titulos: 'Georgia, serif', texto: 'Georgia, serif', pesoTitulos: 700 },
]

const RADIOS: Record<Esquinas, { radio: string; boton: string }> = {
  rectas: { radio: '0px', boton: '0px' },
  suaves: { radio: '12px', boton: '8px' },
  redondas: { radio: '24px', boton: '999px' },
}

const ESPACIO: Record<Densidad, string> = { compacta: '0.7', normal: '1', amplia: '1.3' }

const BLANCO = '#ffffff'

function tono(hex: string, l: number, cromaMaxima: number, factor = 1): string {
  const { c, h } = hexAOklch(hex)
  return oklchAHex({ l, c: Math.min(c * factor, cromaMaxima), h })
}

function desplazar(hex: string, delta: number): string {
  const color = hexAOklch(hex)
  return oklchAHex({ ...color, l: Math.min(0.98, Math.max(0.05, color.l + delta)) })
}

/**
 * Deriva todos los colores de la página a partir de tres colores de la paleta.
 * El fondo solo aporta su tono (se aclara u oscurece mucho para que el texto se lea);
 * primario y acento se ajustan lo justo para alcanzar el contraste necesario.
 */
export function derivarTema({ fondo, primario, acento }: Asignacion, modo: Modo): Tema {
  const claro = modo === 'claro'
  const baseFondo = claro ? tono(fondo, 0.985, 0.012, 0.25) : tono(fondo, 0.17, 0.02, 0.3)
  const superficie = claro ? tono(fondo, 0.955, 0.02, 0.35) : tono(fondo, 0.21, 0.025, 0.35)
  const superficieAlt = claro ? tono(fondo, 0.925, 0.025, 0.4) : tono(fondo, 0.26, 0.03, 0.4)
  const borde = claro ? tono(fondo, 0.88, 0.025, 0.4) : tono(fondo, 0.33, 0.03, 0.4)
  const texto = claro ? tono(fondo, 0.2, 0.03, 0.3) : tono(fondo, 0.96, 0.012, 0.2)
  const textoSuave = ajustarContraste(claro ? tono(fondo, 0.45, 0.03, 0.3) : tono(fondo, 0.76, 0.03, 0.3), baseFondo, 4.5)

  // El primario debe destacar sobre el fondo; en botones lleva texto blanco u oscuro
  const primarioBase = ajustarContraste(primario, baseFondo, 3)
  const primarioHover = desplazar(primarioBase, claro ? -0.07 : 0.07)
  const acentoBase = ajustarContraste(acento, baseFondo, 3)

  return {
    fondo: baseFondo,
    superficie,
    superficieAlt,
    borde,
    texto,
    textoSuave,
    primario: primarioBase,
    primarioHover,
    sobrePrimario: mejorTextoSobre(primarioBase, BLANCO, texto),
    primarioTexto: ajustarContraste(primarioBase, baseFondo, 4.5),
    acento: acentoBase,
    sobreAcento: mejorTextoSobre(acentoBase, BLANCO, texto),
    acentoSuave: claro ? tono(acento, 0.94, 0.05, 0.5) : tono(acento, 0.3, 0.07, 0.6),
  }
}

export interface Estilo {
  fuentes: IdFuentes | null
  esquinas: Esquinas | null
  densidad: Densidad | null
}

/** Bloque :root con las variables que la plantilla (o la página generada por IA) consume. */
export function variablesCss(tema: Tema | null, estilo: Estilo): string {
  const lineas: string[] = []
  if (tema) {
    lineas.push(
      `--color-fondo: ${tema.fondo}`,
      `--color-superficie: ${tema.superficie}`,
      `--color-superficie-alt: ${tema.superficieAlt}`,
      `--color-borde: ${tema.borde}`,
      `--color-texto: ${tema.texto}`,
      `--color-texto-suave: ${tema.textoSuave}`,
      `--color-primario: ${tema.primario}`,
      `--color-primario-hover: ${tema.primarioHover}`,
      `--color-sobre-primario: ${tema.sobrePrimario}`,
      `--color-primario-texto: ${tema.primarioTexto}`,
      `--color-acento: ${tema.acento}`,
      `--color-sobre-acento: ${tema.sobreAcento}`,
      `--color-acento-suave: ${tema.acentoSuave}`,
    )
  }
  const par = PARES_FUENTES.find((p) => p.id === estilo.fuentes)
  if (par) {
    lineas.push(`--fuente-titulos: ${par.titulos}`, `--fuente-texto: ${par.texto}`, `--peso-titulos: ${par.pesoTitulos}`)
  }
  if (estilo.esquinas) {
    lineas.push(`--radio: ${RADIOS[estilo.esquinas].radio}`, `--radio-boton: ${RADIOS[estilo.esquinas].boton}`)
  }
  if (estilo.densidad) lineas.push(`--espacio: ${ESPACIO[estilo.densidad]}`)
  if (lineas.length === 0) return ''
  return `:root {\n  ${lineas.join(';\n  ')};\n}`
}

const croma = (hex: string) => hexAOklch(hex).c

/** Elige la distribución inicial: el color más vivo como primario, el más distinto como acento. */
export function asignacionInicial(paleta: ColorPaleta[]): Asignacion {
  const colores = paleta.length > 0 ? paleta : [{ hex: '#3b6cf6', peso: 1 }]
  const vivos = [...colores].sort((x, y) => croma(y.hex) * Math.sqrt(y.peso + 0.05) - croma(x.hex) * Math.sqrt(x.peso + 0.05))
  const primario = vivos[0].hex
  const acento =
    [...colores]
      .filter((c) => c.hex !== primario && croma(c.hex) > 0.04)
      .sort((x, y) => diferenciaColor(y.hex, primario) - diferenciaColor(x.hex, primario))[0]?.hex ??
    oklchAHex({ ...hexAOklch(primario), h: (hexAOklch(primario).h + 150) % 360 })
  const fondo = colores[0].hex
  return { fondo, primario, acento }
}

/**
 * Todas las distribuciones razonables de la paleta, de mejor a peor. "Mezclar colores"
 * recorre esta lista. Se descartan las que dejan primario y acento casi iguales o con
 * poco color.
 */
export function distribuciones(paleta: string[]): Asignacion[] {
  const resultado: { asignacion: Asignacion; puntos: number }[] = []
  for (const primario of paleta) {
    if (croma(primario) < 0.035) continue
    for (const acento of paleta) {
      if (acento === primario || diferenciaColor(primario, acento) < 0.08) continue
      for (const fondo of paleta) {
        const puntos =
          croma(primario) * 2 + diferenciaColor(primario, acento) + (fondo === primario ? 0.05 : 0) - croma(fondo) * 0.5
        resultado.push({ asignacion: { fondo, primario, acento }, puntos })
      }
    }
  }
  return resultado.sort((x, y) => y.puntos - x.puntos).map((r) => r.asignacion)
}

export function mismaAsignacion(x: Asignacion, y: Asignacion): boolean {
  return x.fondo === y.fondo && x.primario === y.primario && x.acento === y.acento
}

/** Indica si el texto principal y los botones de un tema se leen bien (WCAG AA). */
export function temaLegible(tema: Tema): boolean {
  return (
    razonContraste(tema.texto, tema.fondo) >= 4.5 &&
    razonContraste(tema.sobrePrimario, tema.primario) >= 4.5 &&
    razonContraste(tema.textoSuave, tema.fondo) >= 4.5
  )
}
