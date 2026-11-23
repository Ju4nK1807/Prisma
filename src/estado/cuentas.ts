// Cuentas locales: Prisma no tiene servidor, así que las cuentas viven en este equipo.
// Las contraseñas nunca se guardan: solo un hash PBKDF2 con sal aleatoria por cuenta.

export interface Cuenta {
  correo: string
  nombre: string
}

interface CuentaGuardada extends Cuenta {
  sal: string
  hash: string
  creada: string
}

const CLAVE_CUENTAS = 'prisma:cuentas'
const CLAVE_SESION = 'prisma:sesion'
const ITERACIONES = 210_000

export type ResultadoAcceso = { ok: true; cuenta: Cuenta } | { ok: false; error: string; campo?: 'nombre' | 'correo' | 'contrasena' }

const aBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const desdeBase64 = (texto: string) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0))

async function derivar(contrasena: string, sal: Uint8Array<ArrayBuffer>): Promise<string> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(contrasena), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: ITERACIONES }, material, 256)
  return aBase64(new Uint8Array(bits))
}

// Comparación en tiempo constante, para no revelar cuántos caracteres coinciden
function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferencia = 0
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diferencia === 0
}

function leerCuentas(): CuentaGuardada[] {
  try {
    const datos: unknown = JSON.parse(localStorage.getItem(CLAVE_CUENTAS) ?? '[]')
    if (!Array.isArray(datos)) return []
    return datos.filter(
      (c): c is CuentaGuardada =>
        typeof c === 'object' && c !== null && typeof c.correo === 'string' && typeof c.hash === 'string' && typeof c.sal === 'string',
    )
  } catch {
    return []
  }
}

const normalizarCorreo = (correo: string) => correo.trim().toLowerCase()
export const correoValido = (correo: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())

/** Puntuación de 0 a 4 de la seguridad de una contraseña, para el medidor del registro. */
export function fuerzaContrasena(contrasena: string): number {
  if (!contrasena) return 0
  let puntos = 0
  if (contrasena.length >= 8) puntos++
  if (contrasena.length >= 12) puntos++
  if (/[a-z]/.test(contrasena) && /[A-Z]/.test(contrasena)) puntos++
  if (/\d/.test(contrasena) && /[^A-Za-z0-9]/.test(contrasena)) puntos++
  return Math.min(4, puntos)
}

export async function registrar(nombre: string, correo: string, contrasena: string): Promise<ResultadoAcceso> {
  const limpio = nombre.trim()
  const clave = normalizarCorreo(correo)
  if (limpio.length < 2) return { ok: false, error: 'Escribe tu nombre.', campo: 'nombre' }
  if (!correoValido(clave)) return { ok: false, error: 'Ese correo no parece válido.', campo: 'correo' }
  if (contrasena.length < 8) return { ok: false, error: 'La contraseña necesita al menos 8 caracteres.', campo: 'contrasena' }
  const cuentas = leerCuentas()
  if (cuentas.some((c) => c.correo === clave)) return { ok: false, error: 'Ya existe una cuenta con ese correo.', campo: 'correo' }

  const sal = crypto.getRandomValues(new Uint8Array(16))
  const nueva: CuentaGuardada = { correo: clave, nombre: limpio, sal: aBase64(sal), hash: await derivar(contrasena, sal), creada: new Date().toISOString() }
  localStorage.setItem(CLAVE_CUENTAS, JSON.stringify([...cuentas, nueva]))
  return { ok: true, cuenta: { correo: nueva.correo, nombre: nueva.nombre } }
}

export async function iniciarSesion(correo: string, contrasena: string): Promise<ResultadoAcceso> {
  const clave = normalizarCorreo(correo)
  if (!correoValido(clave)) return { ok: false, error: 'Ese correo no parece válido.', campo: 'correo' }
  const cuenta = leerCuentas().find((c) => c.correo === clave)
  // El mismo mensaje para correo y contraseña: no revela qué cuentas existen
  const fallo: ResultadoAcceso = { ok: false, error: 'Correo o contraseña incorrectos.', campo: 'contrasena' }
  if (!cuenta) {
    await derivar(contrasena, crypto.getRandomValues(new Uint8Array(16)))
    return fallo
  }
  const hash = await derivar(contrasena, desdeBase64(cuenta.sal))
  return iguales(hash, cuenta.hash) ? { ok: true, cuenta: { correo: cuenta.correo, nombre: cuenta.nombre } } : fallo
}

export const hayCuentas = () => leerCuentas().length > 0

/** Recordar la sesión la guarda entre aperturas; si no, dura hasta cerrar la app. */
export function guardarSesion(cuenta: Cuenta, recordar: boolean): void {
  const datos = JSON.stringify(cuenta)
  try {
    if (recordar) localStorage.setItem(CLAVE_SESION, datos)
    else sessionStorage.setItem(CLAVE_SESION, datos)
  } catch {
    // Sin almacenamiento: la sesión dura lo que dure esta pantalla
  }
}

export function leerSesion(): Cuenta | null {
  try {
    const texto = localStorage.getItem(CLAVE_SESION) ?? sessionStorage.getItem(CLAVE_SESION)
    if (!texto) return null
    const datos: unknown = JSON.parse(texto)
    if (typeof datos !== 'object' || datos === null || !('correo' in datos) || !('nombre' in datos)) return null
    const { correo, nombre } = datos
    if (typeof correo !== 'string' || typeof nombre !== 'string') return null
    // La sesión solo vale si la cuenta sigue existiendo
    return leerCuentas().some((c) => c.correo === correo) ? { correo, nombre } : null
  } catch {
    return null
  }
}

export function cerrarSesion(): void {
  try {
    localStorage.removeItem(CLAVE_SESION)
    sessionStorage.removeItem(CLAVE_SESION)
  } catch {
    // Nada que borrar
  }
}

export const iniciales = (nombre: string) =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('')
