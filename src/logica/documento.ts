// Operaciones sobre el documento HTML de una página libre: identificar, añadir, mover,
// duplicar y eliminar elementos. Todas reciben y devuelven HTML como texto.

export const ATRIBUTO_ID = 'data-prisma-id'
export const ID_ESTILO_BLOQUES = 'prisma-bloques'

// Elementos que el usuario puede seleccionar en la vista previa
const SELECCIONABLES =
  'header, footer, section, article, figure, nav, h1, h2, h3, h4, p, a, button, img, ul, ol, li, blockquote, hr, .prisma-bloque, .prisma-objeto, .prisma-libre > *, svg:not(svg svg), svg:not(svg svg) > :is(path, rect, circle, ellipse, polygon, polyline, line, g, image, text, use)'

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
body { position: relative; }
.prisma-libre { position: absolute; top: 0; left: 0; width: 100%; height: 0; pointer-events: none; }
.prisma-libre > * { position: absolute; margin: 0; pointer-events: auto; }
svg.prisma-pieza { overflow: visible; }
.prisma-objeto { display: block; width: 140px; margin: 16px 0; }
.prisma-objeto svg, .prisma-objeto img { display: block; width: 100%; height: auto; }
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
  // Si la página trae una versión anterior de estos estilos, se actualiza
  const existente = doc.getElementById(ID_ESTILO_BLOQUES)
  if (existente) {
    existente.textContent = CSS_BLOQUES
    return
  }
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

// Qué puede recibir un elemento arrastrado: las secciones se ordenan entre secciones, el
// resto entre bloques de contenido
export const SELECTOR_SECCIONES = 'section, header, footer, .prisma-seccion'
export const SELECTOR_BLOQUES =
  'h1, h2, h3, h4, p, ul, ol, li, figure, blockquote, hr, article, img, .p-acciones, .p-boton, .prisma-boton, .prisma-bloque'

export const esDeSeccion = (el: Element) => el.matches(SELECTOR_SECCIONES)

/**
 * Busca dónde se soltaría un elemento arrastrado encima de `bajo`: el bloque del mismo nivel
 * más cercano que no sea el propio elemento ni algo que lo contenga o esté dentro de él.
 */
export function destinoDeArrastre(arrastrado: Element, bajo: Element | null): Element | null {
  if (!bajo) return null
  let destino: Element | null
  if (esDeSeccion(arrastrado)) {
    destino = bajo.closest(SELECTOR_SECCIONES)
    // Una sección anidada se sustituye por la sección de primer nivel que la contiene
    while (destino?.parentElement?.closest(SELECTOR_SECCIONES)) destino = destino.parentElement.closest(SELECTOR_SECCIONES)
  } else if (arrastrado.tagName === 'LI') {
    destino = bajo.closest('li')
  } else {
    destino = bajo.closest(SELECTOR_BLOQUES)
    if (destino?.tagName === 'LI') destino = destino.closest('ul, ol')
  }
  if (!destino || destino === arrastrado || arrastrado.contains(destino) || destino.contains(arrastrado)) return null
  return destino.hasAttribute(ATRIBUTO_ID) ? destino : null
}

export function moverElementoA(html: string, id: string, destinoId: string, posicion: 'antes' | 'despues'): string {
  const doc = analizar(html)
  const el = doc.querySelector(`[${ATRIBUTO_ID}="${CSS.escape(id)}"]`)
  const destino = doc.querySelector(`[${ATRIBUTO_ID}="${CSS.escape(destinoId)}"]`)
  if (!el || !destino || el === destino || el.contains(destino)) return html
  if (posicion === 'antes') destino.before(el)
  else destino.after(el)
  return serializar(doc)
}

export type Alineacion = 'left' | 'center' | 'right'

export const alinearElemento = (html: string, id: string, alineacion: Alineacion) =>
  conElemento(html, id, (el) => {
    ;(el as HTMLElement).style.textAlign = alineacion
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
  esTexto: boolean
  alineacion: Alineacion | null
  enlace: string | null
  puedeSubir: boolean
  puedeBajar: boolean
  // Dibujos, imágenes y objetos se pueden mover libremente, escalar y girar
  esObjeto: boolean
  objeto: EstiloObjeto
  // Si es una pieza de un dibujo, el identificador del dibujo completo
  dibujo: string | null
  // Está en la capa libre: se coloca en cualquier punto de la página
  libre: boolean
  // Una sección entera: se ordena entre secciones, no se suelta en cualquier punto
  esSeccion: boolean
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
  svg: 'Objeto',
  SVG: 'Objeto',
}

export function describirElemento(html: string, id: string): DescripcionElemento | null {
  const el = analizar(html).querySelector(`[${ATRIBUTO_ID}="${CSS.escape(id)}"]`)
  if (!el) return null
  const esBoton = el.tagName === 'BUTTON' || (el.tagName === 'A' && /bot[oó]n|btn|button|cta/i.test(el.className))
  return {
    nombre: esBoton ? 'Botón' : esParteDibujo(el) ? 'Parte del dibujo' : el.classList.contains('prisma-objeto') ? 'Objeto' : (NOMBRES[el.tagName] ?? 'Bloque'),
    esImagen: el.tagName === 'IMG' || !!el.querySelector(':scope > img'),
    esTexto: /^(H1|H2|H3|H4|P|LI|BLOCKQUOTE)$/.test(el.tagName),
    alineacion: (['left', 'center', 'right'] as const).find((a) => (el as HTMLElement).style.textAlign === a) ?? null,
    enlace: el.closest('a')?.getAttribute('href') ?? null,
    puedeSubir: !!el.previousElementSibling,
    puedeBajar: !!el.nextElementSibling,
    esObjeto: esObjeto(el),
    objeto: leerEstiloObjeto(el),
    dibujo: esParteDibujo(el) && !el.closest('svg.prisma-pieza') ? (el.closest('svg')?.getAttribute(ATRIBUTO_ID) ?? null) : null,
    libre: el.parentElement?.classList.contains('prisma-libre') ?? false,
    esSeccion: el.matches(SELECTOR_SECCIONES) || el.tagName === 'NAV',
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

// --- Objetos: dibujos, imágenes y formas que se colocan libremente ---

export interface EstiloObjeto {
  x: number
  y: number
  // Escala en tanto por uno (1 = tamaño original)
  escala: number
  giro: number
  capa: number
}

const SVG = 'http://www.w3.org/2000/svg'

/** Una pieza dentro de un dibujo SVG (no el dibujo completo). */
export const esParteDibujo = (el: Element) => el.namespaceURI === SVG && el.tagName.toLowerCase() !== 'svg'

export const esObjeto = (el: Element) =>
  el.tagName.toLowerCase() === 'svg' ||
  esParteDibujo(el) ||
  el.tagName === 'IMG' ||
  el.tagName === 'FIGURE' ||
  el.classList.contains('prisma-objeto')

const estiloDe = (el: Element) => (el as HTMLElement).style

export function leerEstiloObjeto(el: Element): EstiloObjeto {
  const estilo = estiloDe(el)
  const [x = 0, y = 0] = (estilo.translate || '0px 0px').split(/\s+/).map((v) => parseFloat(v) || 0)
  return {
    x,
    y,
    escala: parseFloat(estilo.scale) || 1,
    giro: parseFloat(estilo.rotate) || 0,
    capa: parseInt(estilo.zIndex, 10) || 0,
  }
}

/** Aplica posición, escala, giro y capa a un elemento (también en la vista previa en vivo). */
export function aplicarEstiloObjeto(el: Element, valores: EstiloObjeto): void {
  const estilo = estiloDe(el)
  estilo.translate = valores.x || valores.y ? `${Math.round(valores.x)}px ${Math.round(valores.y)}px` : ''
  estilo.scale = valores.escala !== 1 ? String(Math.round(valores.escala * 100) / 100) : ''
  estilo.rotate = valores.giro ? `${Math.round(valores.giro)}deg` : ''
  estilo.zIndex = valores.capa ? String(valores.capa) : ''
  // La capa solo funciona en elementos posicionados
  if (valores.capa && !estilo.position && !esParteDibujo(el)) estilo.position = 'relative'
  // Las piezas de un dibujo giran y escalan sobre su propio centro
  if (esParteDibujo(el)) {
    estilo.transformBox = 'fill-box'
    estilo.transformOrigin = 'center'
  }
}

const FORMAS_SVG = 'path, rect, circle, ellipse, polygon, polyline, line, text'

/** Pinta un objeto o una pieza de un dibujo de un color. */
export const colorearObjeto = (html: string, id: string, color: string) =>
  conElemento(html, id, (el) => {
    const piezas = el.matches(FORMAS_SVG) ? [el] : [...el.querySelectorAll(FORMAS_SVG)]
    piezas.forEach((pieza) => {
      const relleno = pieza.getAttribute('fill')
      const trazo = pieza.getAttribute('stroke')
      // Una pieza solo de contorno cambia su trazo; las demás, su relleno
      if (relleno === 'none' && trazo && trazo !== 'none') estiloDe(pieza).stroke = color
      else estiloDe(pieza).fill = color
    })
  })

/**
 * Mueve, escala y gira con las propiedades translate, scale y rotate de CSS: el objeto
 * conserva su sitio en la página y solo cambia cómo se ve, así nada se descoloca.
 */
export const cambiarObjeto = (html: string, id: string, cambio: Partial<EstiloObjeto>) =>
  conElemento(html, id, (el) => aplicarEstiloObjeto(el, { ...leerEstiloObjeto(el), ...cambio }))

export const restablecerObjeto = (html: string, id: string) =>
  conElemento(html, id, (el) => aplicarEstiloObjeto(el, { x: 0, y: 0, escala: 1, giro: 0, capa: 0 }))

// Sin scripts, manejadores de eventos ni identificadores de la página de origen
export function limpiarMarcado(marcado: string): string {
  const doc = analizar(`<!doctype html><body>${marcado}</body>`)
  doc.querySelectorAll('script, iframe, object, embed, foreignObject').forEach((el) => el.remove())
  doc.body.querySelectorAll('*').forEach((el) => {
    for (const atributo of [...el.attributes]) {
      const nombre = atributo.name.toLowerCase()
      const valor = atributo.value.trim().toLowerCase()
      const enlaceExterno = (nombre === 'href' || nombre === 'xlink:href' || nombre === 'src') && !valor.startsWith('#') && !valor.startsWith('data:image/')
      if (nombre.startsWith('on') || nombre === ATRIBUTO_ID || nombre === 'data-editable' || enlaceExterno) el.removeAttribute(atributo.name)
    }
  })
  return doc.body.innerHTML
}

/** Inserta un dibujo como objeto, debajo del elemento seleccionado o dentro de la sección elegida. */
export function insertarObjeto(html: string, marcado: string, despuesDe: string | null): { html: string; id: string | null } {
  const doc = analizar(html)
  asegurarEstilos(doc)
  const contenedor = doc.createElement('div')
  contenedor.className = 'prisma-objeto prisma-bloque'
  // Tamaño inicial también en el propio elemento, por si la hoja de estilos no lo cubre
  contenedor.style.width = '140px'
  contenedor.innerHTML = limpiarMarcado(marcado)
  const seleccionado = despuesDe ? doc.querySelector(`[${ATRIBUTO_ID}="${CSS.escape(despuesDe)}"]`) : null
  if (seleccionado?.matches('section, header, footer, nav')) {
    ;(seleccionado.querySelector('.p-contenedor, .prisma-contenedor') ?? seleccionado).appendChild(contenedor)
  } else if (seleccionado) {
    ;(seleccionado.closest(BLOQUES) ?? seleccionado).after(contenedor)
  } else {
    ;(doc.querySelector('main') ?? doc.body).appendChild(contenedor)
  }
  asignarIds(doc)
  return { html: serializar(doc), id: contenedor.getAttribute(ATRIBUTO_ID) }
}

/** Marcado de un elemento, limpio y sin su posición, para guardarlo en "Mis objetos". */
export function marcadoDe(html: string, id: string): string | null {
  const el = analizar(html).querySelector(`[${ATRIBUTO_ID}="${CSS.escape(id)}"]`)
  if (!el) return null
  const copia = el.cloneNode(true) as Element
  aplicarEstiloObjeto(copia, { x: 0, y: 0, escala: 1, giro: 0, capa: 0 })
  return limpiarMarcado(copia.classList.contains('prisma-objeto') ? copia.innerHTML : copia.outerHTML)
}


// --- Capa libre: objetos colocados en cualquier punto de la página ---

export const CLASE_CAPA_LIBRE = 'prisma-libre'
export const CLASE_PIEZA = 'prisma-pieza'

/** Dónde y con qué tamaño queda un objeto, en píxeles respecto a la página. */
export interface Colocacion {
  izquierda: number
  arriba: number
  ancho: number
  alto: number
  // Para una pieza sacada de un dibujo: la parte del dibujo original que ocupa (viewBox)
  vista?: string
  // Estilos que el elemento perdería fuera de su sitio (color, letra, fondo…)
  estilos?: Record<string, string>
}

/**
 * Lleva un objeto a la capa libre (o lo recoloca si ya está en ella). Una pieza de un dibujo
 * sale envuelta en su propio SVG, con las definiciones (degradados, estilos) del original.
 */
export function colocarLibre(html: string, id: string, c: Colocacion): { html: string; id: string | null } {
  const doc = analizar(html)
  const el = doc.querySelector(`[${ATRIBUTO_ID}="${CSS.escape(id)}"]`)
  if (!el) return { html, id }
  asegurarEstilos(doc)
  let capa = doc.querySelector(`.${CLASE_CAPA_LIBRE}`)
  if (!capa) {
    capa = doc.createElement('div')
    capa.className = CLASE_CAPA_LIBRE
    doc.body.appendChild(capa)
  }
  const estilo = leerEstiloObjeto(el)
  let destino: Element = el

  if (el.parentElement !== capa) {
    if (esParteDibujo(el) && c.vista) {
      const original = el.closest('svg')
      const envoltura = doc.createElementNS(SVG, 'svg')
      envoltura.setAttribute('viewBox', c.vista)
      envoltura.setAttribute('preserveAspectRatio', 'none')
      envoltura.setAttribute('class', CLASE_PIEZA)
      original?.querySelectorAll(':scope > defs, :scope > style').forEach((d) => envoltura.appendChild(d.cloneNode(true)))
      // La pieza conserva el color que heredaba de su dibujo
      const relleno = original?.getAttribute('fill')
      if (relleno) envoltura.setAttribute('fill', relleno)
      aplicarEstiloObjeto(el, { x: 0, y: 0, escala: 1, giro: 0, capa: 0 })
      estiloDe(el).transformBox = ''
      estiloDe(el).transformOrigin = ''
      envoltura.appendChild(el)
      capa.appendChild(envoltura)
      destino = envoltura
    } else {
      capa.appendChild(el)
    }
  }

  const estiloDestino = estiloDe(destino)
  estiloDestino.position = 'absolute'
  estiloDestino.left = `${Math.round(c.izquierda)}px`
  estiloDestino.top = `${Math.round(c.arriba)}px`
  // Un texto medido al píxel se partiría en otra línea: se le da un pequeño margen
  estiloDestino.width = esObjeto(destino) ? `${Math.round(c.ancho)}px` : `${Math.ceil(c.ancho) + 2}px`
  // Los objetos tienen alto fijo; un texto o un botón crece si se le escribe más
  estiloDestino.height = esObjeto(destino) ? `${Math.round(c.alto)}px` : ''
  // Un botón o un enlace siempre en una sola línea
  if (/^(A|BUTTON)$/.test(destino.tagName)) estiloDestino.whiteSpace = 'nowrap'
  for (const [propiedad, valor] of Object.entries(c.estilos ?? {})) estiloDestino.setProperty(propiedad, valor)
  // La posición ya está en left/top: el desplazamiento se pone a cero
  aplicarEstiloObjeto(destino, { x: 0, y: 0, escala: estilo.escala, giro: estilo.giro, capa: estilo.capa || 10 })
  asignarIds(doc)
  return { html: serializar(doc), id: destino.getAttribute(ATRIBUTO_ID) }
}
