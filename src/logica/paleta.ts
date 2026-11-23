import { hexAOklch, normalizarHex, oklchAHex, rgbAOklch } from './color'

export interface ColorPaleta {
  hex: string
  // Proporción de píxeles de la imagen que pertenecen a este grupo (0 a 1)
  peso: number
}

interface PuntoLab {
  l: number
  a: number
  b: number
}

const aLab = (r: number, g: number, b: number): PuntoLab => {
  const { l, c, h } = rgbAOklch({ r: r / 255, g: g / 255, b: b / 255 })
  const rad = (h * Math.PI) / 180
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) }
}

const desdeLab = ({ l, a, b }: PuntoLab): string => {
  const c = Math.sqrt(a * a + b * b)
  let h = (Math.atan2(b, a) * 180) / Math.PI
  if (h < 0) h += 360
  return oklchAHex({ l, c, h })
}

const distancia = (p: PuntoLab, q: PuntoLab) => (p.l - q.l) ** 2 + (p.a - q.a) ** 2 + (p.b - q.b) ** 2

/** Diferencia perceptual entre dos colores hex (distancia euclídea en OKLab). */
export function diferenciaColor(x: string, y: string): number {
  const p = hexAOklch(x)
  const q = hexAOklch(y)
  const pa = aLabDesdeOklch(p.l, p.c, p.h)
  const qa = aLabDesdeOklch(q.l, q.c, q.h)
  return Math.sqrt(distancia(pa, qa))
}

function aLabDesdeOklch(l: number, c: number, h: number): PuntoLab {
  const rad = (h * Math.PI) / 180
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) }
}

/**
 * Agrupa los píxeles de una imagen en colores dominantes con k-means en OKLab.
 * Recibe los datos RGBA de un canvas pequeño (basta con unos 100×100 px).
 * La inicialización es determinista (punto más lejano), así la misma imagen da siempre
 * la misma paleta.
 */
export function extraerPaleta(datos: Uint8ClampedArray, cantidad = 6): ColorPaleta[] {
  const puntos: PuntoLab[] = []
  for (let i = 0; i < datos.length; i += 4) {
    if (datos[i + 3] < 128) continue
    puntos.push(aLab(datos[i], datos[i + 1], datos[i + 2]))
  }
  if (puntos.length === 0) return []

  const k = Math.min(cantidad, puntos.length)
  const centros: PuntoLab[] = [puntos[Math.floor(puntos.length / 2)]]
  while (centros.length < k) {
    let mejor = puntos[0]
    let mejorDistancia = -1
    for (const p of puntos) {
      const d = Math.min(...centros.map((c) => distancia(p, c)))
      if (d > mejorDistancia) {
        mejorDistancia = d
        mejor = p
      }
    }
    centros.push(mejor)
  }

  const asignacion = new Array<number>(puntos.length).fill(0)
  for (let iteracion = 0; iteracion < 12; iteracion++) {
    puntos.forEach((p, i) => {
      let mejor = 0
      let mejorDistancia = Infinity
      centros.forEach((c, j) => {
        const d = distancia(p, c)
        if (d < mejorDistancia) {
          mejorDistancia = d
          mejor = j
        }
      })
      asignacion[i] = mejor
    })
    centros.forEach((_, j) => {
      let l = 0
      let a = 0
      let b = 0
      let n = 0
      puntos.forEach((p, i) => {
        if (asignacion[i] !== j) return
        l += p.l
        a += p.a
        b += p.b
        n++
      })
      if (n > 0) centros[j] = { l: l / n, a: a / n, b: b / n }
    })
  }

  const conteo = new Array<number>(k).fill(0)
  asignacion.forEach((j) => conteo[j]++)

  const colores = centros
    .map((c, j) => ({ hex: desdeLab(c), peso: conteo[j] / puntos.length, lab: c }))
    .filter((c) => c.peso > 0.005)
    .sort((x, y) => y.peso - x.peso)

  // Fusiona los colores casi idénticos que el k-means separó por matices mínimos
  const unicos: typeof colores = []
  for (const color of colores) {
    const parecido = unicos.find((u) => distancia(u.lab, color.lab) < 0.0016)
    if (parecido) parecido.peso += color.peso
    else unicos.push(color)
  }
  return unicos.map(({ hex, peso }) => ({ hex, peso }))
}

/**
 * Garantiza una paleta utilizable: si la imagen es casi gris (un logo en blanco y negro,
 * por ejemplo) añade dos colores derivados del tono dominante para tener primario y acento.
 */
export function completarPaleta(paleta: ColorPaleta[]): ColorPaleta[] {
  const resultado = [...paleta]
  const conColor = resultado.filter((c) => hexAOklch(c.hex).c > 0.06)
  if (conColor.length >= 2) return resultado

  const base = conColor[0] ?? resultado[0]
  const tono = base ? hexAOklch(base.hex).h : 255
  const tieneTono = base ? hexAOklch(base.hex).c > 0.02 : false
  const tonoPrincipal = tieneTono ? tono : 255
  if (conColor.length === 0) resultado.push({ hex: oklchAHex({ l: 0.55, c: 0.16, h: tonoPrincipal }), peso: 0 })
  resultado.push({ hex: oklchAHex({ l: 0.68, c: 0.15, h: (tonoPrincipal + 150) % 360 }), peso: 0 })
  return resultado
}

/** Reduce una imagen a sus datos RGBA en un canvas de lado máximo `lado`. */
export function muestrearImagen(imagen: HTMLImageElement, lado = 96): Uint8ClampedArray {
  const escala = Math.min(1, lado / Math.max(imagen.naturalWidth, imagen.naturalHeight))
  const ancho = Math.max(1, Math.round(imagen.naturalWidth * escala))
  const alto = Math.max(1, Math.round(imagen.naturalHeight * escala))
  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const contexto = canvas.getContext('2d', { willReadFrequently: true })
  if (!contexto) return new Uint8ClampedArray()
  contexto.drawImage(imagen, 0, 0, ancho, alto)
  return contexto.getImageData(0, 0, ancho, alto).data
}

export function hexesUnicos(lista: string[]): string[] {
  const vistos: string[] = []
  for (const valor of lista) {
    const hex = normalizarHex(valor)
    if (hex && !vistos.some((v) => diferenciaColor(v, hex) < 0.03)) vistos.push(hex)
  }
  return vistos
}
