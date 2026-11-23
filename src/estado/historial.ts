import { useCallback, useMemo, useReducer } from 'react'

export const LIMITE_HISTORIAL = 50
// Cambios consecutivos del mismo grupo dentro de esta ventana cuentan como un solo paso
const VENTANA_AGRUPACION_MS = 1000

interface EstadoHistorial<T> {
  pasado: T[]
  presente: T
  futuro: T[]
  grupo: string | null
  // Un gesto (arrastrar un deslizador) mantiene el grupo abierto hasta cerrarGrupo()
  gestoAbierto: boolean
  marca: number
}

type Accion<T> =
  | { tipo: 'aplicar'; cambio: (actual: T) => T; grupo: string | null; gesto: boolean; marca: number }
  | { tipo: 'cerrarGrupo' }
  | { tipo: 'deshacer' }
  | { tipo: 'rehacer' }
  | { tipo: 'reiniciar'; valor: T }

function reductor<T>(estado: EstadoHistorial<T>, accion: Accion<T>): EstadoHistorial<T> {
  switch (accion.tipo) {
    case 'aplicar': {
      const siguiente = accion.cambio(estado.presente)
      if (Object.is(siguiente, estado.presente)) return estado
      const agrupa =
        accion.grupo !== null &&
        accion.grupo === estado.grupo &&
        (estado.gestoAbierto || accion.marca - estado.marca < VENTANA_AGRUPACION_MS)
      if (agrupa) {
        return { ...estado, presente: siguiente, futuro: [], gestoAbierto: accion.gesto, marca: accion.marca }
      }
      return {
        pasado: [...estado.pasado, estado.presente].slice(-(LIMITE_HISTORIAL - 1)),
        presente: siguiente,
        futuro: [],
        grupo: accion.grupo,
        gestoAbierto: accion.gesto,
        marca: accion.marca,
      }
    }
    case 'cerrarGrupo':
      if (estado.grupo === null) return estado
      return { ...estado, grupo: null, gestoAbierto: false }
    case 'deshacer': {
      if (estado.pasado.length === 0) return estado
      const anterior = estado.pasado[estado.pasado.length - 1]
      return {
        pasado: estado.pasado.slice(0, -1),
        presente: anterior,
        futuro: [estado.presente, ...estado.futuro],
        grupo: null,
        gestoAbierto: false,
        marca: 0,
      }
    }
    case 'rehacer': {
      if (estado.futuro.length === 0) return estado
      const [siguiente, ...resto] = estado.futuro
      return {
        pasado: [...estado.pasado, estado.presente],
        presente: siguiente,
        futuro: resto,
        grupo: null,
        gestoAbierto: false,
        marca: 0,
      }
    }
    case 'reiniciar':
      return crearEstado(accion.valor)
  }
}

function crearEstado<T>(valor: T): EstadoHistorial<T> {
  return { pasado: [], presente: valor, futuro: [], grupo: null, gestoAbierto: false, marca: 0 }
}

export interface Historial<T> {
  presente: T
  puedeDeshacer: boolean
  puedeRehacer: boolean
  aplicar: (cambio: (actual: T) => T, grupo?: string, gesto?: boolean) => void
  cerrarGrupo: () => void
  deshacer: () => void
  rehacer: () => void
  reiniciar: (valor: T) => void
}

export function useHistorial<T>(inicial: T): Historial<T> {
  const [estado, despachar] = useReducer(reductor<T>, inicial, crearEstado<T>)

  const aplicar = useCallback(
    (cambio: (actual: T) => T, grupo?: string, gesto = false) =>
      despachar({ tipo: 'aplicar', cambio, grupo: grupo ?? null, gesto, marca: Date.now() }),
    [],
  )
  const cerrarGrupo = useCallback(() => despachar({ tipo: 'cerrarGrupo' }), [])
  const deshacer = useCallback(() => despachar({ tipo: 'deshacer' }), [])
  const rehacer = useCallback(() => despachar({ tipo: 'rehacer' }), [])
  const reiniciar = useCallback((valor: T) => despachar({ tipo: 'reiniciar', valor }), [])

  return useMemo(
    () => ({
      presente: estado.presente,
      puedeDeshacer: estado.pasado.length > 0,
      puedeRehacer: estado.futuro.length > 0,
      aplicar,
      cerrarGrupo,
      deshacer,
      rehacer,
      reiniciar,
    }),
    [estado, aplicar, cerrarGrupo, deshacer, rehacer, reiniciar],
  )
}
