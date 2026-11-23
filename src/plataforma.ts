// Acceso al puente de Electron expuesto por el preload
export const plataforma = window.prisma

export async function copiarTexto(texto: string): Promise<void> {
  if (plataforma) {
    await plataforma.copiarTexto(texto)
    return
  }
  await navigator.clipboard.writeText(texto)
}
