import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { IconoCheck, IconoError } from './Iconos'

type TipoAviso = 'exito' | 'error'

interface Aviso {
  id: number
  texto: string
  tipo: TipoAviso
}

interface ContextoAvisos {
  avisar: (texto: string, tipo?: TipoAviso) => void
}

const Contexto = createContext<ContextoAvisos>({ avisar: () => undefined })

const DURACION_MS = 1800

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const siguienteId = useRef(0)

  const avisar = useCallback((texto: string, tipo: TipoAviso = 'exito') => {
    const id = ++siguienteId.current
    // Solo se muestran los tres más recientes
    setAvisos((actuales) => [...actuales.slice(-2), { id, texto, tipo }])
    window.setTimeout(() => setAvisos((actuales) => actuales.filter((a) => a.id !== id)), DURACION_MS)
  }, [])

  const valor = useMemo(() => ({ avisar }), [avisar])

  return (
    <Contexto.Provider value={valor}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((aviso) => (
          <div key={aviso.id} className={`aviso aviso--${aviso.tipo}`}>
            {aviso.tipo === 'exito' ? <IconoCheck /> : <IconoError />}
            <span>{aviso.texto}</span>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  )
}

export const useAvisos = () => useContext(Contexto)
