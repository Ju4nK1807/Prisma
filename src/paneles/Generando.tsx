import { IconoVarita } from '../controles/Iconos'

interface Props {
  titulo: string
  caracteres: number
  alCancelar: () => void
}

export function Generando({ titulo, caracteres, alCancelar }: Props) {
  return (
    <div className="generando" role="alertdialog" aria-modal="true" aria-labelledby="generando-titulo">
      <div className="generando-caja">
        <span className="generando-icono">
          <IconoVarita tamano={26} />
        </span>
        <h2 id="generando-titulo">{titulo}</h2>
        <p aria-live="polite">
          {caracteres === 0
            ? 'La IA está analizando la imagen…'
            : `Escribiendo la página · ${caracteres.toLocaleString('es')} caracteres`}
        </p>
        <div className="generando-barra" aria-hidden="true">
          <span />
        </div>
        <p className="tenue pequeno">Suele tardar entre 30 segundos y 2 minutos.</p>
        <button className="boton" onClick={alCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
