import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAvisos } from '../controles/Avisos'
import { Dialogo } from '../controles/Dialogo'
import {
  IconoCheck,
  IconoDeshacer,
  IconoDescargar,
  IconoEscritorio,
  IconoExterno,
  IconoLlave,
  IconoMas,
  IconoMovil,
  IconoPrisma,
  IconoRehacer,
  IconoTableta,
} from '../controles/Iconos'
import { MenuCuenta } from '../controles/MenuCuenta'
import type { Cuenta } from '../estado/cuentas'
import { useHistorial } from '../estado/historial'
import { leerCalidadIA, type GeneracionIA } from '../estado/ia'
import { guardarProyectoLocal, type Proyecto } from '../estado/proyecto'
import { cssFuentesIncrustadas, cssFuentesVista } from '../logica/fuentes'
import {
  cambiarEnlace,
  cambiarImagen,
  describirElemento,
  duplicarElemento,
  eliminarElemento,
  insertarElemento,
  moverElemento,
  ocultarImagenes,
  restaurarImagenes,
} from '../logica/documento'
import {
  coloresDeHtml,
  cssTema,
  documentoBase,
  documentoConTextos,
  documentoFinal,
  fuentesNecesarias,
  ID_ESTILO_TEMA,
  limpiarHtmlIA,
  ponerEstilo,
} from '../logica/pagina'
import { hexesUnicos } from '../logica/paleta'
import { plataforma } from '../plataforma'
import { Generando } from './Generando'
import { Panel, type AccionesElemento } from './Panel'
import { Vista } from './Vista'

interface Props {
  cuenta: Cuenta
  inicial: Proyecto
  ia: GeneracionIA
  iaDisponible: boolean
  alNuevo: () => void
  alConfigurarClave: () => void
  alCerrarSesion: () => void
}

type Dispositivo = 'escritorio' | 'tableta' | 'movil'

const ANCHOS: Record<Dispositivo, number | null> = { escritorio: null, tableta: 820, movil: 390 }

const FUENTES_VISTA = cssFuentesVista()

function nombreArchivo(texto: string): string {
  const base = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'mi-pagina'
}

export function Editor({ cuenta, inicial, ia, iaDisponible, alNuevo, alConfigurarClave, alCerrarSesion }: Props) {
  const { avisar } = useAvisos()
  const historial = useHistorial<Proyecto>(inicial)
  const proyecto = historial.presente
  const [dispositivo, setDispositivo] = useState<Dispositivo>('escritorio')
  const [exportada, setExportada] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)

  // La estructura recarga la vista; el tema y los textos se aplican sin recargar
  const { origen, htmlIA, plantilla, portada, usoImagen, imagen } = proyecto
  const documento = useMemo(
    () => documentoBase({ ...proyecto, origen, htmlIA, plantilla, portada, usoImagen, imagen }),
    // Solo los campos estructurales: así editar un texto o un color no recarga la página
    [origen, htmlIA, plantilla, portada, usoImagen, imagen],
  )
  const css = useMemo(() => cssTema(proyecto), [proyecto])

  useEffect(() => {
    const temporizador = window.setTimeout(() => guardarProyectoLocal(cuenta.correo, proyecto), 300)
    return () => window.clearTimeout(temporizador)
  }, [cuenta.correo, proyecto])

  const editarTexto = useCallback(
    (id: string, texto: string) => historial.aplicar((p) => ({ ...p, textos: { ...p.textos, [id]: texto } }), `texto:${id}`),
    [historial],
  )

  const exportar = useCallback(async () => {
    if (!plataforma || exportando) return
    setExportando(true)
    try {
      const fuentes = await cssFuentesIncrustadas(fuentesNecesarias(proyecto.fuentes, documentoBase(proyecto)))
      // index.html dentro de una carpeta propia: es lo que esperan los servicios de alojamiento
      const ruta = await plataforma.guardarArchivo({
        contenido: documentoFinal(proyecto, fuentes),
        nombreSugerido: 'index.html',
        carpeta: nombreArchivo(proyecto.textos.marca ?? 'mi-pagina'),
        filtros: [{ name: 'Página web', extensions: ['html'] }],
        titulo: 'Exportar página',
      })
      if (ruta) setExportada(ruta)
    } catch {
      avisar('No se pudo exportar la página', 'error')
    } finally {
      setExportando(false)
    }
  }, [proyecto, exportando, avisar])

  // --- Elementos: seleccionar, añadir, mover, duplicar, eliminar ---

  const [seleccion, setSeleccion] = useState<string | null>(null)
  const seleccionado = useMemo(() => (seleccion ? describirElemento(documento, seleccion) : null), [documento, seleccion])

  useEffect(() => {
    if (seleccion && !seleccionado) setSeleccion(null)
  }, [seleccion, seleccionado])

  /**
   * Aplica una operación al documento. Una página de plantilla pasa a ser una página libre
   * (su HTML se guarda tal cual, con los textos ya escritos dentro).
   */
  const operar = useCallback(
    (operacion: (html: string) => { html: string; id?: string | null }) => {
      const eraPlantilla = proyecto.origen === 'plantilla'
      const resultado = operacion(documentoConTextos(proyecto))
      historial.aplicar((p) => ({ ...p, origen: 'ia', htmlIA: resultado.html, textos: {} }))
      if (resultado.id !== undefined) setSeleccion(resultado.id)
      if (eraPlantilla) avisar('Ahora es una página libre: puedes añadir y mover todo · Ctrl+Z para deshacer')
    },
    [proyecto, historial, avisar],
  )

  const elementos: AccionesElemento = useMemo(
    () => ({
      anadir: (tipo, imagenNueva) => operar((html) => insertarElemento(html, tipo, seleccion, imagenNueva ?? null)),
      eliminar: () => seleccion && operar((html) => ({ html: eliminarElemento(html, seleccion), id: null })),
      mover: (direccion) => seleccion && operar((html) => ({ html: moverElemento(html, seleccion, direccion), id: seleccion })),
      duplicar: () => seleccion && operar((html) => duplicarElemento(html, seleccion)),
      cambiarImagen: (dataUrl) => seleccion && operar((html) => ({ html: cambiarImagen(html, seleccion, dataUrl), id: seleccion })),
      cambiarEnlace: (url) => seleccion && operar((html) => ({ html: cambiarEnlace(html, seleccion, url), id: seleccion })),
      deseleccionar: () => setSeleccion(null),
    }),
    [operar, seleccion],
  )

  const pedirCambio = useCallback(
    async (peticion: string) => {
      if (!plataforma) return
      // La IA recibe la página con los colores actuales y sin las imágenes incrustadas
      const doc = new DOMParser().parseFromString(documentoConTextos(proyecto), 'text/html')
      ponerEstilo(doc, ID_ESTILO_TEMA, cssTema(proyecto))
      const { html, imagenes } = ocultarImagenes(`<!doctype html>\n${doc.documentElement.outerHTML}`)
      const foco = seleccionado && seleccion ? `\n\nEl usuario se refiere sobre todo a este elemento (${seleccionado.nombre.toLowerCase()}): data-prisma-id="${seleccion}".` : ''
      const resultado = await ia.ejecutar(() =>
        plataforma!.ia.modificar({ html, peticion: `${peticion}${foco}`, calidad: leerCalidadIA() }),
      )
      if (!resultado.ok) {
        if (!resultado.cancelado) avisar(resultado.error, 'error')
        return
      }
      const limpio = limpiarHtmlIA(resultado.html)
      if (!limpio) {
        avisar('La IA devolvió una respuesta que no es una página. Inténtalo de nuevo.', 'error')
        return
      }
      const restaurado = restaurarImagenes(limpio, imagenes)
      historial.aplicar((p) => ({
        ...p,
        origen: 'ia',
        htmlIA: restaurado,
        textos: {},
        paleta: hexesUnicos([...p.paleta, ...coloresDeHtml(restaurado)]).slice(0, 12),
      }))
      avisar('Cambio aplicado · puedes deshacerlo con Ctrl+Z')
    },
    [proyecto, ia, historial, avisar, seleccion, seleccionado],
  )

  // Atajos de teclado, tanto en la app como dentro de la vista previa
  const acciones = useRef({ deshacer: historial.deshacer, rehacer: historial.rehacer, exportar, alNuevo })
  acciones.current = { deshacer: historial.deshacer, rehacer: historial.rehacer, exportar, alNuevo }

  const manejarTecla = useCallback((evento: KeyboardEvent) => {
    if (!(evento.ctrlKey || evento.metaKey) || evento.altKey) return
    const tecla = evento.key.toLowerCase()
    const a = acciones.current
    if (tecla === 'z') evento.shiftKey ? a.rehacer() : a.deshacer()
    else if (tecla === 'y') a.rehacer()
    else if (tecla === 'e') void a.exportar()
    else if (tecla === 'n') a.alNuevo()
    else return
    evento.preventDefault()
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', manejarTecla)
    return () => window.removeEventListener('keydown', manejarTecla)
  }, [manejarTecla])

  useEffect(
    () =>
      plataforma?.alAccionMenu((accion) => {
        const a = acciones.current
        if (accion === 'deshacer') a.deshacer()
        if (accion === 'rehacer') a.rehacer()
        if (accion === 'exportar') void a.exportar()
        if (accion === 'nuevo') a.alNuevo()
      }),
    [],
  )

  return (
    <div className="editor">
      <header className="barra">
        <div className="barra-grupo">
          <div className="marca-app">
            <IconoPrisma tamano={20} />
            <span>Prisma</span>
          </div>
          <button className="boton boton--fantasma" onClick={alNuevo} title="Nueva página (Ctrl+N)">
            <IconoMas />
            Nueva
          </button>
          <button className="boton boton--fantasma" onClick={alConfigurarClave} title="Clave y calidad de la IA">
            <IconoLlave />
            Ajustes de IA
          </button>
        </div>

        <div className="selector-dispositivo" role="radiogroup" aria-label="Tamaño de pantalla">
          {(
            [
              ['escritorio', 'Computadora', IconoEscritorio],
              ['tableta', 'Tableta', IconoTableta],
              ['movil', 'Celular', IconoMovil],
            ] as const
          ).map(([id, nombre, Icono]) => (
            <button
              key={id}
              role="radio"
              aria-checked={dispositivo === id}
              className={dispositivo === id ? 'activo' : ''}
              title={nombre}
              onClick={() => setDispositivo(id)}
            >
              <Icono />
              <span>{nombre}</span>
            </button>
          ))}
        </div>

        <div className="barra-grupo">
          <button className="boton-icono" onClick={historial.deshacer} disabled={!historial.puedeDeshacer} title="Deshacer (Ctrl+Z)" aria-label="Deshacer">
            <IconoDeshacer />
          </button>
          <button className="boton-icono" onClick={historial.rehacer} disabled={!historial.puedeRehacer} title="Rehacer (Ctrl+Shift+Z)" aria-label="Rehacer">
            <IconoRehacer />
          </button>
          <button className="boton boton--primario" onClick={() => void exportar()} disabled={exportando} title="Exportar (Ctrl+E)">
            <IconoDescargar />
            {exportando ? 'Preparando…' : 'Exportar página'}
          </button>
          <MenuCuenta cuenta={cuenta} alCerrarSesion={alCerrarSesion} />
        </div>
      </header>

      <div className="editor-cuerpo">
        <main className="editor-vista">
          <Vista
            documento={documento}
            css={css}
            cssFuentes={FUENTES_VISTA}
            textos={proyecto.textos}
            ancho={ANCHOS[dispositivo]}
            seleccion={seleccion}
            alSeleccionar={setSeleccion}
            alEditarTexto={editarTexto}
            alTecla={manejarTecla}
          />
        </main>
        <aside className="editor-panel" aria-label="Opciones de diseño">
          <Panel
            proyecto={proyecto}
            actualizar={historial.aplicar}
            seleccionado={seleccionado}
            elementos={elementos}
            iaDisponible={iaDisponible}
            alPedirCambio={(p) => void pedirCambio(p)}
            alConfigurarClave={alConfigurarClave}
          />
        </aside>
      </div>

      {ia.activa && <Generando titulo="Aplicando tu cambio" caracteres={ia.caracteres} alCancelar={ia.cancelar} />}

      {exportada && (
        <Dialogo titulo="¡Tu página está lista!" alCerrar={() => setExportada(null)}>
          <div className="dialogo-formulario">
            <p className="exportada-ruta">
              <IconoCheck />
              <span>{exportada}</span>
            </p>
            <p>Es un solo archivo con todo incluido: imagen, letras y colores. Funciona en cualquier navegador, incluso sin internet.</p>
            <div className="dialogo-acciones dialogo-acciones--inicio">
              <button className="boton boton--primario" onClick={() => void plataforma?.abrirArchivo(exportada)}>
                <IconoExterno />
                Abrir en el navegador
              </button>
            </div>
            <div className="consejo">
              <strong>¿Quieres que otros la visiten?</strong>
              <span>
                Abre Netlify Drop y arrastra la carpeta donde guardaste la página. En segundos tendrás un enlace para
                compartirla; crea una cuenta gratuita allí para que se quede publicada.
              </span>
              <button className="enlace" onClick={() => void plataforma?.abrirEnlace('https://app.netlify.com/drop')}>
                Abrir Netlify Drop <IconoExterno tamano={13} />
              </button>
            </div>
          </div>
        </Dialogo>
      )}
    </div>
  )
}
