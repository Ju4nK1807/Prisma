interface Opcion<T extends string> {
  valor: T
  etiqueta: string
}

interface Props<T extends string> {
  etiqueta: string
  opciones: Opcion<T>[]
  valor: T
  alCambiar: (valor: T) => void
}

export function Segmentado<T extends string>({ etiqueta, opciones, valor, alCambiar }: Props<T>) {
  return (
    <div className="segmentado" role="radiogroup" aria-label={etiqueta}>
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          role="radio"
          aria-checked={opcion.valor === valor}
          className={opcion.valor === valor ? 'activo' : ''}
          onClick={() => alCambiar(opcion.valor)}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  )
}
