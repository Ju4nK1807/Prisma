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
import { borrarMiObjeto, guardarMiObjeto, leerMisObjetos } from '../estado/objetos'
import { leerCalidadIA, type GeneracionIA } from '../estado/ia'
import { guardarProyectoLocal, type Proyecto } from '../estado/proyecto'
import { cssFuentesIncrustadas, cssFuentesVista } from '../logica/fuentes'
import {
  alinearElemento,
  cambiarObjeto,
  colocarLibre,
  colorearObjeto,
  insertarObjeto,
  limpiarMarcado,
  marcadoDe,
  restablecerObjeto,
  cambiarEnlace,
  cambiarImagen,
  describirElemento,
  duplicarElemento,
  eliminarElemento,
  insertarElemento,
  moverElemento,
  moverElementoA,
  ocultarImagenes,
  restaurarImagenes,
  type Colocacion,
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
import { Vista, type HerramientasSeleccion } from './Vista'

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
  const [misObjetos, setMisObjetos] = useState(() => leerMisObjetos(cuenta.correo))
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
      alinear: (alineacion) => seleccion && operar((html) => ({ html: alinearElemento(html, seleccion, alineacion), id: seleccion })),
      cambiarObjeto: (cambio) => seleccion && operar((html) => ({ html: cambiarObjeto(html, seleccion, cambio), id: seleccion })),
      restablecerObjeto: () => seleccion && operar((html) => ({ html: restablecerObjeto(html, seleccion), id: seleccion })),
      anadirObjeto: (marcado) => operar((html) => insertarObjeto(html, marcado, seleccion)),
      guardarObjeto: (nombre) => {
        const marcado = seleccion ? marcadoDe(documentoConTextos(proyecto), seleccion) : null
        if (!marcado) return
        const lista = guardarMiObjeto(cuenta.correo, nombre, marcado)
        if (lista) {
          setMisObjetos(lista)
          avisar(`«${nombre}» guardado en Mis objetos`)
        } else avisar('No hay espacio para guardar este objeto', 'error')
      },
      borrarObjetoGuardado: (id) => setMisObjetos(borrarMiObjeto(cuenta.correo, id)),
      colorear: (color) => seleccion && operar((html) => ({ html: colorearObjeto(html, seleccion, color), id: seleccion })),
      seleccionar: (id) => setSeleccion(id),
      deseleccionar: () => setSeleccion(null),
    }),
    [operar, seleccion, proyecto, cuenta.correo, avisar],
  )

  // Herramientas de la barra flotante sobre el elemento seleccionado
  const herramientas: HerramientasSeleccion | null = useMemo(
    () =>
      seleccionado
        ? {
            nombre: seleccionado.nombre,
            puedeSubir: seleccionado.puedeSubir,
            puedeBajar: seleccionado.puedeBajar,
            subir: () => elementos.mover(-1),
            bajar: () => elementos.mover(1),
            duplicar: elementos.duplicar,
            eliminar: elementos.eliminar,
            esObjeto: seleccionado.esObjeto,
            esSeccion: seleccionado.esSeccion,
            alCambiarObjeto: elementos.cambiarObjeto,
          }
        : null,
    [seleccionado, elementos],
  )

  // Al soltar un objeto arrastrado, pasa a la capa libre en esa posición
  const colocar = useCallback(
    (id: string, colocacion: Colocacion) => operar((html) => colocarLibre(html, id, colocacion)),
    [operar],
  )

  const moverA = useCallback(
    (id: string, destinoId: string, posicion: 'antes' | 'despues') =>
      operar((html) => ({ html: moverElementoA(html, id, destinoId, posicion), id })),
    [operar],
  )

  const [tituloIA, setTituloIA] = useState('Aplicando tu cambio')

  // La IA dibuja objetos a juego con el tema de la página y se guardan en "Mis objetos"
  const crearObjetosIA = useCallback(async () => {
    if (!plataforma) return
    const doc = new DOMParser().parseFromString(documentoConTextos(proyecto), 'text/html')
    const textos = [doc.title, ...[...doc.querySelectorAll('h1, h2, h3, p, li')].map((el) => el.textContent?.trim() ?? '')]
    const descripcion = [...new Set(textos.filter(Boolean))].join(' · ').slice(0, 3000)
    setTituloIA('Dibujando objetos para tu página')
    const resultado = await ia.ejecutar(() => plataforma!.ia.objetos({ descripcion, cantidad: 6, calidad: leerCalidadIA() }))
    if (!resultado.ok) {
      if (!resultado.cancelado) avisar(resultado.error, 'error')
      return
    }
    let lista = misObjetos
    for (const objeto of [...resultado.objetos].reverse()) {
      const marcado = limpiarMarcado(objeto.svg)
      if (!marcado.includes('<svg')) continue
      lista = guardarMiObjeto(cuenta.correo, objeto.nombre.slice(0, 30), marcado) ?? lista
    }
    setMisObjetos(lista)
    avisar(`${resultado.objetos.length} objetos nuevos en «Objetos de tu página»`)
  }, [proyecto, ia, avisar, misObjetos, cuenta.correo])

  const pedirCambio = useCallback(
    async (peticion: string) => {
      if (!plataforma) return
      // La IA recibe la página con los colores actuales y sin las imágenes incrustadas
      const doc = new DOMParser().parseFromString(documentoConTextos(proyecto), 'text/html')
      ponerEstilo(doc, ID_ESTILO_TEMA, cssTema(proyecto))
      const { html, imagenes } = ocultarImagenes(`<!doctype html>\n${doc.documentElement.outerHTML}`)
      const foco = seleccionado && seleccion ? `\n\nEl usuario se refiere sobre todo a este elemento (${seleccionado.nombre.toLowerCase()}): data-prisma-id="${seleccion}".` : ''
      setTituloIA('Aplicando tu cambio')
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
  const acciones = useRef({ deshacer: historial.deshacer, rehacer: historial.rehacer, exportar, alNuevo, herramientas })
  acciones.current = { deshacer: historial.deshacer, rehacer: historial.rehacer, exportar, alNuevo, herramientas }

  const manejarTecla = useCallback((evento: KeyboardEvent) => {
    const a = acciones.current
    // Alt + flechas mueve el elemento seleccionado
    if (evento.altKey && !evento.ctrlKey && !evento.metaKey && a.herramientas) {
      if (evento.key === 'ArrowUp' && a.herramientas.puedeSubir) a.herramientas.subir()
      else if (evento.key === 'ArrowDown' && a.herramientas.puedeBajar) a.herramientas.bajar()
      else return
      evento.preventDefault()
      return
    }
    // Supr elimina lo seleccionado, salvo mientras se escribe en un campo
    const objetivo = evento.target as HTMLElement | null
    const enCampo = !!objetivo && (objetivo.tagName === 'INPUT' || objetivo.tagName === 'TEXTAREA' || objetivo.isContentEditable)
    if ((evento.key === 'Delete' || evento.key === 'Backspace') && !evento.ctrlKey && !evento.metaKey && a.herramientas && !enCampo) {
      evento.preventDefault()
      a.herramientas.eliminar()
      return
    }
    if (!(evento.ctrlKey || evento.metaKey) || evento.altKey) return
    const tecla = evento.key.toLowerCase()
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
            herramientas={herramientas}
            alMover={moverA}
            alColocar={colocar}
            alEditarTexto={editarTexto}
            alTecla={manejarTecla}
          />
        </main>
        <aside className="editor-panel" aria-label="Opciones de diseño">
          <Panel
            proyecto={proyecto}
            actualizar={historial.aplicar}
            seleccionado={seleccionado}
            misObjetos={misObjetos}
            alCrearObjetosIA={() => void crearObjetosIA()}
            elementos={elementos}
            iaDisponible={iaDisponible}
            alPedirCambio={(p) => void pedirCambio(p)}
            alConfigurarClave={alConfigurarClave}
          />
        </aside>
      </div>

      {ia.activa && <Generando titulo={tituloIA} caracteres={ia.caracteres} alCancelar={ia.cancelar} />}

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
