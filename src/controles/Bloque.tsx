import type { ReactNode } from 'react'

export function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="bloque">
      <h3 className="bloque-titulo">{titulo}</h3>
      <div className="bloque-cuerpo">{children}</div>
    </section>
  )
}
