import urlInter from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url'
import urlJetBrains from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url'

type Familia = 'inter' | 'jetbrains'

const FAMILIAS: Record<Familia, { nombre: string; url: string }> = {
  inter: { nombre: 'Inter Variable', url: urlInter },
  jetbrains: { nombre: 'JetBrains Mono Variable', url: urlJetBrains },
}

const caraTipografica = (nombre: string, fuente: string) =>
  `@font-face { font-family: '${nombre}'; font-style: normal; font-display: swap; font-weight: 100 900; src: ${fuente} format('woff2'); }`

/** Fuentes por URL: para la vista previa, que comparte origen con la app. */
export function cssFuentesVista(): string {
  return (Object.keys(FAMILIAS) as Familia[]).map((f) => caraTipografica(FAMILIAS[f].nombre, `url('${FAMILIAS[f].url}')`)).join('\n')
}

async function aBase64(url: string): Promise<string> {
  const respuesta = await fetch(url)
  const bytes = new Uint8Array(await respuesta.arrayBuffer())
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binario)
}

/** Fuentes incrustadas en el archivo: la página exportada se ve igual en cualquier equipo. */
export async function cssFuentesIncrustadas(familias: Familia[]): Promise<string> {
  const caras = await Promise.all(
    familias.map(async (f) => caraTipografica(FAMILIAS[f].nombre, `url(data:font/woff2;base64,${await aBase64(FAMILIAS[f].url)})`)),
  )
  return caras.join('\n')
}
