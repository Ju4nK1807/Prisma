import { hexAOklch, oklchAHex } from './color'
import { hexesUnicos } from './paleta'

export interface ColorConNombre {
  hex: string
  nombre: string
}

// Biblioteca de colores agrupada por familias, del más vivo al más apagado
export const BIBLIOTECA: ColorConNombre[] = [
  { hex: '#e11d48', nombre: 'Frambuesa' },
  { hex: '#dc2626', nombre: 'Rojo' },
  { hex: '#ea580c', nombre: 'Naranja' },
  { hex: '#f59e0b', nombre: 'Ámbar' },
  { hex: '#eab308', nombre: 'Amarillo' },
  { hex: '#84cc16', nombre: 'Lima' },
  { hex: '#16a34a', nombre: 'Verde' },
  { hex: '#059669', nombre: 'Esmeralda' },
  { hex: '#0d9488', nombre: 'Verde azulado' },
  { hex: '#0891b2', nombre: 'Cian' },
  { hex: '#0284c7', nombre: 'Celeste' },
  { hex: '#2563eb', nombre: 'Azul' },
  { hex: '#4f46e5', nombre: 'Índigo' },
  { hex: '#7c3aed', nombre: 'Violeta' },
  { hex: '#9333ea', nombre: 'Morado' },
  { hex: '#c026d3', nombre: 'Fucsia' },
  { hex: '#db2777', nombre: 'Rosa' },
  { hex: '#be123c', nombre: 'Vino' },
  { hex: '#9a3412', nombre: 'Terracota' },
  { hex: '#a16207', nombre: 'Mostaza' },
  { hex: '#3f6212', nombre: 'Oliva' },
  { hex: '#14532d', nombre: 'Bosque' },
  { hex: '#164e63', nombre: 'Petróleo' },
  { hex: '#1e3a8a', nombre: 'Marino' },
  { hex: '#78350f', nombre: 'Café' },
  { hex: '#d6b38c', nombre: 'Arena' },
  { hex: '#f5e6d3', nombre: 'Crema' },
  { hex: '#94a3b8', nombre: 'Gris azulado' },
  { hex: '#52525b', nombre: 'Grafito' },
  { hex: '#18181b', nombre: 'Negro' },
]

export interface PaletaSugerida {
  nombre: string
  // Fondo, principal, acento y dos de apoyo
  colores: [string, string, string, string, string]
}

export const PALETAS_SUGERIDAS: PaletaSugerida[] = [
  { nombre: 'Océano', colores: ['#eef6fb', '#0369a1', '#14b8a6', '#0c4a6e', '#7dd3fc'] },
  { nombre: 'Atardecer', colores: ['#fff6ed', '#ea580c', '#db2777', '#7c2d12', '#fdba74'] },
  { nombre: 'Bosque', colores: ['#f3f7f0', '#166534', '#ca8a04', '#14532d', '#a3c585'] },
  { nombre: 'Lavanda', colores: ['#f7f4fd', '#7c3aed', '#ec4899', '#4c1d95', '#c4b5fd'] },
  { nombre: 'Café', colores: ['#faf5ef', '#92400e', '#b45309', '#451a03', '#d6b38c'] },
  { nombre: 'Elegante', colores: ['#f8f7f4', '#18181b', '#b8860b', '#3f3f46', '#d4d4d8'] },
  { nombre: 'Pastel', colores: ['#fffafc', '#e879a6', '#60a5fa', '#a78bfa', '#fbcfe8'] },
  { nombre: 'Energía', colores: ['#fbfbf6', '#dc2626', '#facc15', '#111827', '#fb923c'] },
]

/** Colores que combinan con uno dado: complementario, análogos, tríada y variantes. */
export function armonias(hex: string): ColorConNombre[] {
  const base = hexAOklch(hex)
  const c = Math.max(base.c, 0.08)
  const con = (h: number, l = base.l, croma = c) => oklchAHex({ l: Math.min(0.9, Math.max(0.25, l)), c: croma, h: (h + 360) % 360 })
  const lista: ColorConNombre[] = [
    { hex: con(base.h + 180), nombre: 'Complementario' },
    { hex: con(base.h + 30), nombre: 'Análogo' },
    { hex: con(base.h - 30), nombre: 'Análogo' },
    { hex: con(base.h + 120), nombre: 'Tríada' },
    { hex: con(base.h - 120), nombre: 'Tríada' },
    { hex: con(base.h, base.l + 0.18, c * 0.7), nombre: 'Más claro' },
    { hex: con(base.h, base.l - 0.18), nombre: 'Más oscuro' },
  ]
  return hexesUnicos(lista.map((x) => x.hex)).map((h) => lista.find((x) => x.hex === h) ?? { hex: h, nombre: '' })
}
