import { normalizarHex } from '../logica/color'
import type { IdPlantilla, Portada, UsoImagen } from '../logica/plantillas'
import { asignacionInicial, type Asignacion, type Densidad, type Esquinas, type IdFuentes, type Modo } from '../logica/tema'

export type Origen = 'plantilla' | 'ia'

export interface ImagenProyecto {
  dataUrl: string
  nombre: string
  esLogo?: boolean
}

/** Todo lo que define la página. Es la única fuente de verdad del editor. */
export interface Proyecto {
  origen: Origen
  imagen: ImagenProyecto | null
  paleta: string[]
  plantilla: IdPlantilla
  portada: Portada
  usoImagen: UsoImagen
  // null en una página de IA significa "conservar los colores que eligió la IA"
  colores: Asignacion | null
  modo: Modo
  fuentes: IdFuentes | null
  esquinas: Esquinas | null
  densidad: Densidad | null
  textos: Record<string, string>
  htmlIA: string | null
}

export const PALETA_POR_DEFECTO = ['#f4efe6', '#2f5fd0', '#e0794a', '#1f2a37', '#8fb8a8']

export function proyectoDePlantilla(plantilla: IdPlantilla, imagen: ImagenProyecto | null, paleta: string[]): Proyecto {
  const colores = paleta.length > 0 ? paleta : PALETA_POR_DEFECTO
  return {
    origen: 'plantilla',
    imagen,
    paleta: colores,
    plantilla,
    portada: 'dividida',
    usoImagen: imagen ? (imagen.esLogo ? 'logo' : 'portada') : 'ninguno',
    colores: asignacionInicial(colores.map((hex, i) => ({ hex, peso: 1 / (i + 1) }))),
    modo: 'claro',
    fuentes: 'moderna',
    esquinas: 'suaves',
    densidad: 'normal',
    textos: {},
    htmlIA: null,
  }
}

export function proyectoDeIA(html: string, imagen: ImagenProyecto | null, paleta: string[]): Proyecto {
  return {
    ...proyectoDePlantilla('negocio', imagen, paleta),
    origen: 'ia',
    usoImagen: 'ninguno',
    colores: null,
    fuentes: null,
    esquinas: null,
    densidad: null,
    htmlIA: html,
  }
}

// --- Persistencia local: el trabajo sobrevive a cerrar la app ---

const CLAVE = 'prisma:proyecto-v2'

type Registro = Record<string, unknown>
const esRegistro = (v: unknown): v is Registro => typeof v === 'object' && v !== null && !Array.isArray(v)

function opcion<T extends string>(valor: unknown, opciones: readonly T[], porDefecto: T): T {
  return opciones.find((o) => o === valor) ?? porDefecto
}

function opcionNula<T extends string>(valor: unknown, opciones: readonly T[]): T | null {
  return opciones.find((o) => o === valor) ?? null
}

function leerAsignacion(valor: unknown): Asignacion | null {
  if (!esRegistro(valor)) return null
  const fondo = typeof valor.fondo === 'string' ? normalizarHex(valor.fondo) : null
  const primario = typeof valor.primario === 'string' ? normalizarHex(valor.primario) : null
  const acento = typeof valor.acento === 'string' ? normalizarHex(valor.acento) : null
  return fondo && primario && acento ? { fondo, primario, acento } : null
}

export function validarProyecto(datos: unknown): Proyecto | null {
  if (!esRegistro(datos)) return null
  const origen = opcion(datos.origen, ['plantilla', 'ia'] as const, 'plantilla')
  const htmlIA = typeof datos.htmlIA === 'string' ? datos.htmlIA : null
  if (origen === 'ia' && !htmlIA) return null

  const imagen =
    esRegistro(datos.imagen) && typeof datos.imagen.dataUrl === 'string' && datos.imagen.dataUrl.startsWith('data:image/')
      ? {
          dataUrl: datos.imagen.dataUrl,
          nombre: typeof datos.imagen.nombre === 'string' ? datos.imagen.nombre : 'imagen',
          esLogo: datos.imagen.esLogo === true,
        }
      : null
  const paleta = Array.isArray(datos.paleta)
    ? datos.paleta.flatMap((c) => (typeof c === 'string' && normalizarHex(c) ? [normalizarHex(c) as string] : []))
    : []
  const textos: Record<string, string> = {}
  if (esRegistro(datos.textos)) {
    for (const [id, texto] of Object.entries(datos.textos)) if (typeof texto === 'string') textos[id] = texto
  }

  return {
    origen,
    imagen,
    paleta: paleta.length > 0 ? paleta : PALETA_POR_DEFECTO,
    plantilla: opcion(datos.plantilla, ['negocio', 'portafolio', 'restaurante', 'evento'] as const, 'negocio'),
    portada: opcion(datos.portada, ['dividida', 'fondo', 'centrada'] as const, 'dividida'),
    usoImagen: opcion(datos.usoImagen, ['portada', 'logo', 'ninguno'] as const, 'ninguno'),
    colores: leerAsignacion(datos.colores),
    modo: opcion(datos.modo, ['claro', 'oscuro'] as const, 'claro'),
    fuentes: opcionNula(datos.fuentes, ['moderna', 'elegante', 'editorial', 'tecnica', 'amigable', 'clasica'] as const),
    esquinas: opcionNula(datos.esquinas, ['rectas', 'suaves', 'redondas'] as const),
    densidad: opcionNula(datos.densidad, ['compacta', 'normal', 'amplia'] as const),
    textos,
    htmlIA,
  }
}

// Cada cuenta guarda su propia página
const claveDe = (usuario: string) => `${CLAVE}:${usuario}`

export function leerProyectoGuardado(usuario: string): Proyecto | null {
  try {
    const texto = localStorage.getItem(claveDe(usuario))
    return texto ? validarProyecto(JSON.parse(texto)) : null
  } catch {
    return null
  }
}

export function guardarProyectoLocal(usuario: string, proyecto: Proyecto | null): void {
  try {
    if (proyecto) localStorage.setItem(claveDe(usuario), JSON.stringify(proyecto))
    else localStorage.removeItem(claveDe(usuario))
  } catch {
    // Sin espacio (una imagen enorme, por ejemplo): la sesión sigue, solo no se recuerda
  }
}

/** La página guardada antes de que existieran las cuentas pasa a la primera cuenta que entra. */
export function adoptarProyectoAnterior(usuario: string): void {
  try {
    const anterior = localStorage.getItem(CLAVE)
    if (!anterior) return
    if (!localStorage.getItem(claveDe(usuario))) localStorage.setItem(claveDe(usuario), anterior)
    localStorage.removeItem(CLAVE)
  } catch {
    // Si no se puede mover, la página anterior simplemente no se recupera
  }
}
