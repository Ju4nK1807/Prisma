import { useCallback, useEffect, useRef, useState, type PointerEvent as EventoPuntero } from 'react'
import { IconoArrastrar, IconoChevronAbajo, IconoCopiar, IconoPapelera } from '../controles/Iconos'
import {
  aplicarEstiloObjeto,
  ATRIBUTO_ID,
  CLASE_CAPA_LIBRE,
  CLASE_PIEZA,
  destinoDeArrastre,
  esObjeto,
  esParteDibujo,
  leerEstiloObjeto,
  type Colocacion,
  type EstiloObjeto,
} from '../logica/documento'
import { ID_ESTILO_FUENTES, ID_ESTILO_TEMA, ponerEstilo } from '../logica/pagina'

export interface HerramientasSeleccion {
  nombre: string
  puedeSubir: boolean
  puedeBajar: boolean
  subir: () => void
  bajar: () => void
  duplicar: () => void
  eliminar: () => void
  // Los objetos (dibujos, imágenes) se mueven y escalan directamente sobre la página
  esObjeto: boolean
  // Las secciones se ordenan entre sí; todo lo demás se suelta libremente en la página
  esSeccion: boolean
  alCambiarObjeto: (cambio: Partial<EstiloObjeto>) => void
}

interface Props {
  documento: string
  css: string
  cssFuentes: string
  textos: Record<string, string>
  ancho: number | null
  editable?: boolean
  seleccion?: string | null
  herramientas?: HerramientasSeleccion | null
  alSeleccionar?: (id: string | null) => void
  alEditarTexto?: (id: string, texto: string) => void
  alMover?: (id: string, destinoId: string, posicion: 'antes' | 'despues') => void
  // Lleva un objeto a la capa libre, en la posición indicada
  alColocar?: (id: string, colocacion: Colocacion) => void
  // Los atajos pulsados dentro de la página (Ctrl+Z…) se reenvían a la app
  alTecla?: (evento: KeyboardEvent) => void
}

interface Caja {
  top: number
  left: number
  width: number
  height: number
}

interface Destino {
  id: string
  posicion: 'antes' | 'despues'
  linea: Caja
}

// Solo en la vista previa: resalta los textos editables al pasar el ratón
const CSS_EDICION = `
[data-editable] { cursor: text; border-radius: 3px; outline: 1.5px dashed transparent; outline-offset: 3px; transition: outline-color 120ms; }
[data-editable]:hover { outline-color: rgba(84, 104, 255, 0.55); }
[data-editable]:focus { outline: 2px solid #5468ff; }
`

const ALTO_BARRA = 40
const ANCHO_BARRA = 236
// Distancia al borde a partir de la cual la vista se desplaza sola al arrastrar
const BORDE_DESPLAZAMIENTO = 56

// Propiedades que definen el aspecto de un texto o un botón
const PROPIEDADES_ASPECTO = [
  'color',
  'background-color',
  'background-image',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-transform',
  'text-align',
  'text-shadow',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-radius',
  'box-shadow',
  'display',
  'opacity',
]

/**
 * Compara cómo se ve un elemento en su sitio y cómo se vería suelto en la capa libre, y
 * devuelve solo lo que cambiaría: así conserva su aspecto sin congelar lo demás.
 */
function estilosQueSePierden(el: Element): Record<string, string> {
  const doc = el.ownerDocument
  const vista = doc.defaultView
  if (!vista) return {}
  const capa = doc.createElement('div')
  capa.className = CLASE_CAPA_LIBRE
  capa.style.visibility = 'hidden'
  const copia = el.cloneNode(true) as HTMLElement
  capa.appendChild(copia)
  doc.body.appendChild(capa)
  const dentro = vista.getComputedStyle(el)
  const fuera = vista.getComputedStyle(copia)
  const perdidos: Record<string, string> = {}
  for (const propiedad of PROPIEDADES_ASPECTO) {
    const valor = dentro.getPropertyValue(propiedad)
    if (valor !== fuera.getPropertyValue(propiedad)) perdidos[propiedad] = valor
  }
  capa.remove()
  return perdidos
}

/** Identificador que se selecciona al tocar un elemento: una pieza suelta cuenta como un todo. */
function idSeleccionable(el: Element | null): string | null {
  if (!el || typeof el.closest !== 'function') return null
  const objetivo = el.closest(`svg.${CLASE_PIEZA}`) ?? el.closest(`[${ATRIBUTO_ID}]`)
  return objetivo?.getAttribute(ATRIBUTO_ID) ?? null
}

/** El objeto (dibujo, pieza, imagen) que hay bajo un elemento tocado, si lo hay. */
function objetoTocado(el: Element): Element | null {
  const pieza = el.closest(`svg.${CLASE_PIEZA}`)
  if (pieza) return pieza
  const conId = el.closest(`[${ATRIBUTO_ID}]`)
  return conId && esObjeto(conId) ? conId : null
}

function elementoEditable(objetivo: EventTarget | null): HTMLElement | null {
  const nodo = objetivo as Element | null
  if (!nodo || typeof nodo.closest !== 'function') return null
  return nodo.closest<HTMLElement>('[data-editable]')
}

/** Los hijos de una fila flexible o de una rejilla se ordenan de lado, no de arriba a abajo. */
function enHorizontal(el: Element): boolean {
  const padre = el.parentElement
  const vista = el.ownerDocument.defaultView
  if (!padre || !vista) return false
  const estilo = vista.getComputedStyle(padre)
  if (estilo.display.includes('flex')) return !estilo.flexDirection.startsWith('column')
  if (estilo.display.includes('grid')) return estilo.gridTemplateColumns.trim().split(/\s+/).length > 1
  return false
}

export function Vista(props: Props) {
  const { documento, css, cssFuentes, textos, ancho, editable = true, seleccion = null, herramientas = null } = props
  const marco = useRef<HTMLIFrameElement>(null)
  const capa = useRef<HTMLDivElement>(null)
  const ultimo = useRef({ ...props, seleccion })
  ultimo.current = { ...props, seleccion }
  const desplazamiento = useRef(0)
  // Texto original de cada elemento editable, para volver a él al deshacer o restablecer
  const porDefecto = useRef<Record<string, string>>({})

  const [caja, setCaja] = useState<Caja | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [destino, setDestino] = useState<Destino | null>(null)
  const [puntero, setPuntero] = useState<{ x: number; y: number } | null>(null)
  const ultimoPuntero = useRef<{ x: number; y: number } | null>(null)

  const documentoActual = () => {
    const doc = marco.current?.contentDocument
    return doc && doc.readyState !== 'loading' && doc.body ? doc : null
  }

  const elementoSeleccionado = (doc: Document) => {
    const id = ultimo.current.seleccion
    return id ? doc.querySelector(`[${ATRIBUTO_ID}="${CSS.escape(id)}"]`) : null
  }

  // Posición del elemento seleccionado, para colocar la barra flotante encima
  const medir = useCallback(() => {
    const doc = documentoActual()
    const el = doc ? elementoSeleccionado(doc) : null
    if (!el) {
      setCaja(null)
      return
    }
    const r = el.getBoundingClientRect()
    setCaja((anterior) =>
      anterior && anterior.top === r.top && anterior.left === r.left && anterior.width === r.width && anterior.height === r.height
        ? anterior
        : { top: r.top, left: r.left, width: r.width, height: r.height },
    )
  }, [])

  // Guarda la posición de desplazamiento para recuperarla cuando cambia la estructura
  useEffect(() => {
    return () => {
      desplazamiento.current = marco.current?.contentWindow?.scrollY ?? 0
    }
  }, [documento])

  const aplicarTextos = (doc: Document) => {
    const { textos: valores } = ultimo.current
    doc.querySelectorAll<HTMLElement>('[data-editable]').forEach((el) => {
      const id = el.dataset.editable
      // No se toca el texto que se está escribiendo, para no mover el cursor
      if (!id || el === doc.activeElement) return
      const texto = valores[id] ?? porDefecto.current[id]
      if (texto !== undefined && el.textContent !== texto) el.textContent = texto
    })
  }

  // Resalta el elemento seleccionado y, si quedó fuera de la vista (recién añadido), lo muestra
  const marcarSeleccion = (doc: Document, desplazar: boolean) => {
    const id = ultimo.current.seleccion
    ponerEstilo(
      doc,
      'prisma-seleccion',
      id ? `[${ATRIBUTO_ID}="${CSS.escape(id)}"] { outline: 2px solid #5468ff !important; outline-offset: 4px; border-radius: 4px; }` : '',
    )
    const el = elementoSeleccionado(doc)
    if (el && desplazar) {
      const r = el.getBoundingClientRect()
      const alto = doc.defaultView?.innerHeight ?? 0
      if (r.top < ALTO_BARRA || r.bottom > alto) el.scrollIntoView({ block: 'center' })
    }
    medir()
  }

  const preparar = () => {
    const doc = documentoActual()
    if (!doc) return
    ponerEstilo(doc, ID_ESTILO_FUENTES, cssFuentes)
    if (editable) ponerEstilo(doc, 'prisma-edicion', CSS_EDICION)
    ponerEstilo(doc, ID_ESTILO_TEMA, ultimo.current.css)
    porDefecto.current = {}
    doc.querySelectorAll<HTMLElement>('[data-editable]').forEach((el) => {
      const id = el.dataset.editable
      if (id && !(id in porDefecto.current)) porDefecto.current[id] = el.textContent ?? ''
    })
    aplicarTextos(doc)

    if (editable) {
      doc.querySelectorAll<HTMLElement>('[data-editable]').forEach((el) => {
        el.contentEditable = 'plaintext-only'
        el.spellcheck = true
      })
      doc.addEventListener('input', (evento) => {
        const el = elementoEditable(evento.target)
        const id = el?.dataset.editable
        if (!el || !id) return
        const texto = el.textContent ?? ''
        // Un mismo texto puede aparecer varias veces (el nombre de la marca, por ejemplo)
        doc.querySelectorAll<HTMLElement>(`[data-editable="${CSS.escape(id)}"]`).forEach((otro) => {
          if (otro !== el && otro.textContent !== texto) otro.textContent = texto
        })
        ultimo.current.alEditarTexto?.(id, texto)
        medir()
      })
      doc.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter' && elementoEditable(evento.target)) {
          evento.preventDefault()
          ;(evento.target as HTMLElement).blur()
          return
        }
        const escribiendo = !!elementoEditable(doc.activeElement)
        const borrar = (evento.key === 'Delete' || evento.key === 'Backspace') && !escribiendo
        if (evento.ctrlKey || evento.metaKey || evento.altKey || borrar) ultimo.current.alTecla?.(evento)
      })
    }
    // La página de muestra no navega: los enlaces y formularios solo se ven
    doc.addEventListener('click', (evento) => {
      const nodo = evento.target as Element | null
      if (!nodo || typeof nodo.closest !== 'function') return
      if (nodo.closest('a')) evento.preventDefault()
      if (!editable) return
      // Tras arrastrar un objeto, el clic que dispara el navegador no cambia la selección
      if (arrastreReciente.current) {
        arrastreReciente.current = false
        return
      }
      seleccionarEnPunto(evento.clientX, evento.clientY, nodo)
    })
    doc.addEventListener('submit', (evento) => evento.preventDefault())
    if (editable) {
      // Pulsar sobre un objeto y arrastrar lo mueve en un solo gesto, sin seleccionarlo antes
      doc.addEventListener('pointerdown', (evento) => {
        const nodo = evento.target as Element | null
        if (evento.button !== 0 || !nodo || typeof nodo.closest !== 'function' || nodo.closest('[data-editable]')) return
        const objeto = objetoTocado(nodo)
        if (!objeto) return
        evento.preventDefault()
        objeto.setPointerCapture?.(evento.pointerId)
        iniciarGesto(objeto, 'mover', evento.clientX, evento.clientY, false)
      })
      doc.addEventListener('pointermove', (evento) => {
        if (gestoObjeto.current && evento.buttons & 1) actualizarGesto(evento.clientX, evento.clientY)
      })
      doc.addEventListener('pointerup', (evento) => {
        if (gestoObjeto.current) terminarGesto(evento.clientX, evento.clientY)
      })
    }
    doc.defaultView?.addEventListener('scroll', medir, { passive: true })
    doc.defaultView?.addEventListener('resize', medir)
    marco.current?.contentWindow?.scrollTo(0, desplazamiento.current)
    marcarSeleccion(doc, true)
  }

  useEffect(() => {
    const doc = documentoActual()
    if (doc) ponerEstilo(doc, ID_ESTILO_TEMA, css)
    medir()
  }, [css, medir])

  useEffect(() => {
    const doc = documentoActual()
    if (doc) aplicarTextos(doc)
  }, [textos])

  useEffect(() => {
    const doc = documentoActual()
    if (doc) marcarSeleccion(doc, true)
    else setCaja(null)
  }, [seleccion])

  // --- Arrastrar para mover ---

  const calcularDestino = (x: number, y: number) => {
    const doc = documentoActual()
    const arrastrado = doc ? elementoSeleccionado(doc) : null
    if (!doc || !arrastrado) return setDestino(null)
    const objetivo = destinoDeArrastre(arrastrado, doc.elementFromPoint(x, y))
    const id = objetivo?.getAttribute(ATRIBUTO_ID)
    if (!objetivo || !id) return setDestino(null)
    const r = objetivo.getBoundingClientRect()
    if (enHorizontal(objetivo)) {
      const posicion = x < r.left + r.width / 2 ? 'antes' : 'despues'
      setDestino({ id, posicion, linea: { top: r.top, left: posicion === 'antes' ? r.left - 4 : r.right + 1, width: 3, height: r.height } })
    } else {
      const posicion = y < r.top + r.height / 2 ? 'antes' : 'despues'
      setDestino({ id, posicion, linea: { top: posicion === 'antes' ? r.top - 4 : r.bottom + 1, left: r.left, width: r.width, height: 3 } })
    }
  }

  const coordenadas = (evento: EventoPuntero<HTMLDivElement>) => {
    const r = capa.current?.getBoundingClientRect()
    return r ? { x: evento.clientX - r.left, y: evento.clientY - r.top } : null
  }

  const empezarArrastre = (evento: EventoPuntero<HTMLButtonElement>) => {
    evento.preventDefault()
    if (ultimo.current.herramientas && !ultimo.current.herramientas.esSeccion) {
      // Botones, textos, imágenes…: se llevan a cualquier punto de la página
      empezarDesdeMarco(evento, 'mover')
      return
    }
    setArrastrando(true)
    setDestino(null)
  }

  const terminarArrastre = (soltar: boolean) => {
    const id = ultimo.current.seleccion
    if (soltar && destino && id) ultimo.current.alMover?.(id, destino.id, destino.posicion)
    setArrastrando(false)
    setDestino(null)
    setPuntero(null)
    ultimoPuntero.current = null
  }

  // Mientras se arrastra cerca de un borde, la página se desplaza sola; Esc cancela
  useEffect(() => {
    if (!arrastrando) return
    let cuadro = 0
    const paso = () => {
      const p = ultimoPuntero.current
      const ventana = marco.current?.contentWindow
      const alto = capa.current?.clientHeight ?? 0
      if (p && ventana) {
        const velocidad = p.y < BORDE_DESPLAZAMIENTO ? -14 : p.y > alto - BORDE_DESPLAZAMIENTO ? 14 : 0
        if (velocidad) {
          ventana.scrollBy(0, velocidad)
          calcularDestino(p.x, p.y)
        }
      }
      cuadro = requestAnimationFrame(paso)
    }
    cuadro = requestAnimationFrame(paso)
    const cancelar = (e: KeyboardEvent) => e.key === 'Escape' && terminarArrastre(false)
    window.addEventListener('keydown', cancelar)
    return () => {
      cancelAnimationFrame(cuadro)
      window.removeEventListener('keydown', cancelar)
    }
    // calcularDestino y terminarArrastre leen el estado actual a través de referencias
  }, [arrastrando])

  // --- Mover y escalar objetos directamente ---
  // Las coordenadas del gesto son siempre las de la ventana de la página (dentro del iframe)

  const gestoObjeto = useRef<{
    modo: 'mover' | 'escalar'
    id: string
    el: Element
    x: number
    y: number
    base: EstiloObjeto
    ancho: number
    valores: EstiloObjeto
    desdeMarco: boolean
  } | null>(null)

  const aPagina = (clienteX: number, clienteY: number) => {
    const r = marco.current?.getBoundingClientRect()
    return r ? { x: clienteX - r.left, y: clienteY - r.top } : { x: clienteX, y: clienteY }
  }

  const iniciarGesto = (el: Element, modo: 'mover' | 'escalar', x: number, y: number, desdeMarco: boolean) => {
    const id = idSeleccionable(el)
    if (!id) return
    const base = leerEstiloObjeto(el)
    const r = el.getBoundingClientRect()
    gestoObjeto.current = { modo, id, el, x, y, base, ancho: Math.max(r.width, 40), valores: base, desdeMarco }
  }

  const actualizarGesto = (x: number, y: number) => {
    const gesto = gestoObjeto.current
    if (!gesto) return
    const dx = x - gesto.x
    const dy = y - gesto.y
    gesto.valores =
      gesto.modo === 'mover'
        ? { ...gesto.base, x: gesto.base.x + dx, y: gesto.base.y + dy }
        : { ...gesto.base, escala: Math.min(6, Math.max(0.15, gesto.base.escala * ((gesto.ancho + dx) / gesto.ancho))) }
    // En vivo sobre la página; el cambio se guarda al soltar
    aplicarEstiloObjeto(gesto.el, gesto.valores)
    medir()
  }

  /**
   * Dónde queda el objeto en la página, sin contar su propio desplazamiento, escala y giro
   * (que se conservan aparte). Para una pieza de un dibujo, también qué zona del dibujo ocupa.
   */
  const medirColocacion = (el: Element, desplazamiento: { x: number; y: number }): Colocacion | null => {
    const doc = el.ownerDocument
    const estilo = (el as HTMLElement).style
    const guardado = { translate: estilo.translate, scale: estilo.scale, rotate: estilo.rotate }
    estilo.translate = ''
    estilo.scale = ''
    estilo.rotate = ''
    const r = el.getBoundingClientRect()
    const cuerpo = doc.body.getBoundingClientRect()
    let vista: string | undefined
    if (esParteDibujo(el) && !el.closest(`svg.${CLASE_PIEZA}`)) {
      const grafico = el as SVGGraphicsElement
      const dibujo = el.closest('svg')
      const delDibujo = dibujo?.getScreenCTM()
      const propia = grafico.getScreenCTM()
      if (delDibujo && propia) {
        // Matriz de la pieza a las coordenadas del dibujo, aplicada a las esquinas de su caja
        const m = delDibujo.inverse().multiply(propia)
        const b = grafico.getBBox()
        const esquinas = [
          [b.x, b.y],
          [b.x + b.width, b.y],
          [b.x, b.y + b.height],
          [b.x + b.width, b.y + b.height],
        ].map(([px, py]) => ({ x: m.a * px + m.c * py + m.e, y: m.b * px + m.d * py + m.f }))
        const xs = esquinas.map((p) => p.x)
        const ys = esquinas.map((p) => p.y)
        const minX = Math.min(...xs)
        const minY = Math.min(...ys)
        vista = `${minX} ${minY} ${Math.max(...xs) - minX} ${Math.max(...ys) - minY}`
      }
    }
    estilo.translate = guardado.translate
    estilo.scale = guardado.scale
    estilo.rotate = guardado.rotate
    if (r.width < 1 || r.height < 1) return null
    const estilos = !esObjeto(el) && !el.closest(`.${CLASE_CAPA_LIBRE}`) ? estilosQueSePierden(el) : undefined
    return {
      izquierda: r.left - cuerpo.left + desplazamiento.x,
      arriba: r.top - cuerpo.top + desplazamiento.y,
      ancho: r.width,
      alto: r.height,
      vista,
      estilos,
    }
  }

  const terminarGesto = (x: number, y: number) => {
    const gesto = gestoObjeto.current
    gestoObjeto.current = null
    if (!gesto) return
    const recorrido = Math.hypot(x - gesto.x, y - gesto.y)
    if (gesto.modo === 'mover' && recorrido < 4) {
      // Un clic sin arrastrar sobre el marco lo atraviesa: elige lo que hay debajo
      if (gesto.desdeMarco) seleccionarEnPunto(x, y, null)
      return
    }
    if (!gesto.desdeMarco) arrastreReciente.current = true
    if (gesto.modo === 'escalar') {
      if (gesto.valores.escala !== gesto.base.escala) ultimo.current.herramientas?.alCambiarObjeto({ escala: gesto.valores.escala })
      return
    }
    const colocacion = medirColocacion(gesto.el, { x: gesto.valores.x, y: gesto.valores.y })
    if (colocacion) ultimo.current.alColocar?.(gesto.id, colocacion)
  }

  const empezarDesdeMarco = (evento: EventoPuntero<HTMLElement>, modo: 'mover' | 'escalar') => {
    const doc = documentoActual()
    const el = doc ? elementoSeleccionado(doc) : null
    if (!el) return
    evento.preventDefault()
    evento.currentTarget.setPointerCapture(evento.pointerId)
    const p = aPagina(evento.clientX, evento.clientY)
    iniciarGesto(el, modo, p.x, p.y, true)
  }

  const arrastreReciente = useRef(false)

  /**
   * Selección por capas en un punto: primero los textos (aunque algo los tape), después el
   * resto de arriba abajo. Cada clic en el mismo punto pasa a lo que hay debajo.
   */
  const seleccionarEnPunto = (x: number, y: number, tocado: Element | null) => {
    const doc = documentoActual()
    if (!doc) return
    const actual = ultimo.current.seleccion
    // Mientras se escribe en un texto, los clics dentro de él solo mueven el cursor
    const editableTocado = tocado ? elementoEditable(tocado) : null
    if (editableTocado && idSeleccionable(editableTocado) === actual) return
    const pila = doc.elementsFromPoint(x, y)
    const textos = pila.map(elementoEditable).filter((el): el is HTMLElement => !!el)
    const ids = [...textos, ...pila].map(idSeleccionable).filter((id): id is string => !!id)
    const candidatos = [...new Set(ids)]
    if (candidatos.length === 0) {
      ultimo.current.alSeleccionar?.(null)
      return
    }
    const indice = actual ? candidatos.indexOf(actual) : -1
    const elegido = indice >= 0 ? candidatos[(indice + 1) % candidatos.length] : candidatos[0]
    const el = doc.querySelector<HTMLElement>(`[${ATRIBUTO_ID}="${CSS.escape(elegido)}"]`)
    if (el?.matches('[data-editable]') && el !== doc.activeElement) el.focus()
    ultimo.current.alSeleccionar?.(elegido)
  }

  // La barra va encima del elemento; si no cabe, debajo
  const posicionBarra = (() => {
    if (!caja) return null
    const anchoMarco = marco.current?.clientWidth ?? 0
    const altoMarco = marco.current?.clientHeight ?? 0
    if (caja.top + caja.height < 0 || caja.top > altoMarco) return null
    const arriba = caja.top - ALTO_BARRA - 8
    const top = arriba >= 4 ? arriba : Math.min(caja.top + caja.height + 8, altoMarco - ALTO_BARRA - 4)
    const left = Math.max(4, Math.min(caja.left, anchoMarco - ANCHO_BARRA - 4))
    return { top: Math.max(4, top), left }
  })()

  return (
    <div className="vista-lienzo">
      <div className={`vista-marco ${ancho ? 'vista-marco--dispositivo' : ''}`} style={ancho ? { width: ancho } : undefined}>
        <iframe ref={marco} title="Vista previa de la página" srcDoc={documento} onLoad={preparar} />

        {editable && herramientas && posicionBarra && (
          <div className={`barra-flotante ${arrastrando ? 'barra-flotante--arrastrando' : ''}`} style={posicionBarra}>
            <button
              className="barra-flotante-asa"
              onPointerDown={empezarArrastre}
              onPointerMove={(e) => gestoObjeto.current && actualizarGesto(aPagina(e.clientX, e.clientY).x, aPagina(e.clientX, e.clientY).y)}
              onPointerUp={(e) => {
                const gesto = gestoObjeto.current
                if (!gesto) return
                const p = aPagina(e.clientX, e.clientY)
                // Desde el asa, un clic sin arrastrar no hace nada
                if (Math.hypot(p.x - gesto.x, p.y - gesto.y) < 4) gestoObjeto.current = null
                else terminarGesto(p.x, p.y)
              }}
              onPointerCancel={() => (gestoObjeto.current = null)}
              title="Arrastra para mover · Alt+↑/↓ también lo mueve"
              aria-label={`Mover ${herramientas.nombre.toLowerCase()}`}
            >
              <IconoArrastrar />
              Mover
            </button>
            <span className="barra-flotante-separador" />
            <button onClick={herramientas.subir} disabled={!herramientas.puedeSubir} title="Subir (Alt+↑)" aria-label="Subir">
              <IconoChevronAbajo className="girado" />
            </button>
            <button onClick={herramientas.bajar} disabled={!herramientas.puedeBajar} title="Bajar (Alt+↓)" aria-label="Bajar">
              <IconoChevronAbajo />
            </button>
            <button onClick={herramientas.duplicar} title="Duplicar" aria-label="Duplicar">
              <IconoCopiar />
            </button>
            <button className="barra-flotante-peligro" onClick={herramientas.eliminar} title="Eliminar" aria-label="Eliminar">
              <IconoPapelera />
            </button>
          </div>
        )}

        {editable && herramientas?.esObjeto && caja && !arrastrando && (
          <div
            className="marco-objeto"
            style={{ top: caja.top, left: caja.left, width: caja.width, height: caja.height }}
            onPointerDown={(e) => empezarDesdeMarco(e, 'mover')}
            onPointerMove={(e) => actualizarGesto(aPagina(e.clientX, e.clientY).x, aPagina(e.clientX, e.clientY).y)}
            onPointerUp={(e) => terminarGesto(aPagina(e.clientX, e.clientY).x, aPagina(e.clientX, e.clientY).y)}
            onPointerCancel={() => (gestoObjeto.current = null)}
            title="Arrastra para mover · la esquina cambia el tamaño"
          >
            <span
              className="asa-tamano"
              onPointerDown={(e) => {
                e.stopPropagation()
                empezarDesdeMarco(e, 'escalar')
              }}
              onPointerMove={(e) => actualizarGesto(aPagina(e.clientX, e.clientY).x, aPagina(e.clientX, e.clientY).y)}
              onPointerUp={(e) => {
                e.stopPropagation()
                terminarGesto(aPagina(e.clientX, e.clientY).x, aPagina(e.clientX, e.clientY).y)
              }}
              onPointerCancel={() => (gestoObjeto.current = null)}
              aria-hidden="true"
            />
          </div>
        )}

        {arrastrando && (
          <div
            ref={capa}
            className="capa-arrastre"
            onPointerMove={(e) => {
              const p = coordenadas(e)
              if (!p) return
              ultimoPuntero.current = p
              setPuntero(p)
              calcularDestino(p.x, p.y)
            }}
            onPointerUp={() => terminarArrastre(true)}
            onPointerLeave={() => setDestino(null)}
          >
            {destino && <span className="linea-destino" style={destino.linea} />}
            {puntero && herramientas && (
              <span className="etiqueta-arrastre" style={{ top: puntero.y + 14, left: puntero.x + 14 }}>
                {destino ? `Soltar ${destino.posicion === 'antes' ? 'antes' : 'después'}` : `Moviendo: ${herramientas.nombre}`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
