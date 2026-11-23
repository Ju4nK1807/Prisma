// Plantillas de página. Cada una produce HTML que solo usa las variables del tema, y marca
// con data-editable los textos que el usuario puede cambiar haciendo clic en la vista previa.

export type IdPlantilla = 'negocio' | 'portafolio' | 'restaurante' | 'evento'
export type Portada = 'dividida' | 'fondo' | 'centrada'
export type UsoImagen = 'portada' | 'logo' | 'ninguno'

export interface OpcionesPlantilla {
  portada: Portada
  usoImagen: UsoImagen
  imagen: string | null
}

export interface Plantilla {
  id: IdPlantilla
  nombre: string
  descripcion: string
  cuerpo: (opciones: OpcionesPlantilla) => string
}

const escapar = (texto: string) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Elemento con texto editable
const t = (id: string, etiqueta: string, texto: string, clase = '') =>
  `<${etiqueta} data-editable="${id}"${clase ? ` class="${clase}"` : ''}>${escapar(texto)}</${etiqueta}>`

const enlace = (id: string, texto: string, destino: string, clase = '') =>
  `<a href="${destino}" data-editable="${id}"${clase ? ` class="${clase}"` : ''}>${escapar(texto)}</a>`

const ICONOS = {
  estrella: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  rayo: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  escudo: '<path d="M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6z"/>',
  corazon: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>',
  reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  mapa: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0C18.5 15 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>',
}

const icono = (nombre: keyof typeof ICONOS) =>
  `<span class="p-icono" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">${ICONOS[nombre]}</svg></span>`

function navegacion(opciones: OpcionesPlantilla, enlaces: [string, string, string][]): string {
  const logo = opciones.usoImagen === 'logo' && opciones.imagen ? `<img src="${opciones.imagen}" alt="" />` : ''
  return `<header class="p-nav"><div class="p-contenedor">
  <a class="p-marca" href="#inicio">${logo}<span data-editable="marca">Mi marca</span></a>
  <nav aria-label="Principal"><ul class="p-menu">${enlaces
    .map(([id, texto, destino]) => `<li>${enlace(id, texto, destino)}</li>`)
    .join('')}</ul></nav>
</div></header>`
}

// Bloque decorativo cuando no hay foto: formas geométricas con los colores del tema
const ILUSTRACION = `<svg class="p-ilustracion" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <rect width="400" height="300" fill="var(--color-acento-suave)"/>
  <circle cx="300" cy="90" r="70" fill="var(--color-primario)" opacity=".9"/>
  <rect x="60" y="150" width="150" height="110" rx="18" fill="var(--color-acento)" opacity=".85"/>
  <circle cx="230" cy="225" r="38" fill="var(--color-superficie)"/>
</svg>`

function portada(opciones: OpcionesPlantilla, contenido: string): string {
  const conFoto = opciones.usoImagen === 'portada' && opciones.imagen
  const visual = conFoto ? `<img src="${opciones.imagen}" alt="" />` : ILUSTRACION
  if (opciones.portada === 'fondo') {
    const fondo = conFoto
      ? ` style="background-image: url('${opciones.imagen}')"`
      : ' style="background-image: linear-gradient(135deg, var(--color-primario), var(--color-acento))"'
    return `<section id="inicio" class="p-portada p-portada--fondo"${fondo}><div class="p-contenedor"><div class="p-portada-texto">${contenido}</div></div></section>`
  }
  if (opciones.portada === 'centrada') {
    return `<section id="inicio" class="p-portada p-portada--centrada"><div class="p-contenedor"><div class="p-portada-texto">${contenido}</div><div class="p-portada-imagen">${visual}</div></div></section>`
  }
  return `<section id="inicio" class="p-portada p-portada--dividida"><div class="p-contenedor"><div class="p-portada-texto">${contenido}</div><div class="p-portada-imagen">${visual}</div></div></section>`
}

const pie = (prefijo: string) => `<footer class="p-pie"><div class="p-contenedor">
  <span>© ${new Date().getFullYear()} <span data-editable="marca">Mi marca</span></span>
  ${t(`${prefijo}.pie-nota`, 'span', 'Hecho con cariño.')}
</div></footer>`

const banda = (prefijo: string, id: string, titulo: string, texto: string, boton: string) => `<section id="${id}" class="p-seccion"><div class="p-contenedor"><div class="p-banda">
  <div>${t(`${prefijo}.banda-titulo`, 'h2', titulo)}${t(`${prefijo}.banda-texto`, 'p', texto)}</div>
  ${enlace(`${prefijo}.banda-boton`, boton, `#${id}`, 'p-boton')}
</div></div></section>`

const negocio: Plantilla = {
  id: 'negocio',
  nombre: 'Negocio',
  descripcion: 'Presenta tus servicios y consigue clientes.',
  cuerpo: (o) =>
    [
      navegacion(o, [
        ['negocio.menu-1', 'Servicios', '#servicios'],
        ['negocio.menu-2', 'Nosotros', '#nosotros'],
        ['negocio.menu-3', 'Opiniones', '#opiniones'],
        ['negocio.menu-4', 'Contacto', '#contacto'],
      ]),
      '<main>',
      portada(
        o,
        `${t('negocio.etiqueta', 'span', 'Bienvenido', 'p-etiqueta')}
        ${t('negocio.titulo', 'h1', 'Soluciones claras para hacer crecer tu negocio')}
        ${t('negocio.subtitulo', 'p', 'Te ayudamos a vender más con un servicio cercano, rápido y hecho a tu medida.', 'p-sub')}
        <div class="p-acciones">${enlace('negocio.boton-1', 'Pide tu cotización', '#contacto', 'p-boton')}${enlace('negocio.boton-2', 'Ver servicios', '#servicios', 'p-boton p-boton--secundario')}</div>`,
      ),
      `<section id="servicios" class="p-seccion"><div class="p-contenedor">
        ${t('negocio.servicios-etiqueta', 'span', 'Servicios', 'p-etiqueta')}
        ${t('negocio.servicios-titulo', 'h2', 'Todo lo que necesitas, en un solo lugar', 'p-titulo-seccion')}
        ${t('negocio.servicios-intro', 'p', 'Elige el servicio que mejor se adapte a ti. Si no estás seguro, te asesoramos sin compromiso.', 'p-intro')}
        <div class="p-rejilla">
          <article class="p-tarjeta">${icono('rayo')}${t('negocio.servicio-1', 'h3', 'Atención inmediata')}${t('negocio.servicio-1-texto', 'p', 'Respondemos en menos de 24 horas y resolvemos tu caso desde el primer contacto.')}</article>
          <article class="p-tarjeta">${icono('estrella')}${t('negocio.servicio-2', 'h3', 'Calidad garantizada')}${t('negocio.servicio-2-texto', 'p', 'Trabajamos con los mejores materiales y revisamos cada detalle antes de entregar.')}</article>
          <article class="p-tarjeta">${icono('escudo')}${t('negocio.servicio-3', 'h3', 'Precios justos')}${t('negocio.servicio-3-texto', 'p', 'Presupuestos transparentes, sin letra pequeña ni costos escondidos.')}</article>
        </div>
      </div></section>`,
      `<section id="nosotros" class="p-seccion p-seccion--alt"><div class="p-contenedor p-dos-columnas">
        <div>${t('negocio.nosotros-etiqueta', 'span', 'Nosotros', 'p-etiqueta')}${t('negocio.nosotros-titulo', 'h2', 'Más de 10 años acompañando a nuestros clientes', 'p-titulo-seccion')}${t('negocio.nosotros-texto', 'p', 'Somos un equipo pequeño y apasionado. Creemos en el trato directo, en cumplir lo que prometemos y en construir relaciones de largo plazo.', 'p-intro')}</div>
        <div class="p-cifras">
          <div class="p-cifra">${t('negocio.cifra-1', 'strong', '+500')}${t('negocio.cifra-1-texto', 'span', 'clientes felices')}</div>
          <div class="p-cifra">${t('negocio.cifra-2', 'strong', '98%')}${t('negocio.cifra-2-texto', 'span', 'nos recomiendan')}</div>
          <div class="p-cifra">${t('negocio.cifra-3', 'strong', '24 h')}${t('negocio.cifra-3-texto', 'span', 'tiempo de respuesta')}</div>
        </div>
      </div></section>`,
      `<section id="opiniones" class="p-seccion"><div class="p-contenedor">
        ${t('negocio.opiniones-titulo', 'h2', 'Lo que dicen nuestros clientes', 'p-titulo-seccion')}
        <div class="p-rejilla p-rejilla--2">
          <figure class="p-tarjeta p-cita">${t('negocio.opinion-1', 'blockquote', '“Nos resolvieron en una semana lo que llevábamos meses intentando. Muy profesionales.”')}${t('negocio.opinion-1-autor', 'figcaption', 'Laura Gómez · Tienda Aurora')}</figure>
          <figure class="p-tarjeta p-cita">${t('negocio.opinion-2', 'blockquote', '“Trato cercano, precios claros y un resultado mejor de lo esperado.”')}${t('negocio.opinion-2-autor', 'figcaption', 'Carlos Ruiz · Estudio Norte')}</figure>
        </div>
      </div></section>`,
      banda('negocio', 'contacto', '¿Listo para empezar?', 'Escríbenos y te respondemos hoy mismo.', 'Contactar ahora'),
      '</main>',
      pie('negocio'),
    ].join('\n'),
}

const portafolio: Plantilla = {
  id: 'portafolio',
  nombre: 'Portafolio',
  descripcion: 'Muestra tu trabajo y tus habilidades.',
  cuerpo: (o) =>
    [
      navegacion(o, [
        ['portafolio.menu-1', 'Proyectos', '#proyectos'],
        ['portafolio.menu-2', 'Sobre mí', '#sobre-mi'],
        ['portafolio.menu-3', 'Contacto', '#contacto'],
      ]),
      '<main>',
      portada(
        o,
        `${t('portafolio.etiqueta', 'span', 'Diseñadora y desarrolladora', 'p-etiqueta')}
        ${t('portafolio.titulo', 'h1', 'Hola, soy Ana. Creo experiencias digitales sencillas y bonitas.')}
        ${t('portafolio.subtitulo', 'p', 'Diseño interfaces y sitios web para marcas que quieren comunicar con claridad.', 'p-sub')}
        <div class="p-acciones">${enlace('portafolio.boton-1', 'Ver proyectos', '#proyectos', 'p-boton')}${enlace('portafolio.boton-2', 'Escríbeme', '#contacto', 'p-boton p-boton--secundario')}</div>`,
      ),
      `<section id="proyectos" class="p-seccion"><div class="p-contenedor">
        ${t('portafolio.proyectos-etiqueta', 'span', 'Trabajo reciente', 'p-etiqueta')}
        ${t('portafolio.proyectos-titulo', 'h2', 'Proyectos seleccionados', 'p-titulo-seccion')}
        <div class="p-rejilla p-rejilla--2">
          ${[1, 2, 3, 4]
            .map(
              (n) =>
                `<article class="p-tarjeta p-proyecto"><div class="p-proyecto-imagen p-proyecto-imagen--${n}" aria-hidden="true"><span>0${n}</span></div>${t(`portafolio.proyecto-${n}`, 'h3', ['App de reservas', 'Identidad para Café Luna', 'Tienda en línea', 'Panel de datos'][n - 1])}${t(`portafolio.proyecto-${n}-texto`, 'p', ['Diseño de producto · 2026', 'Marca y papelería · 2025', 'Comercio electrónico · 2025', 'Visualización · 2024'][n - 1])}</article>`,
            )
            .join('')}
        </div>
      </div></section>`,
      `<section id="sobre-mi" class="p-seccion p-seccion--alt"><div class="p-contenedor p-dos-columnas">
        <div>${t('portafolio.sobre-titulo', 'h2', 'Sobre mí', 'p-titulo-seccion')}${t('portafolio.sobre-texto', 'p', 'Llevo seis años diseñando productos digitales. Me encanta entender a las personas que los usan y convertir ideas complejas en algo fácil.', 'p-intro')}</div>
        <ul class="p-chips">${['Diseño de interfaces', 'Prototipos', 'Investigación con usuarios', 'HTML y CSS', 'Identidad de marca', 'Accesibilidad']
          .map((h, i) => `<li>${t(`portafolio.habilidad-${i + 1}`, 'span', h)}</li>`)
          .join('')}</ul>
      </div></section>`,
      banda('portafolio', 'contacto', '¿Tienes un proyecto en mente?', 'Cuéntame tu idea y lo hacemos realidad juntos.', 'Escríbeme'),
      '</main>',
      pie('portafolio'),
    ].join('\n'),
}

const PLATOS: [string, string, string][][] = [
  [
    ['Guacamole de la casa', 'Aguacate, cilantro, limón y totopos recién hechos.', '$95'],
    ['Sopa de tortilla', 'Caldo de jitomate, chile pasilla, queso y crema.', '$85'],
    ['Ensalada de temporada', 'Hojas verdes, fruta fresca y vinagreta de miel.', '$90'],
  ],
  [
    ['Tacos al pastor', 'Cuatro tacos con piña, cebolla y salsa de la casa.', '$120'],
    ['Enchiladas verdes', 'Rellenas de pollo, bañadas en salsa de tomatillo.', '$140'],
    ['Pescado a la talla', 'Filete al carbón con arroz y ensalada.', '$210'],
  ],
]

const restaurante: Plantilla = {
  id: 'restaurante',
  nombre: 'Restaurante',
  descripcion: 'Menú, horarios y reservas para tu local.',
  cuerpo: (o) =>
    [
      navegacion(o, [
        ['restaurante.menu-1', 'Menú', '#menu'],
        ['restaurante.menu-2', 'Horario', '#horario'],
        ['restaurante.menu-3', 'Reservas', '#reservas'],
      ]),
      '<main>',
      portada(
        o,
        `${t('restaurante.etiqueta', 'span', 'Cocina tradicional', 'p-etiqueta')}
        ${t('restaurante.titulo', 'h1', 'Sabores de siempre, hechos con ingredientes de hoy')}
        ${t('restaurante.subtitulo', 'p', 'Un lugar para compartir buena comida, en familia o con amigos.', 'p-sub')}
        <div class="p-acciones">${enlace('restaurante.boton-1', 'Reservar mesa', '#reservas', 'p-boton')}${enlace('restaurante.boton-2', 'Ver el menú', '#menu', 'p-boton p-boton--secundario')}</div>`,
      ),
      `<section id="menu" class="p-seccion"><div class="p-contenedor">
        ${t('restaurante.menu-etiqueta', 'span', 'Nuestro menú', 'p-etiqueta')}
        ${t('restaurante.menu-titulo', 'h2', 'Platos para disfrutar sin prisa', 'p-titulo-seccion')}
        <div class="p-rejilla p-rejilla--2">
          ${PLATOS.map(
            (grupo, g) =>
              `<div class="p-carta">${t(`restaurante.grupo-${g + 1}`, 'h3', g === 0 ? 'Para empezar' : 'Platos fuertes')}<ul>${grupo
                .map(
                  ([nombre, descripcion, precio], i) =>
                    `<li><div>${t(`restaurante.plato-${g + 1}-${i + 1}`, 'strong', nombre)}${t(`restaurante.plato-${g + 1}-${i + 1}-texto`, 'span', descripcion)}</div>${t(`restaurante.plato-${g + 1}-${i + 1}-precio`, 'b', precio)}</li>`,
                )
                .join('')}</ul></div>`,
          ).join('')}
        </div>
      </div></section>`,
      `<section id="horario" class="p-seccion p-seccion--alt"><div class="p-contenedor">
        <div class="p-rejilla p-rejilla--2">
          <article class="p-tarjeta">${icono('reloj')}${t('restaurante.horario-titulo', 'h3', 'Horario')}${t('restaurante.horario-texto', 'p', 'Martes a domingo, de 13:00 a 23:00. Lunes cerrado.')}</article>
          <article class="p-tarjeta">${icono('mapa')}${t('restaurante.lugar-titulo', 'h3', 'Dónde estamos')}${t('restaurante.lugar-texto', 'p', 'Av. Juárez 123, Centro. Estacionamiento a una cuadra.')}</article>
        </div>
      </div></section>`,
      banda('restaurante', 'reservas', 'Reserva tu mesa', 'Llámanos al 55 1234 5678 o escríbenos por WhatsApp.', 'Reservar ahora'),
      '</main>',
      pie('restaurante'),
    ].join('\n'),
}

const evento: Plantilla = {
  id: 'evento',
  nombre: 'Evento',
  descripcion: 'Agenda, ponentes y registro para tu evento.',
  cuerpo: (o) =>
    [
      navegacion(o, [
        ['evento.menu-1', 'Agenda', '#agenda'],
        ['evento.menu-2', 'Ponentes', '#ponentes'],
        ['evento.menu-3', 'Preguntas', '#preguntas'],
      ]),
      '<main>',
      portada(
        o,
        `${t('evento.etiqueta', 'span', '15 de marzo · Ciudad de México', 'p-etiqueta')}
        ${t('evento.titulo', 'h1', 'Encuentro de Diseño 2027')}
        ${t('evento.subtitulo', 'p', 'Un día de charlas, talleres y conversaciones sobre el futuro del diseño digital.', 'p-sub')}
        <div class="p-acciones">${enlace('evento.boton-1', 'Registrarme gratis', '#registro', 'p-boton')}${enlace('evento.boton-2', 'Ver agenda', '#agenda', 'p-boton p-boton--secundario')}</div>`,
      ),
      `<section id="agenda" class="p-seccion"><div class="p-contenedor">
        ${t('evento.agenda-etiqueta', 'span', 'Agenda', 'p-etiqueta')}
        ${t('evento.agenda-titulo', 'h2', 'Un día lleno de ideas', 'p-titulo-seccion')}
        <ol class="p-agenda">${[
          ['09:00', 'Bienvenida y café', 'Registro, networking y desayuno ligero.'],
          ['10:00', 'Diseñar para todas las personas', 'Charla principal sobre accesibilidad.'],
          ['12:30', 'Taller de prototipos', 'Manos a la obra en grupos pequeños.'],
          ['16:00', 'Mesa redonda y cierre', 'Preguntas abiertas con los ponentes.'],
        ]
          .map(
            ([hora, titulo, texto], i) =>
              `<li>${t(`evento.hora-${i + 1}`, 'time', hora)}<div>${t(`evento.sesion-${i + 1}`, 'h3', titulo)}${t(`evento.sesion-${i + 1}-texto`, 'p', texto)}</div></li>`,
          )
          .join('')}</ol>
      </div></section>`,
      `<section id="ponentes" class="p-seccion p-seccion--alt"><div class="p-contenedor">
        ${t('evento.ponentes-titulo', 'h2', 'Ponentes', 'p-titulo-seccion')}
        <div class="p-rejilla">${[
          ['MR', 'María Robles', 'Directora de diseño'],
          ['JT', 'Javier Torres', 'Investigador UX'],
          ['SL', 'Sofía León', 'Ilustradora'],
        ]
          .map(
            ([iniciales, nombre, cargo], i) =>
              `<article class="p-tarjeta p-ponente"><span class="p-avatar" aria-hidden="true">${iniciales}</span>${t(`evento.ponente-${i + 1}`, 'h3', nombre)}${t(`evento.ponente-${i + 1}-cargo`, 'p', cargo)}</article>`,
          )
          .join('')}</div>
      </div></section>`,
      `<section id="preguntas" class="p-seccion"><div class="p-contenedor p-estrecho">
        ${t('evento.preguntas-titulo', 'h2', 'Preguntas frecuentes', 'p-titulo-seccion')}
        ${[
          ['¿El evento tiene costo?', 'No, la entrada es gratuita, pero el cupo es limitado.'],
          ['¿Habrá grabaciones?', 'Sí, las charlas principales estarán disponibles una semana después.'],
          ['¿Puedo asistir en línea?', 'Transmitiremos en vivo la charla principal y la mesa redonda.'],
        ]
          .map(
            ([pregunta, respuesta], i) =>
              `<details class="p-pregunta"><summary>${t(`evento.pregunta-${i + 1}`, 'span', pregunta)}</summary>${t(`evento.respuesta-${i + 1}`, 'p', respuesta)}</details>`,
          )
          .join('')}
      </div></section>`,
      banda('evento', 'registro', 'Aparta tu lugar', 'Los cupos se llenan rápido. Regístrate en un minuto.', 'Registrarme'),
      '</main>',
      pie('evento'),
    ].join('\n'),
}

export const PLANTILLAS: Plantilla[] = [negocio, portafolio, restaurante, evento]

export const plantillaPorId = (id: IdPlantilla): Plantilla => PLANTILLAS.find((p) => p.id === id) ?? negocio

// Estilos comunes a todas las plantillas: solo leen las variables del tema
export const CSS_PLANTILLAS = `
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--color-fondo); color: var(--color-texto); font-family: var(--fuente-texto); font-size: 17px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
img, svg { display: block; max-width: 100%; }
a { color: inherit; }
h1, h2, h3 { margin: 0; font-family: var(--fuente-titulos); font-weight: var(--peso-titulos); line-height: 1.15; letter-spacing: -0.01em; }
p, figure, blockquote { margin: 0; }
.p-contenedor { width: min(1120px, 100% - 48px); margin-inline: auto; }
.p-estrecho { width: min(760px, 100% - 48px); }
.p-seccion { padding: calc(var(--espacio) * 88px) 0; }
.p-seccion--alt { background: var(--color-superficie); }
.p-etiqueta { display: inline-block; margin-bottom: 12px; color: var(--color-primario-texto); font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.p-titulo-seccion { margin-bottom: 16px; font-size: clamp(28px, 4vw, 40px); }
.p-intro { max-width: 60ch; margin-bottom: calc(var(--espacio) * 40px); color: var(--color-texto-suave); }
.p-boton { display: inline-flex; align-items: center; padding: 14px 26px; border: 2px solid transparent; border-radius: var(--radio-boton); background: var(--color-primario); color: var(--color-sobre-primario); font-weight: 650; text-decoration: none; transition: background-color 0.15s, transform 0.15s; }
.p-boton:hover { background: var(--color-primario-hover); transform: translateY(-1px); }
.p-boton--secundario { background: transparent; border-color: var(--color-borde); color: var(--color-texto); }
.p-boton--secundario:hover { background: var(--color-superficie-alt); }

.p-nav { position: sticky; top: 0; z-index: 10; border-bottom: 1px solid var(--color-borde); background: color-mix(in oklab, var(--color-fondo) 90%, transparent); backdrop-filter: blur(10px); }
.p-nav .p-contenedor { display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 68px; }
.p-marca { display: flex; align-items: center; gap: 10px; font-family: var(--fuente-titulos); font-size: 20px; font-weight: var(--peso-titulos); text-decoration: none; }
.p-marca img { width: auto; height: 38px; border-radius: calc(var(--radio) / 2); }
.p-menu { display: flex; gap: 28px; margin: 0; padding: 0; list-style: none; font-size: 15px; }
.p-menu a { color: var(--color-texto-suave); text-decoration: none; }
.p-menu a:hover { color: var(--color-texto); }

.p-portada { padding: calc(var(--espacio) * 96px) 0; }
.p-portada h1 { margin-bottom: 20px; font-size: clamp(36px, 6vw, 62px); }
.p-sub { max-width: 52ch; margin-bottom: 32px; color: var(--color-texto-suave); font-size: 19px; }
.p-acciones { display: flex; flex-wrap: wrap; gap: 12px; }
.p-portada-imagen { overflow: hidden; aspect-ratio: 4 / 3; border-radius: var(--radio); background: var(--color-acento-suave); }
.p-portada-imagen img, .p-portada-imagen svg { width: 100%; height: 100%; object-fit: cover; }
.p-portada--dividida .p-contenedor { display: grid; grid-template-columns: 1.1fr 1fr; align-items: center; gap: 56px; }
.p-portada--centrada { text-align: center; }
.p-portada--centrada .p-portada-texto { max-width: 820px; margin-inline: auto; }
.p-portada--centrada .p-sub { margin-inline: auto; }
.p-portada--centrada .p-acciones { justify-content: center; }
.p-portada--centrada .p-portada-imagen { margin-top: 56px; aspect-ratio: 16 / 7; }
.p-portada--fondo { position: relative; display: flex; align-items: center; min-height: 580px; background-position: center; background-size: cover; color: #ffffff; }
.p-portada--fondo::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.3)); }
.p-portada--fondo .p-contenedor { position: relative; }
.p-portada--fondo .p-portada-texto { max-width: 680px; }
.p-portada--fondo .p-etiqueta, .p-portada--fondo .p-sub { color: rgba(255, 255, 255, 0.88); }
.p-portada--fondo .p-boton--secundario { border-color: rgba(255, 255, 255, 0.55); color: #ffffff; }
.p-portada--fondo .p-boton--secundario:hover { background: rgba(255, 255, 255, 0.12); }

.p-rejilla { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
.p-rejilla--2 { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.p-tarjeta { padding: calc(var(--espacio) * 28px); border: 1px solid var(--color-borde); border-radius: var(--radio); background: var(--color-superficie); }
.p-seccion--alt .p-tarjeta { background: var(--color-fondo); }
.p-tarjeta h3 { margin-bottom: 8px; font-size: 20px; }
.p-tarjeta p { color: var(--color-texto-suave); }
.p-icono { display: grid; place-items: center; width: 46px; height: 46px; margin-bottom: 18px; border-radius: calc(var(--radio) / 2 + 4px); background: var(--color-acento-suave); color: var(--color-acento); }
.p-dos-columnas { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 56px; }
.p-dos-columnas .p-intro { margin-bottom: 0; }
.p-cifras { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.p-cifra { display: flex; flex-direction: column; padding: 24px 16px; border-radius: var(--radio); background: var(--color-fondo); text-align: center; }
.p-cifra strong { color: var(--color-primario-texto); font-family: var(--fuente-titulos); font-size: 34px; line-height: 1.1; }
.p-cifra span { color: var(--color-texto-suave); font-size: 14px; }
.p-cita blockquote { margin-bottom: 16px; font-size: 19px; }
.p-cita figcaption { color: var(--color-texto-suave); font-size: 15px; font-weight: 600; }

.p-banda { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 24px; padding: calc(var(--espacio) * 56px); border-radius: var(--radio); background: var(--color-primario); color: var(--color-sobre-primario); }
.p-banda h2 { margin-bottom: 8px; font-size: clamp(26px, 3.4vw, 36px); }
.p-banda p { opacity: 0.9; }
.p-banda .p-boton { background: var(--color-sobre-primario); color: var(--color-primario); }
.p-banda .p-boton:hover { background: var(--color-sobre-primario); opacity: 0.92; }

.p-proyecto { padding: 0; overflow: hidden; }
.p-proyecto h3, .p-proyecto p { padding-inline: 24px; }
.p-proyecto h3 { margin-top: 20px; }
.p-proyecto p { padding-bottom: 22px; }
.p-proyecto-imagen { display: grid; place-items: end start; aspect-ratio: 16 / 10; padding: 20px; font-family: var(--fuente-titulos); font-size: 40px; font-weight: var(--peso-titulos); }
.p-proyecto-imagen--1 { background: var(--color-primario); color: var(--color-sobre-primario); }
.p-proyecto-imagen--2 { background: var(--color-acento); color: var(--color-sobre-acento); }
.p-proyecto-imagen--3 { background: var(--color-acento-suave); color: var(--color-texto); }
.p-proyecto-imagen--4 { background: var(--color-superficie-alt); color: var(--color-texto); }
.p-chips { display: flex; flex-wrap: wrap; gap: 10px; margin: 0; padding: 0; list-style: none; }
.p-chips li { padding: 10px 18px; border: 1px solid var(--color-borde); border-radius: var(--radio-boton); background: var(--color-fondo); font-weight: 600; }

.p-carta h3 { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--color-primario); font-size: 24px; }
.p-carta ul { margin: 0; padding: 0; list-style: none; }
.p-carta li { display: flex; justify-content: space-between; gap: 20px; padding: 14px 0; border-bottom: 1px solid var(--color-borde); }
.p-carta li div { display: flex; flex-direction: column; }
.p-carta li span { color: var(--color-texto-suave); font-size: 15px; }
.p-carta li b { color: var(--color-primario-texto); white-space: nowrap; }

.p-agenda { display: grid; gap: 16px; margin: 0; padding: 0; list-style: none; }
.p-agenda li { display: grid; grid-template-columns: 90px 1fr; gap: 24px; padding: 22px 24px; border: 1px solid var(--color-borde); border-left: 4px solid var(--color-primario); border-radius: var(--radio); background: var(--color-superficie); }
.p-agenda time { color: var(--color-primario-texto); font-family: var(--fuente-titulos); font-size: 20px; font-weight: var(--peso-titulos); }
.p-agenda h3 { margin-bottom: 4px; font-size: 19px; }
.p-agenda p { color: var(--color-texto-suave); }
.p-ponente { text-align: center; }
.p-avatar { display: inline-grid; place-items: center; width: 88px; height: 88px; margin-bottom: 16px; border-radius: 50%; background: var(--color-acento-suave); color: var(--color-acento); font-family: var(--fuente-titulos); font-size: 26px; font-weight: var(--peso-titulos); }
.p-pregunta { border-bottom: 1px solid var(--color-borde); }
.p-pregunta summary { padding: 20px 0; cursor: pointer; font-size: 18px; font-weight: 650; }
.p-pregunta p { padding-bottom: 20px; color: var(--color-texto-suave); }

.p-pie { padding: 32px 0; border-top: 1px solid var(--color-borde); color: var(--color-texto-suave); font-size: 14px; }
.p-pie .p-contenedor { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; }

@media (max-width: 860px) {
  .p-portada--dividida .p-contenedor, .p-dos-columnas { grid-template-columns: 1fr; gap: 40px; }
  .p-menu { display: none; }
  .p-cifras { grid-template-columns: 1fr; }
  .p-agenda li { grid-template-columns: 1fr; gap: 6px; }
  .p-banda { padding: 32px; }
}
`
