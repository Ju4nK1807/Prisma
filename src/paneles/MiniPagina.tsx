import { memo, useMemo } from 'react'
import type { Proyecto } from '../estado/proyecto'
import { cssFuentesVista } from '../logica/fuentes'
import { documentoFinal } from '../logica/pagina'

const FUENTES = cssFuentesVista()

/** Miniatura no interactiva de una página: el documento real reducido a escala. */
export const MiniPagina = memo(function MiniPagina({ proyecto }: { proyecto: Proyecto }) {
  const documento = useMemo(() => documentoFinal(proyecto, FUENTES), [proyecto])
  return (
    <div className="mini-pagina" aria-hidden="true">
      <iframe title="" tabIndex={-1} srcDoc={documento} loading="lazy" />
    </div>
  )
})
