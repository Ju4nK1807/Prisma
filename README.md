# Prisma

Prisma convierte una imagen en una página web lista para publicar. Subes tu logo, una foto de tu
negocio o la captura de una página que te guste, y Prisma te entrega una página completa que puedes
personalizar con unos pocos clics y exportar como un único archivo.

## Cómo funciona

1. **Sube una imagen.** Arrástrala a la ventana o búscala (PNG, JPG, WEBP o GIF). Prisma encuentra
   sus colores al instante.
2. **Elige qué hacer con ella.**
   - **Usar sus colores en una plantilla.** Para logos y fotos. Eliges el tipo de página (negocio,
     portafolio, restaurante o evento) y Prisma la pinta con tus colores. Funciona sin internet.
   - **Recrear la página de la imagen.** Para la captura de una web o un boceto dibujado. La
     inteligencia artificial (Claude, de Anthropic) la convierte en una página real. Necesita
     internet y una clave de API.
3. **Personalízala.** Haz clic en cualquier texto de la página y escribe. Desde el panel de la
   derecha puedes cambiar:
   - el tipo de página y el diseño de la portada;
   - los colores: qué color de tu paleta es el principal, el acento y el fondo, con un botón
     **Mezclar colores** que reparte la paleta de otra forma, y fondo claro u oscuro;
   - la letra, las esquinas y el espacio entre secciones;
   - dónde va tu imagen: en la portada, como logo o en ningún sitio.

   En una página creada con IA también puedes **pedir cambios con tus palabras**, por ejemplo
   «añade una sección de precios con tres planes».
4. **Exporta.** Prisma guarda `index.html` dentro de una carpeta con el nombre de tu página. Es un
   solo archivo con todo incluido (imagen, letras y colores) que funciona en cualquier navegador.
   Para publicarla, arrastra esa carpeta a [Netlify Drop](https://app.netlify.com/drop) y tendrás un
   enlace para compartirla.

Mientras trabajas puedes ver la página como en una computadora, una tableta o un celular. Prisma
guarda tu trabajo automáticamente: si cierras la app, al abrirla sigues donde lo dejaste.

## Instalación y uso

Requisitos: Node.js 22.12 o superior.

```bash
npm install      # instala las dependencias
npm run dev      # abre la aplicación en modo desarrollo
npm run build    # comprueba tipos, compila y crea el instalador
```

`npm run build` crea el instalador en `release/0.1.0/Prisma-0.1.0-Setup.exe`. La versión sin
instalar queda en `release/0.1.0/win-unpacked/Prisma.exe`.

> **Windows 11 y el Control Inteligente de Aplicaciones.** Si está activado, Windows bloquea Electron
> y el instalador porque no están firmados digitalmente. Desactívalo en *Seguridad de Windows →
> Control de aplicaciones y navegador → Configuración de Control Inteligente de Aplicaciones*.

### Modo IA

El modo «Recrear la página de la imagen» necesita una clave de API de Anthropic. Consíguela en
[console.anthropic.com](https://console.anthropic.com/settings/keys) y pégala en **Ajustes de IA**.
Prisma la comprueba antes de guardarla y la guarda cifrada con el almacén seguro del sistema
operativo. La clave nunca llega a la interfaz: todas las peticiones salen del proceso principal de
Electron. Cada página generada tiene un pequeño costo en tu cuenta de Anthropic.

## Atajos de teclado

| Atajo | Acción |
| --- | --- |
| `Ctrl+Z` | Deshacer |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Rehacer |
| `Ctrl+E` | Exportar la página |
| `Ctrl+N` | Empezar una página nueva |

Funcionan también mientras escribes dentro de la página.

## Decisiones de diseño

**Una sola pregunta por pantalla.** La versión anterior de Prisma era un generador de sistemas de
diseño con tres paneles llenos de controles técnicos. Resultaba difícil para quien no es diseñador.
Ahora el inicio es un camino guiado (imagen → qué hacer → tipo de página) y el editor solo ofrece
decisiones que cualquier persona entiende: qué color va en los botones, qué letra le gusta, si
quiere esquinas rectas o redondas.

**La página es la protagonista.** La vista previa ocupa casi toda la ventana y los textos se editan
directamente sobre ella, como en un documento, en lugar de en formularios aparte.

**Los colores siempre se leen bien.** El usuario elige qué color cumple cada papel, pero Prisma
calcula el resto (fondos, bordes, textos secundarios) en el espacio de color OKLCH y ajusta la
luminosidad hasta alcanzar el contraste mínimo de WCAG 2.1 (4.5:1 para texto). Por eso «Mezclar
colores» nunca produce una página ilegible, y el panel lo confirma con un indicador.

**La paleta sale de la imagen.** Prisma reduce la imagen, agrupa sus píxeles con k-means en el
espacio OKLab (perceptualmente uniforme) y se queda con los colores dominantes. Si la imagen es
casi gris, como un logo en blanco y negro, añade dos colores derivados de su tono para que haya un
color principal y un acento.

**Todo depende de variables CSS.** Las plantillas y las páginas creadas por IA usan las mismas
variables (`--color-primario`, `--fuente-titulos`, `--radio`…). Cambiar una opción solo reescribe
esas variables, así que el cambio se ve al instante, sin recargar la página ni perder lo que estás
escribiendo.

**Seguridad.** La interfaz corre con `contextIsolation` y `sandbox`, y el preload solo expone las
funciones necesarias. Antes de mostrar una página creada por IA, Prisma elimina cualquier
JavaScript y manejador de eventos, de modo que la página exportada es solo HTML y CSS.

## Estructura del proyecto

```
electron/
  main.ts          ventana, menú, diálogos de archivo y clave de IA cifrada
  ia.ts            peticiones a Claude (generar y modificar páginas)
  preload.ts       puente seguro entre la interfaz y el proceso principal
  compartido.ts    contrato de mensajes IPC
src/
  App.tsx          paso del inicio al editor
  paneles/         Inicio, Editor, Panel de opciones, Vista previa editable, diálogos
  estado/          el proyecto (fuente única de verdad), historial de deshacer, IA
  logica/          funciones puras: color, contraste, paleta, tema, plantillas, página, imagen
  controles/       piezas de interfaz reutilizables
  estilos/app.css  la interfaz de Prisma
```
