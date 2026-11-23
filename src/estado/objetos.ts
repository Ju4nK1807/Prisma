// Objetos que se pueden añadir a la página: formas listas y la colección de cada usuario

export interface ObjetoGuardado {
  id: string
  nombre: string
  marcado: string
}

// Las formas usan las variables del tema: cambian de color con la página
const forma = (contenido: string, vista = '0 0 100 100') =>
  `<svg viewBox="${vista}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${contenido}</svg>`

export const FORMAS: ObjetoGuardado[] = [
  { id: 'circulo', nombre: 'Círculo', marcado: forma('<circle cx="50" cy="50" r="46" fill="var(--color-primario, #5468ff)"/>') },
  { id: 'cuadrado', nombre: 'Cuadrado', marcado: forma('<rect x="6" y="6" width="88" height="88" rx="16" fill="var(--color-acento, #ff8a3d)"/>') },
  { id: 'triangulo', nombre: 'Triángulo', marcado: forma('<path d="M50 6 94 90H6Z" fill="var(--color-primario, #5468ff)"/>') },
  {
    id: 'estrella',
    nombre: 'Estrella',
    marcado: forma('<path d="m50 5 13.5 28.5 31 3.8-22.8 21.4 5.8 30.8L50 74.4 22.5 89.5l5.8-30.8L5.5 37.3l31-3.8Z" fill="var(--color-acento, #ffb020)"/>'),
  },
  {
    id: 'corazon',
    nombre: 'Corazón',
    marcado: forma('<path d="M50 88S8 62 8 34a21 21 0 0 1 42-6 21 21 0 0 1 42 6c0 28-42 54-42 54Z" fill="var(--color-primario, #e0457b)"/>'),
  },
  { id: 'rombo', nombre: 'Rombo', marcado: forma('<path d="M50 4 96 50 50 96 4 50Z" fill="var(--color-acento-suave, #dfe5ff)" stroke="var(--color-acento, #5468ff)" stroke-width="4"/>') },
  {
    id: 'onda',
    nombre: 'Onda',
    marcado: forma('<path d="M0 30c25-20 50 20 75 0s50 20 75 0 50-20 75 0v20H0Z" fill="var(--color-primario, #5468ff)" opacity=".85"/>', '0 0 225 50'),
  },
  {
    id: 'burbujas',
    nombre: 'Burbujas',
    marcado: forma(
      '<circle cx="30" cy="62" r="24" fill="var(--color-primario, #5468ff)" opacity=".85"/><circle cx="68" cy="34" r="18" fill="var(--color-acento, #ff8a3d)" opacity=".85"/><circle cx="74" cy="76" r="10" fill="var(--color-acento-suave, #dfe5ff)"/>',
    ),
  },
  {
    id: 'hoja',
    nombre: 'Hoja',
    marcado: forma('<path d="M88 10C40 10 12 38 12 76v14h14c38 0 62-30 62-80Z" fill="var(--color-acento, #2f9e6a)"/><path d="M18 84 70 30" stroke="var(--color-superficie, #fff)" stroke-width="3"/>'),
  },
  {
    id: 'linea',
    nombre: 'Línea',
    marcado: forma('<rect x="0" y="0" width="200" height="8" rx="4" fill="var(--color-primario, #5468ff)"/>', '0 0 200 8'),
  },
  {
    id: 'puntos',
    nombre: 'Puntos',
    marcado: forma(
      Array.from({ length: 16 }, (_, i) => `<circle cx="${14 + (i % 4) * 24}" cy="${14 + Math.floor(i / 4) * 24}" r="5" fill="var(--color-acento, #5468ff)"/>`).join(''),
    ),
  },
  {
    id: 'flecha',
    nombre: 'Flecha',
    marcado: forma('<path d="M6 42h62V22l28 28-28 28V58H6Z" fill="var(--color-primario, #5468ff)"/>'),
  },
]

const clave = (usuario: string) => `prisma:objetos:${usuario}`

export function leerMisObjetos(usuario: string): ObjetoGuardado[] {
  try {
    const datos: unknown = JSON.parse(localStorage.getItem(clave(usuario)) ?? '[]')
    if (!Array.isArray(datos)) return []
    return datos.filter(
      (o): o is ObjetoGuardado => typeof o === 'object' && o !== null && typeof o.id === 'string' && typeof o.nombre === 'string' && typeof o.marcado === 'string',
    )
  } catch {
    return []
  }
}

function escribir(usuario: string, objetos: ObjetoGuardado[]): boolean {
  try {
    localStorage.setItem(clave(usuario), JSON.stringify(objetos))
    return true
  } catch {
    // Sin espacio: un objeto con una imagen enorme no cabe
    return false
  }
}

export function guardarMiObjeto(usuario: string, nombre: string, marcado: string): ObjetoGuardado[] | null {
  const nuevo: ObjetoGuardado = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, nombre, marcado }
  const lista = [nuevo, ...leerMisObjetos(usuario)].slice(0, 40)
  return escribir(usuario, lista) ? lista : null
}

export function borrarMiObjeto(usuario: string, id: string): ObjetoGuardado[] {
  const lista = leerMisObjetos(usuario).filter((o) => o.id !== id)
  escribir(usuario, lista)
  return lista
}
