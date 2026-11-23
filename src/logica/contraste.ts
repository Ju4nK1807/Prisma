import { hexAOklch, hexARgb, oklchAHex } from './color'

// Linealización según WCAG 2.1 (umbral 0.03928)
const canalLineal = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

export function luminanciaRelativa(hex: string): number {
  const { r, g, b } = hexARgb(hex)
  return 0.2126 * canalLineal(r) + 0.7152 * canalLineal(g) + 0.0722 * canalLineal(b)
}

export function razonContraste(a: string, b: string): number {
  const la = luminanciaRelativa(a)
  const lb = luminanciaRelativa(b)
  const [claro, oscuro] = la > lb ? [la, lb] : [lb, la]
  return (claro + 0.05) / (oscuro + 0.05)
}

export function mejorTextoSobre(fondo: string, claro: string, oscuro: string): string {
  return razonContraste(claro, fondo) >= razonContraste(oscuro, fondo) ? claro : oscuro
}

/**
 * Oscurece o aclara un color (conservando tono y croma) hasta que alcance la razón de
 * contraste pedida sobre el fondo. Sobre fondos claros oscurece; sobre oscuros aclara.
 */
export function ajustarContraste(hex: string, fondo: string, objetivo: number): string {
  if (razonContraste(hex, fondo) >= objetivo) return hex
  const color = hexAOklch(hex)
  const direccion = luminanciaRelativa(fondo) > 0.18 ? -1 : 1
  let resultado = hex
  for (let paso = 1; paso <= 50; paso++) {
    const l = Math.min(1, Math.max(0, color.l + direccion * paso * 0.02))
    resultado = oklchAHex({ ...color, l })
    if (razonContraste(resultado, fondo) >= objetivo || l === 0 || l === 1) break
  }
  return resultado
}
