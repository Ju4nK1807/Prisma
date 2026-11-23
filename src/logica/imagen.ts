import { completarPaleta, extraerPaleta, muestrearImagen, type ColorPaleta } from './paleta'

export const TIPOS_ACEPTADOS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const LADO_MAXIMO = 1600
// Tamaño máximo recomendado para que la IA vea la imagen sin reescalarla
const LADO_MAXIMO_IA = 1568

export interface ImagenCargada {
  dataUrl: string
  nombre: string
  paleta: ColorPaleta[]
  // Las imágenes con transparencia casi siempre son logos
  esLogo: boolean
}

function cargarElemento(src: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const imagen = new Image()
    imagen.onload = () => resolver(imagen)
    imagen.onerror = () => rechazar(new Error('No se pudo leer la imagen'))
    imagen.src = src
  })
}

function leerComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => (typeof lector.result === 'string' ? resolver(lector.result) : rechazar(new Error('Lectura vacía')))
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo'))
    lector.readAsDataURL(archivo)
  })
}

function tieneTransparencia(imagen: HTMLImageElement): boolean {
  const datos = muestrearImagen(imagen, 48)
  for (let i = 3; i < datos.length; i += 4) if (datos[i] < 250) return true
  return false
}

function reescalar(imagen: HTMLImageElement, lado: number, transparente: boolean): string {
  const escala = Math.min(1, lado / Math.max(imagen.naturalWidth, imagen.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(imagen.naturalWidth * escala))
  canvas.height = Math.max(1, Math.round(imagen.naturalHeight * escala))
  const contexto = canvas.getContext('2d')
  if (!contexto) return imagen.src
  if (!transparente) {
    contexto.fillStyle = '#ffffff'
    contexto.fillRect(0, 0, canvas.width, canvas.height)
  }
  contexto.imageSmoothingQuality = 'high'
  contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height)
  // Los logos con transparencia se guardan en PNG; las fotos, en JPEG para que pesen poco
  return transparente ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.86)
}

/** Lee un archivo de imagen, lo reduce a un tamaño razonable y extrae su paleta. */
export async function cargarImagen(archivo: File): Promise<ImagenCargada> {
  if (!TIPOS_ACEPTADOS.includes(archivo.type)) throw new Error('Formato no admitido. Usa PNG, JPG, WEBP o GIF.')
  const original = await cargarElemento(await leerComoDataUrl(archivo))
  const transparente = archivo.type !== 'image/jpeg' && tieneTransparencia(original)
  const dataUrl = reescalar(original, LADO_MAXIMO, transparente)
  const paleta = completarPaleta(extraerPaleta(muestrearImagen(original)))
  return { dataUrl, nombre: archivo.name.replace(/\.[^.]+$/, ''), paleta, esLogo: transparente }
}

/** Imagen en base64 lista para enviarla a la IA. */
export async function prepararParaIA(dataUrl: string): Promise<{ datos: string; tipo: 'image/png' | 'image/jpeg' }> {
  const imagen = await cargarElemento(dataUrl)
  const reducida = reescalar(imagen, LADO_MAXIMO_IA, false)
  return { datos: reducida.slice(reducida.indexOf(',') + 1), tipo: 'image/jpeg' }
}
