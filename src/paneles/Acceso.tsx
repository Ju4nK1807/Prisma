import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { IconoPrisma } from '../controles/Iconos'
import { correoValido, fuerzaContrasena, guardarSesion, hayCuentas, iniciarSesion, registrar, type Cuenta } from '../estado/cuentas'
import '../estilos/acceso.css'

interface Props {
  alEntrar: (cuenta: Cuenta) => void
}

type Modo = 'entrar' | 'registro'
type Campo = 'nombre' | 'correo' | 'contrasena'

const PALABRAS = ['tu logo', 'una foto', 'un boceto', 'una captura']
const NIVELES = ['', 'Débil', 'Aceptable', 'Buena', 'Excelente']
const COLORES_ESPECTRO = ['#ff5f6d', '#ff9a3c', '#ffd23f', '#3ddc97', '#4cc9f0', '#7b61ff']
// Cuánto dura la animación de salida antes de entrar a la app
const DURACION_SALIDA = 900

function OjoIcono({ abierto }: { abierto: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8Z" />
      <circle cx="8" cy="8" r="2" />
      {!abierto && <path d="M2.5 2.5l11 11" />}
    </svg>
  )
}

/** El logo de Prisma en movimiento: un rayo de luz entra y sale descompuesto en colores. */
function EscenaPrisma() {
  return (
    <svg className="escena-prisma" viewBox="0 0 640 420" aria-hidden="true">
      <defs>
        <linearGradient id="cara-izquierda" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8aa4ff" />
          <stop offset="1" stopColor="#4b63e8" />
        </linearGradient>
        <linearGradient id="cara-derecha" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b6ff0" />
          <stop offset="1" stopColor="#2f3fb8" />
        </linearGradient>
        <linearGradient id="brillo" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="resplandor" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="desenfoque" />
          <feMerge>
            <feMergeNode in="desenfoque" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="forma-prisma">
          <path d="M320 70 L215 330 L425 330 Z" />
        </clipPath>
      </defs>

      <path className="rayo-entrada" d="M10 268 L262 214" filter="url(#resplandor)" />

      {COLORES_ESPECTRO.map((color, i) => (
        <path
          key={color}
          className="rayo-salida"
          d={`M372 ${206 + i * 7} L640 ${120 + i * 38}`}
          stroke={color}
          filter="url(#resplandor)"
          style={{ '--retraso': `${0.6 + i * 0.12}s` } as CSSProperties}
        />
      ))}

      <g className="prisma-cuerpo">
        <path d="M320 70 L215 330 L340 330 Z" fill="url(#cara-izquierda)" />
        <path d="M320 70 L340 330 L425 330 Z" fill="url(#cara-derecha)" />
        <g clipPath="url(#forma-prisma)">
          <rect className="prisma-brillo" x="160" y="60" width="90" height="290" fill="url(#brillo)" />
        </g>
        <path d="M320 70 L215 330 L425 330 Z" fill="none" stroke="#c7d2ff" strokeWidth="3" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

export function Acceso({ alEntrar }: Props) {
  const [modo, setModo] = useState<Modo>(hayCuentas() ? 'entrar' : 'registro')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [recordar, setRecordar] = useState(true)
  const [error, setError] = useState<{ texto: string; campo?: Campo } | null>(null)
  const [temblando, setTemblando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const [palabra, setPalabra] = useState(0)
  const primerCampo = useRef<HTMLInputElement>(null)

  const fuerza = fuerzaContrasena(contrasena)

  useEffect(() => {
    const intervalo = window.setInterval(() => setPalabra((p) => (p + 1) % PALABRAS.length), 2400)
    return () => window.clearInterval(intervalo)
  }, [])

  useEffect(() => {
    setError(null)
    primerCampo.current?.focus()
  }, [modo])

  const fallar = (texto: string, campo?: Campo) => {
    setError({ texto, campo })
    // Se quita y se vuelve a poner la clase para que el temblor se repita en cada error
    setTemblando(false)
    requestAnimationFrame(() => setTemblando(true))
  }

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enviando || saliendo) return
    if (!correoValido(correo)) return fallar('Escribe un correo válido.', 'correo')
    if (!contrasena) return fallar('Escribe tu contraseña.', 'contrasena')
    setEnviando(true)
    setError(null)
    const resultado = modo === 'registro' ? await registrar(nombre, correo, contrasena) : await iniciarSesion(correo, contrasena)
    setEnviando(false)
    if (!resultado.ok) return fallar(resultado.error, resultado.campo)
    guardarSesion(resultado.cuenta, recordar)
    setSaliendo(true)
    window.setTimeout(() => alEntrar(resultado.cuenta), DURACION_SALIDA)
  }

  const claseCampo = (campo: Campo) => `acceso-campo ${error?.campo === campo ? 'acceso-campo--error' : ''}`

  return (
    <div className={`acceso ${saliendo ? 'acceso--saliendo' : ''}`}>
      <div className="acceso-fondo" aria-hidden="true">
        <span className="aurora aurora--1" />
        <span className="aurora aurora--2" />
        <span className="aurora aurora--3" />
        <span className="acceso-rejilla" />
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className={`flotante flotante--${i % 3}`}
            style={{ '--x': `${(i * 37) % 100}%`, '--retraso': `${-i * 1.7}s`, '--duracion': `${14 + (i % 5) * 3}s` } as CSSProperties}
          />
        ))}
      </div>

      <section className="acceso-escena">
        <EscenaPrisma />
        <h1 className="acceso-lema">
          Convierte{' '}
          <span className="acceso-palabra" key={palabra}>
            {PALABRAS[palabra]}
          </span>
          <br />
          en tu página web
        </h1>
        <p className="acceso-sublema">Sube una imagen, personalízala con unos clics y publícala. Sin saber programar.</p>
      </section>

      <section className="acceso-lado">
        <div
          className={`acceso-tarjeta ${temblando ? 'acceso-tarjeta--temblor' : ''}`}
          onAnimationEnd={(e) => e.animationName === 'acceso-temblor' && setTemblando(false)}
        >
          <div className="acceso-marca">
            <span className="acceso-logo">
              <IconoPrisma tamano={26} />
            </span>
            <div>
              <strong>Prisma</strong>
              <span>{modo === 'entrar' ? 'Qué bueno verte de nuevo' : 'Crea tu cuenta en segundos'}</span>
            </div>
          </div>

          <div className="acceso-pestanas" role="tablist" data-modo={modo}>
            <span className="acceso-pestanas-indicador" aria-hidden="true" />
            <button role="tab" aria-selected={modo === 'entrar'} onClick={() => setModo('entrar')}>
              Iniciar sesión
            </button>
            <button role="tab" aria-selected={modo === 'registro'} onClick={() => setModo('registro')}>
              Crear cuenta
            </button>
          </div>

          <form className="acceso-formulario" onSubmit={(e) => void enviar(e)} noValidate key={modo}>
            {modo === 'registro' && (
              <label className={claseCampo('nombre')} style={{ '--orden': 0 } as CSSProperties}>
                <input
                  ref={primerCampo}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder=" "
                  autoComplete="name"
                  maxLength={60}
                />
                <span>Tu nombre</span>
              </label>
            )}
            <label className={claseCampo('correo')} style={{ '--orden': 1 } as CSSProperties}>
              <input
                ref={modo === 'entrar' ? primerCampo : undefined}
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder=" "
                autoComplete="email"
                spellCheck={false}
              />
              <span>Correo electrónico</span>
            </label>
            <label className={claseCampo('contrasena')} style={{ '--orden': 2 } as CSSProperties}>
              <input
                type={verContrasena ? 'text' : 'password'}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder=" "
                autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
              />
              <span>Contraseña</span>
              <button
                type="button"
                className="acceso-ojo"
                onClick={() => setVerContrasena((v) => !v)}
                aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <OjoIcono abierto={verContrasena} />
              </button>
            </label>

            {modo === 'registro' ? (
              <div className="acceso-fuerza" data-nivel={fuerza} style={{ '--orden': 3 } as CSSProperties} aria-live="polite">
                <div className="acceso-fuerza-barras" aria-hidden="true">
                  {[1, 2, 3, 4].map((n) => (
                    <span key={n} />
                  ))}
                </div>
                <span>{contrasena ? `Seguridad: ${NIVELES[fuerza] || 'Muy débil'}` : 'Usa al menos 8 caracteres'}</span>
              </div>
            ) : (
              <label className="acceso-recordar" style={{ '--orden': 3 } as CSSProperties}>
                <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
                <span className="acceso-casilla" aria-hidden="true" />
                Mantener la sesión iniciada
              </label>
            )}

            {error && (
              <p className="acceso-error" role="alert">
                {error.texto}
              </p>
            )}

            <button type="submit" className="acceso-enviar" disabled={enviando || saliendo} style={{ '--orden': 4 } as CSSProperties}>
              <span className="acceso-enviar-brillo" aria-hidden="true" />
              {enviando ? <span className="acceso-cargando" aria-label="Comprobando" /> : modo === 'entrar' ? 'Entrar' : 'Crear mi cuenta'}
            </button>
          </form>

          <p className="acceso-cambio">
            {modo === 'entrar' ? '¿Aún no tienes cuenta?' : '¿Ya tienes una cuenta?'}{' '}
            <button type="button" onClick={() => setModo(modo === 'entrar' ? 'registro' : 'entrar')}>
              {modo === 'entrar' ? 'Créala gratis' : 'Inicia sesión'}
            </button>
          </p>
          <p className="acceso-nota">Tu cuenta y tus páginas se guardan solo en este equipo.</p>
        </div>

        {saliendo && (
          <div className="acceso-estallido" aria-hidden="true">
            {Array.from({ length: 18 }, (_, i) => (
              <span
                key={i}
                style={
                  {
                    '--angulo': `${(360 / 18) * i}deg`,
                    '--color': COLORES_ESPECTRO[i % COLORES_ESPECTRO.length],
                    '--distancia': `${140 + (i % 3) * 50}px`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
