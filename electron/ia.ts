import Anthropic from '@anthropic-ai/sdk'
import type { CalidadIA, PeticionGenerar, PeticionModificar, ResultadoClave, ResultadoIA } from './compartido'

const MODELOS: Record<CalidadIA, string> = {
  alta: 'claude-opus-5-5',
  equilibrada: 'claude-sonnet-5-5',
  economica: 'claude-haiku-5-5',
}

// Haiku no admite el respaldo automático del servidor ante un rechazo
const ADMITE_RESPALDO: Record<CalidadIA, boolean> = { alta: true, equilibrada: true, economica: false }

const INSTRUCCIONES = `Eres un diseñador y desarrollador web experto. Recibirás una imagen —una captura de pantalla de una página web o un boceto— y debes crear esa página como un único documento HTML completo, pulido y listo para publicar.

Requisitos del documento:
- Responde solo con el documento, empezando por <!doctype html>. Sin explicaciones ni bloques de código markdown.
- Todo el CSS va en una única etiqueta <style> dentro de <head>. No uses JavaScript ni recursos externos (nada de CDN, Google Fonts ni imágenes por URL). Para fotos o ilustraciones usa bloques de color, degradados suaves o SVG en línea sencillos.
- Declara en :root y usa en todo el CSS estas variables, con valores sacados de la imagen: --color-fondo, --color-superficie, --color-superficie-alt, --color-borde, --color-texto, --color-texto-suave, --color-primario, --color-primario-hover, --color-sobre-primario, --color-primario-texto, --color-acento, --color-sobre-acento, --color-acento-suave, --fuente-titulos, --fuente-texto, --peso-titulos, --radio, --radio-boton y --espacio. Los colores, en hexadecimal (#rrggbb). No escribas colores literales fuera de :root. --espacio es un multiplicador sin unidades (1 es lo normal): aplícalo a los márgenes y rellenos de las secciones con calc(). El usuario cambiará estas variables desde su editor para rediseñar la página, así que todo el aspecto debe depender de ellas.
- Usa pilas de fuentes del sistema en --fuente-titulos y --fuente-texto.
- Marca cada texto visible que el usuario querría cambiar (títulos, párrafos, botones, enlaces del menú, elementos de listas, precios) con un atributo data-editable cuyo valor sea un identificador único y descriptivo, por ejemplo data-editable="portada-titulo". Ponlo en el elemento que contiene directamente el texto, que no debe tener elementos hijos.
- Diseño adaptable que funcione desde 360 px de ancho, HTML semántico y texto con contraste suficiente (WCAG AA).
- Si la imagen es un boceto, interprétalo como una página terminada y profesional. Si es una captura, reprodúcela con la mayor fidelidad posible en estructura, jerarquía, proporciones y colores.
- Escribe los textos en el idioma que aparece en la imagen; si no se lee ningún texto, en español.`

let controlador: AbortController | null = null

export function cancelar(): void {
  controlador?.abort()
}

function mensajeDeError(error: unknown): ResultadoIA {
  if (error instanceof Anthropic.APIUserAbortError) return { ok: false, error: 'Generación cancelada.', cancelado: true }
  if (error instanceof Anthropic.AuthenticationError) return { ok: false, error: 'La clave de API no es válida. Revísala en Ajustes de IA.' }
  if (error instanceof Anthropic.PermissionDeniedError) return { ok: false, error: 'Tu clave no tiene permiso para usar este modelo.' }
  if (error instanceof Anthropic.RateLimitError) return { ok: false, error: 'Demasiadas peticiones o sin saldo en la cuenta. Espera un momento e inténtalo otra vez.' }
  if (error instanceof Anthropic.BadRequestError) return { ok: false, error: `La petición no es válida: ${error.message}` }
  if (error instanceof Anthropic.APIConnectionError) return { ok: false, error: 'No hay conexión a internet o el servicio no responde.' }
  if (error instanceof Anthropic.APIError) return { ok: false, error: `El servicio de IA devolvió un error (${error.status ?? 'sin código'}). Inténtalo de nuevo.` }
  return { ok: false, error: error instanceof Error ? error.message : 'Error desconocido.' }
}

async function pedirDocumento(
  clave: string,
  calidad: CalidadIA,
  contenido: Anthropic.Beta.BetaContentBlockParam[],
  alProgreso: (caracteres: number) => void,
): Promise<ResultadoIA> {
  controlador?.abort()
  const propio = new AbortController()
  controlador = propio
  const modelo = MODELOS[calidad] ?? MODELOS.equilibrada
  try {
    const cliente = new Anthropic({ apiKey: clave })
    const flujo = cliente.beta.messages.stream(
      {
        model: modelo,
        max_tokens: 64000,
        ...(ADMITE_RESPALDO[calidad] ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
        output_config: { effort: 'medium' },
        system: INSTRUCCIONES,
        messages: [{ role: 'user', content: contenido }],
      },
      { signal: propio.signal },
    )
    flujo.on('text', (_delta, acumulado) => alProgreso(acumulado.length))
    const mensaje = await flujo.finalMessage()

    if (mensaje.stop_reason === 'refusal') {
      return { ok: false, error: 'La IA no pudo procesar esta imagen. Prueba con otra imagen o con otras indicaciones.' }
    }
    const html = mensaje.content.flatMap((bloque) => (bloque.type === 'text' ? [bloque.text] : [])).join('')
    if (mensaje.stop_reason === 'max_tokens') {
      return { ok: false, error: 'La página generada era demasiado larga y quedó incompleta. Pide un diseño más sencillo.' }
    }
    if (!html.trim()) return { ok: false, error: 'La IA no devolvió ninguna página. Inténtalo de nuevo.' }
    return { ok: true, html }
  } catch (error) {
    return mensajeDeError(error)
  } finally {
    if (controlador === propio) controlador = null
  }
}

export function generarDesdeImagen(clave: string, peticion: PeticionGenerar, alProgreso: (n: number) => void): Promise<ResultadoIA> {
  const indicaciones = peticion.indicaciones.trim()
  return pedirDocumento(
    clave,
    peticion.calidad,
    [
      { type: 'image', source: { type: 'base64', media_type: peticion.tipo, data: peticion.datos } },
      {
        type: 'text',
        text: `Crea la página web de esta imagen.${indicaciones ? `\n\nIndicaciones adicionales del usuario: ${indicaciones}` : ''}`,
      },
    ],
    alProgreso,
  )
}

export function modificarPagina(clave: string, peticion: PeticionModificar, alProgreso: (n: number) => void): Promise<ResultadoIA> {
  return pedirDocumento(
    clave,
    peticion.calidad,
    [
      {
        type: 'text',
        text: `Este es el documento actual de la página:\n\n<documento>\n${peticion.html}\n</documento>\n\nAplica el cambio que pide el usuario y devuelve el documento completo actualizado, cumpliendo los mismos requisitos. Conserva los atributos data-editable y data-prisma-id de los elementos que sigan existiendo, y deja exactamente igual los marcadores de imagen (prisma-imagen-1, prisma-imagen-2…), que representan fotos del usuario; puedes moverlos o reutilizarlos, pero no inventes imágenes por URL. Los elementos nuevos que añadas deben usar las mismas variables CSS que el resto de la página.\n\nPetición del usuario:\n${peticion.peticion}`,
      },
    ],
    alProgreso,
  )
}

/** Comprueba la clave consultando el modelo: no genera texto ni consume tokens. */
export async function validarClave(clave: string): Promise<ResultadoClave> {
  try {
    await new Anthropic({ apiKey: clave, maxRetries: 1, timeout: 20_000 }).models.retrieve(MODELOS.equilibrada)
    return { ok: true }
  } catch (error) {
    const resultado = mensajeDeError(error)
    return { ok: false, error: resultado.ok ? 'Error desconocido.' : resultado.error }
  }
}
