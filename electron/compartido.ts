// Contrato IPC entre el proceso principal, el preload y la interfaz

export const CANALES = {
  version: 'app:version',
  guardarArchivo: 'archivo:guardar',
  abrirArchivo: 'archivo:abrir-con-sistema',
  copiarTexto: 'portapapeles:escribir',
  abrirEnlace: 'enlace:abrir',
  accionMenu: 'menu:accion',
  iaEstado: 'ia:estado',
  iaGuardarClave: 'ia:guardar-clave',
  iaBorrarClave: 'ia:borrar-clave',
  iaGenerar: 'ia:generar',
  iaModificar: 'ia:modificar',
  iaCancelar: 'ia:cancelar',
  iaObjetos: 'ia:objetos',
  iaProgreso: 'ia:progreso',
} as const

export interface FiltroArchivo {
  name: string
  extensions: string[]
}

export interface OpcionesGuardar {
  contenido: string
  nombreSugerido: string
  filtros: FiltroArchivo[]
  titulo?: string
  // Carpeta (dentro de Documentos) que se crea y propone para guardar el archivo
  carpeta?: string
}

export type AccionMenu = 'nuevo' | 'exportar' | 'deshacer' | 'rehacer'

export type ResultadoIA = { ok: true; html: string } | { ok: false; error: string; cancelado?: boolean }

export type ResultadoClave = { ok: true } | { ok: false; error: string }

// Calidad elegida por el usuario en Ajustes de IA; cada una corresponde a un modelo de Claude
export type CalidadIA = 'alta' | 'equilibrada' | 'economica'

export interface PeticionGenerar {
  datos: string
  tipo: 'image/png' | 'image/jpeg'
  indicaciones: string
  calidad: CalidadIA
}

export interface PeticionObjetos {
  // De qué trata la página: título y primeros textos
  descripcion: string
  cantidad: number
  calidad: CalidadIA
}

export interface ObjetoGenerado {
  nombre: string
  svg: string
}

export type ResultadoObjetos = { ok: true; objetos: ObjetoGenerado[] } | { ok: false; error: string; cancelado?: boolean }

export interface PeticionModificar {
  html: string
  peticion: string
  calidad: CalidadIA
}
