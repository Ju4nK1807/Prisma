import { useEffect, useRef } from 'react'
import { ATRIBUTO_ID } from '../logica/documento'
import { ID_ESTILO_FUENTES, ID_ESTILO_TEMA, ponerEstilo } from '../logica/pagina'

interface Props {
  documento: string
  css: string
  cssFuentes: string
  textos: Record<string, string>
  ancho: number | null
  editable?: boolean
  seleccion?: string | null
  alSeleccionar?: (id: string | null) => void
  alEditarTexto?: (id: string, texto: string) => void
  // Los atajos pulsados dentro de la página (Ctrl+Z…) se reenvían a la app
  alTecla?: (evento: KeyboardEvent) => void
}

// Solo en la vista previa: resalta los textos editables al pasar el ratón
const CSS_EDICION = `
[data-editable] { cursor: text; border-radius: 3px; outline: 1.5px dashed transparent; outline-offset: 3px; transition: outline-color 120ms; }
[data-editable]:hover { outline-color: rgba(84, 104, 255, 0.55); }
[data-editable]:focus { outline: 2px solid #5468ff; }
`

function elementoEditable(objetivo: EventTarget | null): HTMLElement | null {
  const nodo = objetivo as Element | null
  if (!nodo || typeof nodo.closest !== 'function') return null
  return nodo.closest<HTMLElement>('[data-editable]')
}

export function Vista(props: Props) {
  const { documento, css, cssFuentes, textos, ancho, editable = true, seleccion = null, alEditarTexto, alTecla, alSeleccionar } = props
  const marco = useRef<HTMLIFrameElement>(null)
  const ultimo = useRef({ css, textos, seleccion, alEditarTexto, alTecla, alSeleccionar })
  ultimo.current = { css, textos, seleccion, alEditarTexto, alTecla, alSeleccionar }
  const desplazamiento = useRef(0)
  // Texto original de cada elemento editable, para volver a él al deshacer o restablecer
  const porDefecto = useRef<Record<string, string>>({})

  const documentoActual = () => {
    const doc = marco.current?.contentDocument
    return doc && doc.readyState !== 'loading' && doc.body ? doc : null
  }

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
    ponerEstilo(doc, 'prisma-seleccion', id ? `[${ATRIBUTO_ID}="${CSS.escape(id)}"] { outline: 2px solid #5468ff !important; outline-offset: 4px; border-radius: 4px; }` : '')
    const el = id ? doc.querySelector(`[${ATRIBUTO_ID}="${CSS.escape(id)}"]`) : null
    if (!el || !desplazar) return
    const caja = el.getBoundingClientRect()
    const alto = doc.defaultView?.innerHeight ?? 0
    if (caja.top < 0 || caja.bottom > alto) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
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
      })
      doc.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter' && elementoEditable(evento.target)) {
          evento.preventDefault()
          ;(evento.target as HTMLElement).blur()
          return
        }
        if (evento.ctrlKey || evento.metaKey) ultimo.current.alTecla?.(evento)
      })
    }
    // La página de muestra no navega: los enlaces y formularios solo se ven
    doc.addEventListener('click', (evento) => {
      const nodo = evento.target as Element | null
      if (!nodo || typeof nodo.closest !== 'function') return
      if (nodo.closest('a')) evento.preventDefault()
      // Un clic selecciona el elemento más concreto bajo el puntero
      if (editable) ultimo.current.alSeleccionar?.(nodo.closest(`[${ATRIBUTO_ID}]`)?.getAttribute(ATRIBUTO_ID) ?? null)
    })
    doc.addEventListener('submit', (evento) => evento.preventDefault())
    marco.current?.contentWindow?.scrollTo(0, desplazamiento.current)
    marcarSeleccion(doc, true)
  }

  useEffect(() => {
    const doc = documentoActual()
    if (doc) ponerEstilo(doc, ID_ESTILO_TEMA, css)
  }, [css])

  useEffect(() => {
    const doc = documentoActual()
    if (doc) aplicarTextos(doc)
  }, [textos])

  useEffect(() => {
    const doc = documentoActual()
    if (doc) marcarSeleccion(doc, true)
  }, [seleccion])

  return (
    <div className="vista-lienzo">
      <div className={`vista-marco ${ancho ? 'vista-marco--dispositivo' : ''}`} style={ancho ? { width: ancho } : undefined}>
        <iframe ref={marco} title="Vista previa de la página" srcDoc={documento} onLoad={preparar} />
      </div>
    </div>
  )
}
