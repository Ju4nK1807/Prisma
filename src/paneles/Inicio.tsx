import { useMemo, useRef, useState, type DragEvent } from 'react'
import { useAvisos } from '../controles/Avisos'
import { IconoChevronIzquierda, IconoImagen, IconoLlave, IconoPincel, IconoPrisma, IconoSubir, IconoVarita } from '../controles/Iconos'
import { MenuCuenta } from '../controles/MenuCuenta'
import type { Cuenta } from '../estado/cuentas'
import { proyectoDePlantilla, type ImagenProyecto, type Proyecto } from '../estado/proyecto'
import { cargarImagen, TIPOS_ACEPTADOS, type ImagenCargada } from '../logica/imagen'
import { PLANTILLAS, type IdPlantilla } from '../logica/plantillas'
import { MiniPagina } from './MiniPagina'

interface Props {
  cuenta: Cuenta
  tieneClave: boolean
  hayProyectoGuardado: boolean
  alCrear: (proyecto: Proyecto) => void
  alRecrear: (imagen: ImagenProyecto, paleta: string[], indicaciones: string) => void
  alContinuar: () => void
  alConfigurarClave: () => void
  alCerrarSesion: () => void
}

type Paso = 'subir' | 'elegir' | 'plantilla' | 'ia'

export function Inicio(props: Props) {
  const { cuenta, tieneClave, hayProyectoGuardado, alCrear, alRecrear, alContinuar, alConfigurarClave, alCerrarSesion } = props
  const { avisar } = useAvisos()
  const [paso, setPaso] = useState<Paso>('subir')
  const [imagen, setImagen] = useState<ImagenCargada | null>(null)
  const [cargando, setCargando] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [indicaciones, setIndicaciones] = useState('')
  const selector = useRef<HTMLInputElement>(null)

  const paleta = useMemo(() => imagen?.paleta.map((c) => c.hex) ?? [], [imagen])
  const imagenProyecto = imagen ? { dataUrl: imagen.dataUrl, nombre: imagen.nombre, esLogo: imagen.esLogo } : null

  const recibirArchivo = async (archivo: File | undefined) => {
    if (!archivo) return
    setCargando(true)
    try {
      setImagen(await cargarImagen(archivo))
      setPaso('elegir')
    } catch (error) {
      avisar(error instanceof Error ? error.message : 'No se pudo abrir la imagen', 'error')
    } finally {
      setCargando(false)
    }
  }

  const alSoltar = (evento: DragEvent<HTMLElement>) => {
    evento.preventDefault()
    setArrastrando(false)
    void recibirArchivo(evento.dataTransfer.files[0])
  }

  const miniaturas = useMemo(() => {
    const base = imagen ? { dataUrl: imagen.dataUrl, nombre: imagen.nombre, esLogo: imagen.esLogo } : null
    return PLANTILLAS.map((p) => ({ plantilla: p, proyecto: proyectoDePlantilla(p.id, base, paleta) }))
  }, [imagen, paleta])

  const crear = (id: IdPlantilla) => alCrear(proyectoDePlantilla(id, imagenProyecto, paleta))

  return (
    <div className="inicio" onDragOver={(e) => e.preventDefault()} onDrop={alSoltar}>
      <header className="inicio-cabecera">
        <div className="marca-app">
          <IconoPrisma tamano={22} />
          <span>Prisma</span>
        </div>
        <div className="inicio-cabecera-acciones">
          {hayProyectoGuardado && (
            <button className="boton boton--fantasma" onClick={alContinuar}>
              Volver a mi última página
            </button>
          )}
          <button className="boton boton--fantasma" onClick={alConfigurarClave}>
            <IconoLlave />
            Ajustes de IA
          </button>
          <MenuCuenta cuenta={cuenta} alCerrarSesion={alCerrarSesion} />
        </div>
      </header>

      {paso === 'subir' && (
        <main className="inicio-paso inicio-paso--subir">
          <p className="inicio-saludo">Hola, {cuenta.nombre.split(" ")[0]}</p>
          <h1>Crea tu página web a partir de una imagen</h1>
          <p className="inicio-lema">Sube tu logo, una foto de tu negocio o la captura de una página que te guste. Prisma hace el resto.</p>
          <button
            className={`zona-subida ${arrastrando ? 'zona-subida--activa' : ''}`}
            onClick={() => selector.current?.click()}
            onDragEnter={() => setArrastrando(true)}
            onDragLeave={() => setArrastrando(false)}
            disabled={cargando}
          >
            <span className="zona-subida-icono">
              <IconoSubir tamano={28} />
            </span>
            <strong>{cargando ? 'Leyendo la imagen…' : 'Arrastra tu imagen aquí'}</strong>
            <span>o haz clic para buscarla · PNG, JPG, WEBP o GIF</span>
          </button>
          <input
            ref={selector}
            type="file"
            accept={TIPOS_ACEPTADOS.join(',')}
            hidden
            onChange={(e) => {
              void recibirArchivo(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <button className="enlace" onClick={() => setPaso('plantilla')}>
            No tengo imagen, quiero empezar con una plantilla
          </button>
        </main>
      )}

      {paso === 'elegir' && imagen && (
        <main className="inicio-paso">
          <button className="boton boton--fantasma inicio-atras" onClick={() => setPaso('subir')}>
            <IconoChevronIzquierda />
            Otra imagen
          </button>
          <div className="imagen-elegida">
            <img src={imagen.dataUrl} alt="Imagen subida" />
            <div>
              <h2>¿Qué hacemos con tu imagen?</h2>
              <div className="paleta-extraida" aria-label="Colores encontrados en la imagen">
                {paleta.map((hex) => (
                  <span key={hex} style={{ background: hex }} title={hex} />
                ))}
              </div>
              <p className="tenue">Estos son los colores que encontramos.</p>
            </div>
          </div>
          <div className="opciones-origen">
            <button className="tarjeta-opcion" onClick={() => setPaso('plantilla')}>
              <span className="tarjeta-opcion-icono">
                <IconoPincel tamano={22} />
              </span>
              <strong>Usar sus colores en una plantilla</strong>
              <span>Ideal para un logo o una foto. Eliges el tipo de página y Prisma la pinta con tus colores. Funciona sin internet.</span>
            </button>
            <button className="tarjeta-opcion" onClick={() => setPaso('ia')}>
              <span className="tarjeta-opcion-icono tarjeta-opcion-icono--ia">
                <IconoVarita tamano={22} />
              </span>
              <strong>Recrear la página de la imagen</strong>
              <span>Ideal para la captura de una web o un boceto dibujado. La inteligencia artificial la convierte en una página real.</span>
            </button>
          </div>
        </main>
      )}

      {paso === 'plantilla' && (
        <main className="inicio-paso inicio-paso--ancho">
          <button className="boton boton--fantasma inicio-atras" onClick={() => setPaso(imagen ? 'elegir' : 'subir')}>
            <IconoChevronIzquierda />
            Volver
          </button>
          <h2>¿Qué tipo de página necesitas?</h2>
          <p className="tenue">Podrás cambiar la plantilla, los colores y todos los textos después.</p>
          <div className="plantillas">
            {miniaturas.map(({ plantilla, proyecto }) => (
              <button key={plantilla.id} className="tarjeta-plantilla" onClick={() => crear(plantilla.id)}>
                <MiniPagina proyecto={proyecto} />
                <strong>{plantilla.nombre}</strong>
                <span>{plantilla.descripcion}</span>
              </button>
            ))}
          </div>
        </main>
      )}

      {paso === 'ia' && imagen && imagenProyecto && (
        <main className="inicio-paso">
          <button className="boton boton--fantasma inicio-atras" onClick={() => setPaso('elegir')}>
            <IconoChevronIzquierda />
            Volver
          </button>
          <div className="imagen-elegida">
            <img src={imagen.dataUrl} alt="Imagen subida" />
            <div>
              <h2>Recrear esta página</h2>
              <p className="tenue">La IA analiza la imagen y escribe una página completa. Tarda alrededor de un minuto.</p>
            </div>
          </div>
          <label className="campo-etiqueta" htmlFor="indicaciones">
            Indicaciones (opcional)
          </label>
          <textarea
            id="indicaciones"
            className="campo campo-area"
            rows={3}
            placeholder="Por ejemplo: es para una panadería llamada Dulce Hogar, añade una sección de pedidos."
            value={indicaciones}
            onChange={(e) => setIndicaciones(e.target.value)}
          />
          {tieneClave ? (
            <button className="boton boton--primario boton--grande" onClick={() => alRecrear(imagenProyecto, paleta, indicaciones)}>
              <IconoVarita />
              Crear mi página
            </button>
          ) : (
            <div className="aviso-clave">
              <IconoLlave tamano={20} />
              <div>
                <strong>Necesitas una clave de API de Anthropic</strong>
                <span>Este modo usa inteligencia artificial por internet. Configúrala una vez y queda guardada en tu equipo.</span>
              </div>
              <button className="boton boton--primario" onClick={alConfigurarClave}>
                Configurar clave
              </button>
            </div>
          )}
          <p className="tenue pequeno">
            <IconoImagen tamano={14} /> La imagen se envía a Anthropic solo para crear la página.
          </p>
        </main>
      )}
    </div>
  )
}
