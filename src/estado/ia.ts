import { useCallback, useEffect, useState } from 'react'
import type { CalidadIA } from '../../electron/compartido'
import { plataforma } from '../plataforma'

export const CALIDADES: { valor: CalidadIA; nombre: string; detalle: string }[] = [
  { valor: 'alta', nombre: 'Alta', detalle: 'Claude Opus · el mejor resultado · ~0,15 a 0,35 US$ por página' },
  { valor: 'equilibrada', nombre: 'Equilibrada', detalle: 'Claude Sonnet · casi igual de buena · ~0,08 a 0,18 US$ por página' },
  { valor: 'economica', nombre: 'Económica', detalle: 'Claude Haiku · más sencilla · menos de 1 centavo por página' },
]

const CLAVE_CALIDAD = 'prisma:calidad-ia'

export function leerCalidadIA(): CalidadIA {
  try {
    const valor = localStorage.getItem(CLAVE_CALIDAD)
    return CALIDADES.find((c) => c.valor === valor)?.valor ?? 'equilibrada'
  } catch {
    return 'equilibrada'
  }
}

export function guardarCalidadIA(calidad: CalidadIA): void {
  try {
    localStorage.setItem(CLAVE_CALIDAD, calidad)
  } catch {
    // Sin almacenamiento: se usará la calidad por defecto la próxima vez
  }
}

export interface GeneracionIA {
  activa: boolean
  caracteres: number
  ejecutar: <T>(tarea: () => Promise<T>) => Promise<T>
  cancelar: () => void
}

/** Estado de una petición a la IA en curso: muestra el progreso y permite cancelarla. */
export function useGeneracionIA(): GeneracionIA {
  const [activa, setActiva] = useState(false)
  const [caracteres, setCaracteres] = useState(0)

  useEffect(() => plataforma?.ia.alProgreso(setCaracteres), [])

  const ejecutar = useCallback(async <T,>(tarea: () => Promise<T>): Promise<T> => {
    setCaracteres(0)
    setActiva(true)
    try {
      return await tarea()
    } finally {
      setActiva(false)
    }
  }, [])

  const cancelar = useCallback(() => {
    void plataforma?.ia.cancelar()
  }, [])

  return { activa, caracteres, ejecutar, cancelar }
}
