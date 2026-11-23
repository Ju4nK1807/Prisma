import type { ReactNode } from 'react'

interface PropsIcono {
  tamano?: number
  className?: string
}

// Iconos en línea: retícula de 16 px, trazo de 1.5
function Icono({ tamano = 16, className, children }: PropsIcono & { children: ReactNode }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  )
}

export const IconoTriangulo = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M6 4.5 10.5 8 6 11.5Z" fill="currentColor" strokeWidth={1} />
  </Icono>
)

export const IconoPrisma = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M8 1.75 14.25 13.5H1.75Z" />
    <path d="M8 1.75v11.75M8 7.5l6.25 6" />
  </Icono>
)

export const IconoSol = (p: PropsIcono) => (
  <Icono {...p}>
    <circle cx="8" cy="8" r="2.75" />
    <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9" />
  </Icono>
)

export const IconoLuna = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M13.5 9.5A5.75 5.75 0 0 1 6.5 2.5a5.75 5.75 0 1 0 7 7Z" />
  </Icono>
)

export const IconoCarpeta = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M1.75 4.25c0-.55.45-1 1-1h3.1l1.5 1.5h5.9c.55 0 1 .45 1 1v6.5c0 .55-.45 1-1 1H2.75c-.55 0-1-.45-1-1Z" />
  </Icono>
)

export const IconoGuardar = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M2.25 3.25c0-.55.45-1 1-1h7.5l3 3v7.5c0 .55-.45 1-1 1h-9.5c-.55 0-1-.45-1-1Z" />
    <path d="M5 2.25v3h5v-3M4.75 13.75v-4.5h6.5v4.5" />
  </Icono>
)

export const IconoPuntos = (p: PropsIcono) => (
  <Icono {...p}>
    <circle cx="3.5" cy="8" r=".9" fill="currentColor" stroke="none" />
    <circle cx="8" cy="8" r=".9" fill="currentColor" stroke="none" />
    <circle cx="12.5" cy="8" r=".9" fill="currentColor" stroke="none" />
  </Icono>
)

export const IconoCopiar = (p: PropsIcono) => (
  <Icono {...p}>
    <rect x="5.25" y="5.25" width="8.5" height="8.5" rx="1.25" />
    <path d="M10.75 5.25v-2c0-.55-.45-1-1-1h-6.5c-.55 0-1 .45-1 1v6.5c0 .55.45 1 1 1h2" />
  </Icono>
)

export const IconoDescargar = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M8 2.25v8M4.75 7 8 10.25 11.25 7M2.75 13.25h10.5" />
  </Icono>
)

export const IconoPanelDerecho = (p: PropsIcono) => (
  <Icono {...p}>
    <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.25" />
    <path d="M10 2.75v10.5" />
  </Icono>
)

export const IconoChevronIzquierda = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M10 3.5 5.5 8l4.5 4.5" />
  </Icono>
)

export const IconoChevronDerecha = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M6 3.5 10.5 8 6 12.5" />
  </Icono>
)

export const IconoChevronAbajo = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M3.5 6 8 10.5 12.5 6" />
  </Icono>
)

export const IconoDeshacer = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M5.25 4 2.25 7l3 3" />
    <path d="M2.5 7h7.25a3.75 3.75 0 0 1 0 7.5H7.5" />
  </Icono>
)

export const IconoRehacer = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="m10.75 4 3 3-3 3" />
    <path d="M13.5 7H6.25a3.75 3.75 0 0 0 0 7.5H8.5" />
  </Icono>
)

export const IconoCheck = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="m3 8.5 3.25 3.25L13 5" />
  </Icono>
)

export const IconoCerrar = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </Icono>
)

export const IconoMas = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M8 3v10M3 8h10" />
  </Icono>
)

export const IconoInfo = (p: PropsIcono) => (
  <Icono {...p}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M8 7.25V11M8 5h.01" />
  </Icono>
)

export const IconoExito = (p: PropsIcono) => (
  <Icono {...p}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="m5.25 8.25 1.75 1.75 3.75-3.75" />
  </Icono>
)

export const IconoAdvertencia = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M7.13 2.5a1 1 0 0 1 1.74 0l5.4 9.5a1 1 0 0 1-.87 1.5H2.6a1 1 0 0 1-.87-1.5Z" />
    <path d="M8 6.25v3M8 11.25h.01" />
  </Icono>
)

export const IconoError = (p: PropsIcono) => (
  <Icono {...p}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="m5.75 5.75 4.5 4.5M10.25 5.75l-4.5 4.5" />
  </Icono>
)

export const IconoBuscar = (p: PropsIcono) => (
  <Icono {...p}>
    <circle cx="7" cy="7" r="4.25" />
    <path d="m10.25 10.25 3.5 3.5" />
  </Icono>
)

export const IconoInicio = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M2.25 7 8 2.25 13.75 7v6c0 .55-.45 1-1 1h-2.5v-4h-4.5v4h-2.5c-.55 0-1-.45-1-1Z" />
  </Icono>
)

export const IconoGrafico = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M2.25 13.75h11.5M4.5 11V8M8 11V4.5M11.5 11V6.5" />
  </Icono>
)

export const IconoUsuarios = (p: PropsIcono) => (
  <Icono {...p}>
    <circle cx="6" cy="5.5" r="2.25" />
    <path d="M1.75 13.25c.4-2.2 2.1-3.5 4.25-3.5s3.85 1.3 4.25 3.5M10.5 3.4a2.25 2.25 0 0 1 0 4.2M12 9.9c1.2.5 2 1.6 2.25 3.35" />
  </Icono>
)

export const IconoArchivo = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M3.75 2.25c0-.55.45-1 1-1h4.5l3 3v9.5c0 .55-.45 1-1 1h-6.5c-.55 0-1-.45-1-1Z" />
    <path d="M9 1.25v3.25h3.25M6 8.25h4M6 10.75h4" />
  </Icono>
)

export const IconoAjustes = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M2.25 4.5h6.5M11.75 4.5h2M2.25 11.5h2M7.25 11.5h6.5" />
    <circle cx="10.25" cy="4.5" r="1.5" />
    <circle cx="5.75" cy="11.5" r="1.5" />
  </Icono>
)

export const IconoCampana = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M4 6.5a4 4 0 0 1 8 0c0 3.5 1.5 4.75 1.5 4.75h-11S4 10 4 6.5ZM6.5 13.75a1.6 1.6 0 0 0 3 0" />
  </Icono>
)

export const IconoPlantilla = (p: PropsIcono) => (
  <Icono {...p}>
    <rect x="2.25" y="2.25" width="11.5" height="11.5" rx="1.25" />
    <path d="M2.25 6h11.5M6 6v7.75" />
  </Icono>
)

export const IconoReiniciar = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M2.75 8a5.25 5.25 0 1 0 1.6-3.8" />
    <path d="M2.5 2.5v3h3" />
  </Icono>
)

export const IconoSubir = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M8 10.5V2.75M4.75 6 8 2.75 11.25 6M2.75 10.5v1.75c0 .55.45 1 1 1h8.5c.55 0 1-.45 1-1V10.5" />
  </Icono>
)

export const IconoImagen = (p: PropsIcono) => (
  <Icono {...p}>
    <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.5" />
    <circle cx="5.5" cy="6.25" r="1.25" />
    <path d="m2 12 3.75-3.5 2.5 2.25L10.5 8l3.5 3.5" />
  </Icono>
)

export const IconoVarita = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="m2.5 13.5 7.5-7.5M9 5l2 2" />
    <path d="M11.5 1.75v2M10.5 2.75h2M13.75 5.25v1.5M13 6h1.5M6 1.75v1.5M5.25 2.5h1.5" />
  </Icono>
)

export const IconoMezclar = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M2 4.5h2.5c2.5 0 4.5 7 7 7H14M2 11.5h2.5c1 0 1.9-1 2.6-2.2M9 6.7c.7-1.2 1.6-2.2 2.5-2.2H14" />
    <path d="m12.25 2.75 1.75 1.75-1.75 1.75M12.25 9.75l1.75 1.75-1.75 1.75" />
  </Icono>
)

export const IconoEscritorio = (p: PropsIcono) => (
  <Icono {...p}>
    <rect x="1.75" y="2.5" width="12.5" height="8.5" rx="1.25" />
    <path d="M5.5 13.75h5M8 11v2.75" />
  </Icono>
)

export const IconoTableta = (p: PropsIcono) => (
  <Icono {...p}>
    <rect x="3" y="1.75" width="10" height="12.5" rx="1.5" />
    <path d="M7 12h2" />
  </Icono>
)

export const IconoMovil = (p: PropsIcono) => (
  <Icono {...p}>
    <rect x="4.5" y="1.75" width="7" height="12.5" rx="1.5" />
    <path d="M7.25 12.25h1.5" />
  </Icono>
)

export const IconoExterno = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M9.5 2.25h4.25V6.5M13.5 2.5 7.5 8.5" />
    <path d="M11.75 9.5v3.25c0 .55-.45 1-1 1h-7.5c-.55 0-1-.45-1-1v-7.5c0-.55.45-1 1-1H6.5" />
  </Icono>
)

export const IconoLlave = (p: PropsIcono) => (
  <Icono {...p}>
    <circle cx="5" cy="11" r="2.75" />
    <path d="m7 9 6.25-6.25M11 5l1.75 1.75M9.5 6.5l1.25 1.25" />
  </Icono>
)

export const IconoPincel = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M13.75 2.25c-2 1.25-5.5 4.75-6.75 6.75l1.5 1.5c2-1.25 5.5-4.75 6.75-6.75Z" />
    <path d="M6.5 9.5c-1.75 0-2.75 1-2.75 2.5 0 .9-.5 1.5-1.5 1.75 3.5.75 6.25-.5 6.25-2.75Z" />
  </Icono>
)

export const IconoTexto = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M3 4V2.75h10V4M8 2.75v10.5M6 13.25h4" />
  </Icono>
)
