// Operaciones sobre el documento HTML de una página libre: identificar, añadir, mover,
// duplicar y eliminar elementos. Todas reciben y devuelven HTML como texto.

export const ATRIBUTO_ID = 'data-prisma-id'
export const ID_ESTILO_BLOQUES = 'prisma-bloques'

// Elementos que el usuario puede seleccionar en la vista previa
const SELECCIONABLES =
  'header, footer, section, article, figure, nav, h1, h2, h3, h4, p, a, button, img, ul, ol, li, blockquote, hr, .prisma-bloque'

export type TipoElemento = 'titulo' | 'texto' | 'boton' | 'imagen' | 'tarjetas' | 'seccion' | 'separador'

export const ELEMENTOS: { tipo: TipoElemento; nombre: string }[] = [
  { tipo: 'titulo', nombre: 'Título' },
  { tipo: 'texto', nombre: 'Texto' },
  { tipo: 'boton', nombre: 'Botón' },
  { tipo: 'imagen', nombre: 'Imagen' },
  { tipo: 'tarjetas', nombre: 'Tarjetas' },
  { tipo: 'seccion', nombre: 'Sección' },
  { tipo: 'separador', nombre: 'Separador' },
]

// Los elementos añadidos traen su propio estilo, basado en las variables del tema y con
// valores de reserva por si la página no las declara
export const CSS_BLOQUES = `
.prisma-seccion { padding: calc(var(--espacio, 1) * 72px) 0; }
.prisma-contenedor { width: min(1120px, 100% - 48px); margin-inline: auto; }
.prisma-titulo { margin: 0 0 16px; color: var(--color-texto, #1d1c1a); font-family: var(--fuente-titulos, inherit); font-size: clamp(26px, 3.6vw, 38px); font-weight: var(--peso-titulos, 700); line-height: 1.2; }
.prisma-texto { max-width: 65ch; margin: 0 0 16px; color: var(--color-texto-suave, #5d5a54); font-size: 17px; line-height: 1.65; }
.prisma-boton { display: inline-flex; align-items: center; margin: 4px 0 16px; padding: 14px 26px; border-radius: var(--radio-boton, 8px); background: var(--color-primario, #3b6cf6); color: var(--color-sobre-primario, #ffffff); font-weight: 650; text-decoration: none; transition: background-color 0.15s; }
.prisma-boton:hover { background: var(--color-primario-hover, var(--color-primario, #2f58d6)); }
.prisma-imagen { margin: 8px 0 24px; }
.prisma-imagen img { display: block; width: 100%; max-height: 560px; border-radius: var(--radio, 12px); object-fit: cover; }
.prisma-separador { height: 1px; margin: 32px auto; border: 0; background: var(--color-borde, #e2e0da); }
.prisma-tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-top: 28px; }
.prisma-tarjeta { padding: calc(var(--espacio, 1) * 28px); border: 1px solid var(--color-borde, #e2e0da); border-radius: var(--radio, 12px); background: var(--color-superficie, #ffffff); }
.prisma-tarjeta h3 { margin: 0 0 8px; color: var(--color-texto, #1d1c1a); font-family: var(--fuente-titulos, inherit); font-size: 20px; }
.prisma-tarjeta p { margin: 0; color: var(--color-texto-suave, #5d5a54); }
`

const analizar = (html: string) => new DOMParser().parseFromString(html, 'text/html')
const serializar = (doc: Document) => `<!doctype html>\n${doc.documentElement.outerHTML}`

function siguienteNumero(doc: Document): number {
  let maximo = 0
  doc.querySelectorAll(`[${ATRIBUTO_ID}]`).forEach((el) => {
    const n = Number(/^e(\d+)$/.exec(el.getAttribute(ATRIBUTO_ID) ?? '')?.[1])
    if (n > maximo) maximo = n
  })
  return maximo + 1
}

/**
 * Da un identificador a cada elemento seleccionable que no lo tenga. Es determinista
 * (sigue el orden del documento), así la vista previa y la página guardada coinciden.
 */
export function asignarIds(doc: Document): void {
  let siguiente = siguienteNumero(doc)
  doc.body?.querySelectorAll(SELECCIONABLES).forEach((el) => {
    if (!el.hasAttribute(ATRIBUTO_ID)) el.setAttribute(ATRIBUTO_ID, `e${siguiente++}`)
  })
}

export function conIds(html: string): string {
  const doc = analizar(html)
  asignarIds(doc)
  return serializar(doc)
}

function asegurarEstilos(doc: Document): void {
  if (doc.getElementById(ID_ESTILO_BLOQUES)) return
  const estilo = doc.createElement('style')
  estilo.id = ID_ESTILO_BLOQUES
  estilo.textContent = CSS_BLOQUES
  // Antes de los estilos del tema, para que el tema siga mandando
  doc.head.insertBefore(estilo, doc.getElementById('prisma-tema'))
}

// Los elementos se crean antes de entrar en el documento, así que el contador es propio:
// consultar el documento daría el mismo identificador a todos los textos de un bloque
let contadorEditables = 0

function nuevoEditable(doc: Document): string {
  let id: string
  do id = `nuevo-${Date.now().toString(36)}-${++contadorEditables}`
  while (doc.querySelector(`[data-editable="${id}"]`))
  return id
}

function crear(doc: Document, tipo: TipoElemento, imagen: string | null): HTMLElement {
  const elemento = (etiqueta: string, clase: string, texto?: string) => {
    const el = doc.createElement(etiqueta)
    if (clase) el.className = clase
    if (texto !== undefined) {
      el.textContent = texto
      el.setAttribute('data-editable', nuevoEditable(doc))
    }
    return el
  }
  const boton = (texto: string) => {
    const a = elemento('a', 'prisma-boton', texto) as HTMLAnchorElement
    a.href = '#'
    return a
  }
  const figura = () => {
    const figure = elemento('figure', 'prisma-imagen prisma-bloque')
    const img = doc.createElement('img')
    img.src = imagen ?? ''
    img.alt = ''
    figure.appendChild(img)
    return figure
  }

  switch (tipo) {
    case 'titulo':
      return elemento('h2', 'prisma-titulo', 'Nuevo título')
    case 'texto':
      return elemento('p', 'prisma-texto', 'Escribe aquí tu texto. Haz clic sobre él para cambiarlo.')
    case 'boton':
      return boton('Nuevo botón')
    case 'imagen':
      return figura()
    case 'separador':
      return elemento('hr', 'prisma-separador')
    case 'tarjetas': {
      const seccion = elemento('section', 'prisma-seccion prisma-bloque')
      const contenedor = elemento('div', 'prisma-contenedor')
      contenedor.appendChild(elemento('h2', 'prisma-titulo', 'Título de la sección'))
      const rejilla = elemento('div', 'prisma-tarjetas')
      for (let i = 1; i <= 3; i++) {
        const tarjeta = elemento('article', 'prisma-tarjeta')
        tarjeta.appendChild(elemento('h3', '', `Tarjeta ${i}`))
        tarjeta.appendChild(elemento('p', '', 'Describe aquí este punto en una o dos frases.'))
        rejilla.appendChild(tarjeta)
      }
      contenedor.appendChild(rejilla)
      seccion.appendChild(contenedor)
      return seccion
    }
    case 'seccion': {
      const seccion = elemento('section', 'prisma-seccion prisma-bloque')
      const contenedor = elemento('div', 'prisma-contenedor')
      contenedor.appendChild(elemento('h2', 'prisma-titulo', 'Nueva sección'))
      contenedor.appendChild(elemento('p', 'prisma-texto', 'Cuenta aquí lo que quieras destacar de tu negocio.'))
      contenedor.appendChild(boton('Saber más'))
      seccion.appendChild(contenedor)
      return seccion
    }
  }
}

const DE_SECCION: TipoElemento[] = ['tarjetas', 'seccion']
const BLOQUES = 'h1, h2, h3, h4, p, ul, ol, figure, blockquote, hr, .prisma-boton, .prisma-bloque, article, .p-acciones'
const SECCIONES = 'section, header, footer, .prisma-seccion'

/**
 * Inserta un elemento nuevo debajo del seleccionado. Las secciones completas van después de
 * la sección que contiene la selección; los elementos pequeños, junto al elemento elegido.
 * Sin selección, todo va al final del contenido principal.
 */
export function insertarElemento(
  html: string,
  tipo: TipoElemento,
  despuesDe: string | null,
  imagen: string | null = null,
): { html: string; id: string | null } {
  const doc = analizar(html)
  asegurarEstilos(doc)
  const nuevo = crear(doc, tipo, imagen)
  const seleccionado = despuesDe ? doc.querySelector(`[${ATRIBUTO_ID}="${CSS.escape(despuesDe)}"]`) : null
  const principal = doc.querySelector('main') ?? doc.body

  if (seleccionado && DE_SECCION.includes(tipo)) {
    const seccion = seleccionado.closest(SECCIONES)
    if (seccion?.tagName === 'HEADER' && seccion.parentElement === doc.body) principal.prepend(nuevo)
    else if (seccion) seccion.after(nuevo)
    else seleccionado.after(nuevo)
  } else if (seleccionado) {
    const enBotones = seleccionado.closest('.p-acciones')
    if (tipo === 'boton' && enBotones) {
      ;(seleccionado.closest('a') ?? enBotones.lastElementChild ?? enBotones).after(nuevo)
    } else if (seleccionado.matches('section, header, footer, nav')) {
      // Dentro de una sección elegida entera: al final de su contenido
      ;(seleccionado.querySelector('.p-contenedor, .prisma-contenedor') ?? seleccionado).appendChild(nuevo)
    } else {
      ;(seleccionado.closest(BLOQUES) ?? seleccionado).after(nuevo)
    }
  } else if (DE_SECCION.includes(tipo)) {
    principal.appendChild(nuevo)
  } else {
    const seccion = crear(doc, 'seccion', null)
    const contenedor = seccion.querySelector('.prisma-contenedor')
    contenedor?.replaceChildren(nuevo)
    principal.appendChild(seccion)
  }

  asignarIds(doc)
  return { html: serializar(doc), id: nuevo.getAttribute(ATRIBUTO_ID) }
}

function conElemento(html: string, id: string, operacion: (el: Element, doc: Document) => void): string {
  const doc = analizar(html)
  const el = doc.querySelector(`[${ATRIBUTO_ID}="${CSS.escape(id)}"]`)
  if (!el) return html
  operacion(el, doc)
  asignarIds(doc)
  return serializar(doc)
}

export const eliminarElemento = (html: string, id: string) => conElemento(html, id, (el) => el.remove())

export const moverElemento = (html: string, id: string, direccion: -1 | 1) =>
  conElemento(html, id, (el) => {
    if (direccion === -1 && el.previousElementSibling) el.previousElementSibling.before(el)
    if (direccion === 1 && el.nextElementSibling) el.nextElementSibling.after(el)
  })

export function duplicarElemento(html: string, id: string): { html: string; id: string | null } {
  let nuevoId: string | null = null
  const resultado = conElemento(html, id, (el, doc) => {
    const copia = el.cloneNode(true) as Element
    // La copia recibe identificadores propios para editarse por separado
    ;[copia, ...copia.querySelectorAll('*')].forEach((nodo) => {
      nodo.removeAttribute(ATRIBUTO_ID)
      if (nodo.hasAttribute('data-editable')) nodo.setAttribute('data-editable', nuevoEditable(doc))
    })
    el.after(copia)
    asignarIds(doc)
    nuevoId = copia.getAttribute(ATRIBUTO_ID)
  })
  return { html: resultado, id: nuevoId }
}

export const cambiarImagen = (html: string, id: string, dataUrl: string) =>
  conElemento(html, id, (el) => {
    const img = el.tagName === 'IMG' ? el : el.querySelector('img')
    img?.setAttribute('src', dataUrl)
  })

export const cambiarEnlace = (html: string, id: string, url: string) =>
  conElemento(html, id, (el) => {
    const a = el.closest('a') ?? el.querySelector('a')
    a?.setAttribute('href', url.trim() || '#')
  })

export interface DescripcionElemento {
  nombre: string
  esImagen: boolean
  enlace: string | null
  puedeSubir: boolean
  puedeBajar: boolean
}

const NOMBRES: Record<string, string> = {
  H1: 'Título principal',
  H2: 'Título',
  H3: 'Subtítulo',
  H4: 'Subtítulo',
  P: 'Texto',
  A: 'Enlace',
  BUTTON: 'Botón',
  IMG: 'Imagen',
  FIGURE: 'Imagen',
  UL: 'Lista',
  OL: 'Lista',
  LI: 'Elemento de lista',
  BLOCKQUOTE: 'Cita',
  SECTION: 'Sección',
  HEADER: 'Cabecera',
  FOOTER: 'Pie de página',
  NAV: 'Menú',
  ARTICLE: 'Tarjeta',
  HR: 'Separador',
}

export function describirElemento(html: string, id: string): DescripcionElemento | null {
  const el = analizar(html).querySelector(`[${ATRIBUTO_ID}="${CSS.escape(id)}"]`)
  if (!el) return null
  const esBoton = el.tagName === 'A' && /boton/.test(el.className)
  return {
    nombre: esBoton ? 'Botón' : (NOMBRES[el.tagName] ?? 'Bloque'),
    esImagen: el.tagName === 'IMG' || !!el.querySelector(':scope > img'),
    enlace: el.closest('a')?.getAttribute('href') ?? null,
    puedeSubir: !!el.previousElementSibling,
    puedeBajar: !!el.nextElementSibling,
  }
}

// --- Imágenes al hablar con la IA ---
// Una imagen incrustada pesa cientos de miles de caracteres: se sustituye por un marcador
// corto antes de enviar la página y se repone al recibirla.

const PATRON_DATOS = /data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+/g

export function ocultarImagenes(html: string): { html: string; imagenes: string[] } {
  const imagenes: string[] = []
  const reducido = html.replace(PATRON_DATOS, (datos) => {
    const indice = imagenes.indexOf(datos)
    if (indice !== -1) return `prisma-imagen-${indice + 1}`
    imagenes.push(datos)
    return `prisma-imagen-${imagenes.length}`
  })
  return { html: reducido, imagenes }
}

export function restaurarImagenes(html: string, imagenes: string[]): string {
  return html.replace(/prisma-imagen-(\d+)/g, (marcador, n) => imagenes[Number(n) - 1] ?? marcador)
}
