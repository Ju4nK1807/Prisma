import { useState } from 'react'
import { useAvisos } from '../controles/Avisos'
import { Dialogo } from '../controles/Dialogo'
import { IconoExterno } from '../controles/Iconos'
import { CALIDADES, guardarCalidadIA, leerCalidadIA } from '../estado/ia'
import { plataforma } from '../plataforma'

interface Props {
  tieneClave: boolean
  alCerrar: () => void
  alCambiar: (tieneClave: boolean) => void
}

export function DialogoClave({ tieneClave, alCerrar, alCambiar }: Props) {
  const { avisar } = useAvisos()
  const [clave, setClave] = useState('')
  const [comprobando, setComprobando] = useState(false)
  const [error, setError] = useState('')
  const [calidad, setCalidad] = useState(leerCalidadIA)

  const guardar = async () => {
    if (!plataforma) return
    setComprobando(true)
    setError('')
    const resultado = await plataforma.ia.guardarClave(clave)
    setComprobando(false)
    if (!resultado.ok) {
      setError(resultado.error)
      return
    }
    alCambiar(true)
    avisar('Clave comprobada y guardada')
    alCerrar()
  }

  const borrar = async () => {
    await plataforma?.ia.borrarClave()
    alCambiar(false)
    avisar('Clave borrada de este equipo')
  }

  return (
    <Dialogo titulo="Ajustes de IA" alCerrar={alCerrar}>
      <div className="dialogo-formulario">
        <p>
          Para recrear páginas a partir de capturas o bocetos, Prisma usa Claude, la inteligencia artificial de Anthropic.
          Necesitas una clave de API de tu cuenta de Anthropic; cada página generada tiene un pequeño costo en esa cuenta.
        </p>
        <span className="campo-etiqueta">Calidad de las páginas</span>
        <div className="calidades" role="radiogroup" aria-label="Calidad de las páginas">
          {CALIDADES.map((opcion) => (
            <button
              key={opcion.valor}
              role="radio"
              aria-checked={calidad === opcion.valor}
              className={`calidad ${calidad === opcion.valor ? 'activa' : ''}`}
              onClick={() => {
                setCalidad(opcion.valor)
                guardarCalidadIA(opcion.valor)
              }}
            >
              <strong>{opcion.nombre}</strong>
              <span>{opcion.detalle}</span>
            </button>
          ))}
        </div>
        {tieneClave && <p className="estado-contraste">Tu clave ya está guardada en este equipo.</p>}
        <button className="enlace" onClick={() => void plataforma?.abrirEnlace('https://console.anthropic.com/settings/keys')}>
          Conseguir una clave en console.anthropic.com <IconoExterno tamano={13} />
        </button>
        <label className="campo-etiqueta" htmlFor="clave-api">
          {tieneClave ? 'Reemplazar la clave guardada' : 'Clave de API'}
        </label>
        <input
          id="clave-api"
          className="campo"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-ant-…"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && clave.trim()) void guardar()
          }}
        />
        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}
        <p className="tenue pequeno">Se guarda cifrada en este equipo y solo se usa para hablar con Anthropic.</p>
        <div className="dialogo-acciones">
          {tieneClave && (
            <button className="boton boton--fantasma" onClick={() => void borrar()}>
              Borrar clave guardada
            </button>
          )}
          <button className="boton boton--primario" disabled={!clave.trim() || comprobando} onClick={() => void guardar()}>
            {comprobando ? 'Comprobando…' : 'Guardar clave'}
          </button>
        </div>
      </div>
    </Dialogo>
  )
}
