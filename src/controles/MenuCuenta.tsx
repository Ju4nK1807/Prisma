import { useEffect, useRef, useState } from 'react'
import { iniciales, type Cuenta } from '../estado/cuentas'

interface Props {
  cuenta: Cuenta
  alCerrarSesion: () => void
}

/** Avatar con las iniciales de la cuenta y un menú para cerrar sesión. */
export function MenuCuenta({ cuenta, alCerrarSesion }: Props) {
  const [abierto, setAbierto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => {
      if (raiz.current && e.target instanceof Node && !raiz.current.contains(e.target)) setAbierto(false)
    }
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    window.addEventListener('pointerdown', fuera)
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('pointerdown', fuera)
      window.removeEventListener('keydown', escape)
    }
  }, [abierto])

  return (
    <div className="menu-cuenta" ref={raiz}>
      <button
        className="avatar-cuenta"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Cuenta de ${cuenta.nombre}`}
        title={cuenta.nombre}
      >
        {iniciales(cuenta.nombre)}
      </button>
      {abierto && (
        <div className="menu-cuenta-lista" role="menu">
          <div className="menu-cuenta-datos">
            <strong>{cuenta.nombre}</strong>
            <span>{cuenta.correo}</span>
          </div>
          <button role="menuitem" className="menu-cuenta-salir" onClick={alCerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
