import { normalizarHex } from './color'
import { ATRIBUTO_ID, conIds } from './documento'
import { CSS_PLANTILLAS, plantillaPorId } from './plantillas'
import { derivarTema, PARES_FUENTES, variablesCss, type Densidad, type Esquinas, type IdFuentes } from './tema'
import type { Proyecto } from '../estado/proyecto'

export const ID_ESTILO_TEMA = 'prisma-tema'
export const ID_ESTILO_FUENTES = 'prisma-fuentes'

// Valores con los que arranca toda plantilla; el tema del usuario los sobrescribe
const VARIABLES_BASE = `:root {
  --peso-titulos: 700;
  --radio: 12px;
  --radio-boton: 8px;
  --espacio: 1;
}`

const escaparAtributo = (texto: string) => texto.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** CSS del tema actual: colores, fuentes, esquinas y espaciado elegidos. */
export function cssTema(proyecto: Proyecto): string {
  const tema = proyecto.colores ? derivarTema(proyecto.colores, proyecto.modo) : null
  const estilo = { fuentes: proyecto.fuentes, esquinas: proyecto.esquinas, densidad: proyecto.densidad }
  const css = variablesCss(tema, estilo)
  // Con colores propios en modo oscuro, el navegador también debe pintar controles oscuros
  return proyecto.colores ? `${css}\n:root { color-scheme: ${proyecto.modo === 'oscuro' ? 'dark' : 'light'}; }` : css
}

/** Familias empaquetadas con la app que usa el par tipográfico elegido. */
export function fuentesNecesarias(fuentes: IdFuentes | null, html: string): ('inter' | 'jetbrains')[] {
  const par = PARES_FUENTES.find((p) => p.id === fuentes)
  const texto = (par ? `${par.titulos} ${par.texto}` : '') + html
  const resultado: ('inter' | 'jetbrains')[] = []
  if (texto.includes('Inter Variable')) resultado.push('inter')
  if (texto.includes('JetBrains Mono Variable')) resultado.push('jetbrains')
  return resultado
}

/** Documento estructural de la página, sin el tema ni los textos del usuario. */
export function documentoBase(proyecto: Proyecto): string {
  return conIds(estructura(proyecto))
}

function estructura(proyecto: Proyecto): string {
  if (proyecto.origen === 'ia' && proyecto.htmlIA) return proyecto.htmlIA
  const plantilla = plantillaPorId(proyecto.plantilla)
  const cuerpo = plantilla.cuerpo({
    portada: proyecto.portada,
    usoImagen: proyecto.usoImagen,
    imagen: proyecto.imagen?.dataUrl ?? null,
  })
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escaparAtributo(proyecto.textos.marca ?? 'Mi marca')}</title>
<style>${VARIABLES_BASE}\n${CSS_PLANTILLAS}</style>
</head>
<body>
${cuerpo}
</body>
</html>`
}

/** Inserta (o reemplaza) una etiqueta <style> con id dentro del <head> del documento. */
export function ponerEstilo(doc: Document, id: string, css: string): void {
  let estilo = doc.getElementById(id)
  if (!estilo) {
    estilo = doc.createElement('style')
    estilo.id = id
    doc.head.appendChild(estilo)
  }
  // El tema debe ir al final del <head> para ganar a los valores de :root anteriores
  if (estilo.parentNode === doc.head && estilo !== doc.head.lastElementChild && id === ID_ESTILO_TEMA) doc.head.appendChild(estilo)
  if (estilo.textContent !== css) estilo.textContent = css
}

export function aplicarTextos(doc: Document, textos: Record<string, string>): void {
  doc.querySelectorAll<HTMLElement>('[data-editable]').forEach((elemento) => {
    const id = elemento.dataset.editable
    if (id && id in textos && elemento.textContent !== textos[id]) elemento.textContent = textos[id]
  })
  if ('marca' in textos) doc.title = textos.marca
}

/**
 * Documento final y autónomo: estructura + fuentes + tema + textos del usuario.
 * Al enviarlo a la IA para pedir un cambio se conservan las marcas data-editable.
 */
export function documentoFinal(proyecto: Proyecto, cssFuentes: string, opciones = { conservarEditables: false }): string {
  const doc = new DOMParser().parseFromString(documentoBase(proyecto), 'text/html')
  if (cssFuentes) ponerEstilo(doc, ID_ESTILO_FUENTES, cssFuentes)
  ponerEstilo(doc, ID_ESTILO_TEMA, cssTema(proyecto))
  aplicarTextos(doc, proyecto.textos)
  if (!opciones.conservarEditables) {
    doc.querySelectorAll('[data-editable]').forEach((elemento) => elemento.removeAttribute('data-editable'))
    doc.querySelectorAll(`[${ATRIBUTO_ID}]`).forEach((elemento) => elemento.removeAttribute(ATRIBUTO_ID))
  }
  if (!doc.querySelector('meta[name="generator"]')) {
    const meta = doc.createElement('meta')
    meta.name = 'generator'
    meta.content = 'Prisma'
    doc.head.appendChild(meta)
  }
  return `<!doctype html>\n${doc.documentElement.outerHTML}\n`
}

/**
 * Limpia el HTML que devuelve la IA: quita los bloques de código markdown, el JavaScript y
 * los manejadores de eventos en línea. La página exportada debe ser solo HTML y CSS.
 */
export function limpiarHtmlIA(respuesta: string): string | null {
  let html = respuesta.trim()
  const bloque = /```(?:html)?\s*([\s\S]*?)```/i.exec(html)
  if (bloque) html = bloque[1].trim()
  const inicio = html.search(/<!doctype html|<html/i)
  if (inicio === -1) return null
  html = html.slice(inicio)
  const fin = html.toLowerCase().lastIndexOf('</html>')
  if (fin !== -1) html = html.slice(0, fin + '</html>'.length)

  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, iframe, object, embed, base, meta[http-equiv]').forEach((el) => el.remove())
  doc.querySelectorAll('*').forEach((el) => {
    for (const atributo of [...el.attributes]) {
      const nombre = atributo.name.toLowerCase()
      const valor = atributo.value.trim().toLowerCase()
      if (nombre.startsWith('on')) el.removeAttribute(atributo.name)
      if ((nombre === 'href' || nombre === 'src' || nombre === 'action') && valor.startsWith('javascript:')) {
        el.removeAttribute(atributo.name)
      }
    }
  })
  if (!doc.body || doc.body.children.length === 0) return null
  return `<!doctype html>\n${doc.documentElement.outerHTML}`
}

/** Lee los colores que la IA declaró en :root, para ofrecerlos en la paleta. */
export function coloresDeHtml(html: string): string[] {
  const nombres = ['fondo', 'primario', 'acento', 'texto', 'superficie']
  const resultado: string[] = []
  for (const nombre of nombres) {
    const coincidencia = new RegExp(`--color-${nombre}\\s*:\\s*(#[0-9a-fA-F]{3,6})\\b`).exec(html)
    const hex = coincidencia ? normalizarHex(coincidencia[1]) : null
    if (hex) resultado.push(hex)
  }
  return resultado
}

export const ETIQUETAS_ESQUINAS: Record<Esquinas, string> = { rectas: 'Rectas', suaves: 'Suaves', redondas: 'Redondas' }
export const ETIQUETAS_DENSIDAD: Record<Densidad, string> = { compacta: 'Compacta', normal: 'Normal', amplia: 'Amplia' }

/**
 * Documento editable con los textos del usuario ya escritos dentro. Es la base de toda
 * operación que cambia la estructura (añadir, mover, pedir un cambio a la IA).
 */
export function documentoConTextos(proyecto: Proyecto): string {
  const doc = new DOMParser().parseFromString(documentoBase(proyecto), 'text/html')
  aplicarTextos(doc, proyecto.textos)
  return `<!doctype html>\n${doc.documentElement.outerHTML}`
}
