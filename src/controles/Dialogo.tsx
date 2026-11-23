import { useEffect, useRef, type ReactNode } from 'react'
import { IconoCerrar } from './Iconos'

interface Props {
  titulo: string
  alCerrar: () => void
  children: ReactNode
}

export function Dialogo({ titulo, alCerrar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = ref.current
    if (dialogo && !dialogo.open) dialogo.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="dialogo"
      aria-label={titulo}
      onClose={alCerrar}
      onClick={(e) => {
        if (e.target === e.currentTarget) alCerrar()
      }}
    >
      <div className="dialogo-cabecera">
        <h2>{titulo}</h2>
        <button className="boton-icono" aria-label="Cerrar" onClick={alCerrar}>
          <IconoCerrar />
        </button>
      </div>
      <div className="dialogo-cuerpo">{children}</div>
    </dialog>
  )
}
