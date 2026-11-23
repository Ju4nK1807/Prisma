import { useEffect, useMemo, useRef, useState } from 'react'
import { useAvisos } from '../controles/Avisos'
import { Bloque } from '../controles/Bloque'
import {
  IconoCerrar,
  IconoCheck,
  IconoChevronAbajo,
  IconoCopiar,
  IconoImagen,
  IconoMas,
  IconoMezclar,
  IconoReiniciar,
  IconoVarita,
} from '../controles/Iconos'
import { Segmentado } from '../controles/Segmentado'
import type { Proyecto } from '../estado/proyecto'
import { normalizarHex } from '../logica/color'
import { armonias, BIBLIOTECA, PALETAS_SUGERIDAS } from '../logica/colores'
import { ELEMENTOS, type DescripcionElemento, type TipoElemento } from '../logica/documento'
import { cargarImagen, TIPOS_ACEPTADOS } from '../logica/imagen'
import { ETIQUETAS_DENSIDAD, ETIQUETAS_ESQUINAS } from '../logica/pagina'
import { hexesUnicos } from '../logica/paleta'
import { PLANTILLAS, type Portada, type UsoImagen } from '../logica/plantillas'
import {
  asignacionInicial,
  derivarTema,
  distribuciones,
  mismaAsignacion,
  PARES_FUENTES,
  temaLegible,
  type Asignacion,
  type Densidad,
  type Esquinas,
} from '../logica/tema'

export type Actualizar = (cambio: (p: Proyecto) => Proyecto, grupo?: string) => void

export interface AccionesElemento {
  anadir: (tipo: TipoElemento, imagen?: string) => void
  eliminar: () => void
  mover: (direccion: -1 | 1) => void
  duplicar: () => void
  cambiarImagen: (dataUrl: string) => void
  cambiarEnlace: (url: string) => void
  deseleccionar: () => void
}

interface Props {
  proyecto: Proyecto
  actualizar: Actualizar
  seleccionado: DescripcionElemento | null
  elementos: AccionesElemento
  iaDisponible: boolean
  alPedirCambio: (peticion: string) => void
  alConfigurarClave: () => void
}

type Papel = keyof Asignacion

const PAPELES: { id: Papel; nombre: string; ayuda: string }[] = [
  { id: 'primario', nombre: 'Principal', ayuda: 'Botones y detalles' },
  { id: 'acento', nombre: 'Acento', ayuda: 'Iconos y adornos' },
  { id: 'fondo', nombre: 'Fondo', ayuda: 'Tono del fondo' },
]

const PORTADAS: { valor: Portada; etiqueta: string }[] = [
  { valor: 'dividida', etiqueta: 'Dividida' },
  { valor: 'fondo', etiqueta: 'Imagen de fondo' },
  { valor: 'centrada', etiqueta: 'Centrada' },
]

const USOS: { valor: UsoImagen; etiqueta: string }[] = [
  { valor: 'portada', etiqueta: 'En la portada' },
  { valor: 'logo', etiqueta: 'Como logo' },
  { valor: 'ninguno', etiqueta: 'No usar' },
]

const SUGERENCIAS = [
  'Mejora el diseño para que se vea más profesional',
  'Añade una sección de opiniones de clientes',
  'Añade una sección de preguntas frecuentes',
  'Añade un formulario de contacto',
  'Hazla más moderna y minimalista',
]

const ORIGINAL = 'original'
const MAXIMO_COLORES = 12

export function Panel(props: Props) {
  const { proyecto, actualizar, seleccionado, elementos, iaDisponible, alPedirCambio, alConfigurarClave } = props
  const { avisar } = useAvisos()
  const [papelActivo, setPapelActivo] = useState<Papel>('primario')
  const [peticion, setPeticion] = useState('')
  const [masColores, setMasColores] = useState(false)
  const [enlace, setEnlace] = useState('')
  const selectorImagen = useRef<HTMLInputElement>(null)
  // Qué hará el selector de archivos al elegir una imagen
  const usoSelector = useRef<'portada' | 'anadir' | 'reemplazar'>('portada')
  const esPlantilla = proyecto.origen === 'plantilla'
  const colores = proyecto.colores

  useEffect(() => setEnlace(seleccionado?.enlace ?? ''), [seleccionado])

  // Con los colores originales de una página libre, la paleta empieza por su fondo, primario y acento
  const coloresVisibles: Asignacion | null =
    colores ??
    (!esPlantilla && proyecto.paleta.length >= 3
      ? { fondo: proyecto.paleta[0], primario: proyecto.paleta[1], acento: proyecto.paleta[2] }
      : null)

  const fijar = <K extends keyof Proyecto>(clave: K, valor: Proyecto[K], grupo?: string) =>
    actualizar((p) => ({ ...p, [clave]: valor }), grupo)

  const legible = useMemo(() => (colores ? temaLegible(derivarTema(colores, proyecto.modo)) : true), [colores, proyecto.modo])
  const combinan = useMemo(() => (coloresVisibles ? armonias(coloresVisibles.primario) : []), [coloresVisibles?.primario])

  const base = () => coloresVisibles ?? asignacionInicial(proyecto.paleta.map((c) => ({ hex: c, peso: 1 })))

  const asignar = (hex: string) => fijar('colores', { ...base(), [papelActivo]: hex })

  // Añade un color a la paleta (si es nuevo) y lo asigna al papel activo
  const usarColor = (valor: string) => {
    const hex = normalizarHex(valor)
    if (!hex) return
    const paleta = hexesUnicos([...proyecto.paleta, hex]).slice(-MAXIMO_COLORES)
    actualizar((p) => ({ ...p, paleta, colores: { ...base(), [papelActivo]: hex } }), 'usar-color')
  }

  const aplicarPaleta = (lista: string[]) => {
    actualizar((p) => ({
      ...p,
      paleta: hexesUnicos([...lista, ...p.paleta]).slice(0, MAXIMO_COLORES),
      colores: { fondo: lista[0], primario: lista[1], acento: lista[2] },
    }))
  }

  const mezclar = () => {
    const opciones = distribuciones(proyecto.paleta)
    if (opciones.length === 0) {
      avisar('Añade otro color para poder mezclar', 'error')
      return
    }
    const actual = colores ? opciones.findIndex((o) => mismaAsignacion(o, colores)) : -1
    fijar('colores', opciones[(actual + 1) % opciones.length])
  }

  const elegirImagen = (uso: 'portada' | 'anadir' | 'reemplazar') => {
    usoSelector.current = uso
    selectorImagen.current?.click()
  }

  const recibirImagen = async (archivo: File | undefined) => {
    if (!archivo) return
    try {
      const nueva = await cargarImagen(archivo)
      if (usoSelector.current === 'anadir') {
        elementos.anadir('imagen', nueva.dataUrl)
        return
      }
      if (usoSelector.current === 'reemplazar') {
        elementos.cambiarImagen(nueva.dataUrl)
        return
      }
      actualizar((p) => ({
        ...p,
        imagen: { dataUrl: nueva.dataUrl, nombre: nueva.nombre, esLogo: nueva.esLogo },
        paleta: nueva.paleta.map((c) => c.hex),
        colores: asignacionInicial(nueva.paleta),
        usoImagen: nueva.esLogo ? 'logo' : 'portada',
      }))
      avisar('Imagen cambiada y colores actualizados')
    } catch (error) {
      avisar(error instanceof Error ? error.message : 'No se pudo abrir la imagen', 'error')
    }
  }

  return (
    <div className="panel-opciones">
      <input
        ref={selectorImagen}
        type="file"
        accept={TIPOS_ACEPTADOS.join(',')}
        hidden
        onChange={(e) => {
          void recibirImagen(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {seleccionado && (
        <section className="bloque bloque--seleccion">
          <div className="seleccion-cabecera">
            <h3 className="bloque-titulo">Seleccionado: {seleccionado.nombre}</h3>
            <button className="boton-icono" onClick={elementos.deseleccionar} aria-label="Quitar selección" title="Quitar selección">
              <IconoCerrar />
            </button>
          </div>
          <div className="acciones-elemento">
            <button className="boton" onClick={() => elementos.mover(-1)} disabled={!seleccionado.puedeSubir} title="Subir">
              <IconoChevronAbajo className="girado" />
              Subir
            </button>
            <button className="boton" onClick={() => elementos.mover(1)} disabled={!seleccionado.puedeBajar} title="Bajar">
              <IconoChevronAbajo />
              Bajar
            </button>
            <button className="boton" onClick={elementos.duplicar}>
              <IconoCopiar />
              Duplicar
            </button>
            <button className="boton boton--peligro" onClick={elementos.eliminar}>
              <IconoCerrar />
              Eliminar
            </button>
          </div>
          {seleccionado.esImagen && (
            <button className="boton" onClick={() => elegirImagen('reemplazar')}>
              <IconoImagen />
              Cambiar imagen
            </button>
          )}
          {seleccionado.enlace !== null && (
            <div className="campo-grupo">
              <label className="campo-etiqueta" htmlFor="enlace-elemento">
                Enlace (adónde lleva al hacer clic)
              </label>
              <input
                id="enlace-elemento"
                className="campo"
                value={enlace}
                placeholder="https://… o #contacto"
                spellCheck={false}
                onChange={(e) => setEnlace(e.target.value)}
                onBlur={() => enlace !== (seleccionado.enlace ?? '') && elementos.cambiarEnlace(enlace)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
            </div>
          )}
        </section>
      )}

      <Bloque titulo="Añadir a la página">
        <p className="tenue pequeno">
          {seleccionado ? `Se añade debajo de: ${seleccionado.nombre.toLowerCase()}.` : 'Haz clic en una parte de la página para elegir dónde añadir. Si no, va al final.'}
        </p>
        <div className="rejilla-anadir">
          {ELEMENTOS.map((e) => (
            <button
              key={e.tipo}
              className="opcion-anadir"
              onClick={() => (e.tipo === 'imagen' ? elegirImagen('anadir') : elementos.anadir(e.tipo))}
            >
              <IconoMas tamano={14} />
              {e.nombre}
            </button>
          ))}
        </div>
      </Bloque>

      <Bloque titulo="Mejorar con IA">
        <p className="tenue">
          {seleccionado
            ? `Describe qué quieres cambiar. La IA se centrará en: ${seleccionado.nombre.toLowerCase()}.`
            : 'Describe con tus palabras qué quieres añadir o mejorar en la página.'}
        </p>
        <textarea
          className="campo campo-area"
          rows={3}
          placeholder="Por ejemplo: añade una sección de precios con tres planes"
          value={peticion}
          onChange={(e) => setPeticion(e.target.value)}
        />
        <div className="sugerencias">
          {SUGERENCIAS.map((s) => (
            <button key={s} className="sugerencia" onClick={() => setPeticion(s)}>
              {s}
            </button>
          ))}
        </div>
        {iaDisponible ? (
          <button
            className="boton boton--primario"
            disabled={!peticion.trim()}
            onClick={() => {
              alPedirCambio(peticion.trim())
              setPeticion('')
            }}
          >
            <IconoVarita />
            Aplicar con IA
          </button>
        ) : (
          <button className="boton" onClick={alConfigurarClave}>
            Configurar clave de IA
          </button>
        )}
      </Bloque>

      {esPlantilla ? (
        <Bloque titulo="Tipo de página">
          <div className="lista-plantillas">
            {PLANTILLAS.map((p) => (
              <button
                key={p.id}
                className={`opcion-plantilla ${proyecto.plantilla === p.id ? 'activa' : ''}`}
                aria-pressed={proyecto.plantilla === p.id}
                onClick={() => fijar('plantilla', p.id)}
              >
                <strong>{p.nombre}</strong>
                <span>{p.descripcion}</span>
              </button>
            ))}
          </div>
          <span className="campo-etiqueta">Portada</span>
          <Segmentado etiqueta="Diseño de la portada" opciones={PORTADAS} valor={proyecto.portada} alCambiar={(v) => fijar('portada', v)} />
        </Bloque>
      ) : null}

      <Bloque titulo="Colores">
        {!esPlantilla && !colores && <p className="tenue">La página usa sus colores originales. Toca un color para personalizarlos.</p>}
        <div className="papeles" role="radiogroup" aria-label="Qué color quieres cambiar">
          {PAPELES.map((papel) => (
            <button
              key={papel.id}
              role="radio"
              aria-checked={papelActivo === papel.id}
              className={`papel ${papelActivo === papel.id ? 'activo' : ''}`}
              onClick={() => setPapelActivo(papel.id)}
            >
              <span className="papel-muestra" style={{ background: coloresVisibles?.[papel.id] ?? 'transparent' }} />
              <strong>{papel.nombre}</strong>
              <span>{papel.ayuda}</span>
            </button>
          ))}
        </div>
        <p className="tenue pequeno">Elige un color para «{PAPELES.find((p) => p.id === papelActivo)?.nombre}»:</p>
        <div className="paleta-editor">
          {proyecto.paleta.map((hex) => (
            <button
              key={hex}
              className={`color-paleta ${coloresVisibles?.[papelActivo] === hex ? 'activo' : ''}`}
              style={{ background: hex }}
              title={hex}
              aria-label={`Usar ${hex}`}
              onClick={() => asignar(hex)}
            >
              {coloresVisibles?.[papelActivo] === hex && <IconoCheck />}
            </button>
          ))}
          <label className="color-paleta color-paleta--nuevo" title="Elegir cualquier color">
            <IconoMas />
            <input type="color" aria-label="Elegir cualquier color" onChange={(e) => usarColor(e.target.value)} />
          </label>
        </div>

        {combinan.length > 0 && (
          <>
            <span className="campo-etiqueta">Combinan con tu color principal</span>
            <div className="fila-colores">
              {combinan.map((c) => (
                <button key={c.hex} className="color-mini" style={{ background: c.hex }} title={`${c.nombre} · ${c.hex}`} onClick={() => usarColor(c.hex)} />
              ))}
            </div>
          </>
        )}

        <div className="fila-botones">
          <button className="boton" onClick={mezclar}>
            <IconoMezclar />
            Mezclar colores
          </button>
          <button className="boton boton--fantasma" onClick={() => setMasColores((v) => !v)} aria-expanded={masColores}>
            {masColores ? 'Menos colores' : 'Más colores'}
          </button>
          {!esPlantilla && colores && (
            <button className="boton boton--fantasma" onClick={() => fijar('colores', null)}>
              <IconoReiniciar />
              Originales
            </button>
          )}
        </div>

        {masColores && (
          <div className="mas-colores">
            <span className="campo-etiqueta">Paletas listas</span>
            <div className="paletas-sugeridas">
              {PALETAS_SUGERIDAS.map((p) => (
                <button key={p.nombre} className="paleta-sugerida" onClick={() => aplicarPaleta(p.colores)}>
                  <span className="paleta-sugerida-colores">
                    {p.colores.map((c) => (
                      <span key={c} style={{ background: c }} />
                    ))}
                  </span>
                  {p.nombre}
                </button>
              ))}
            </div>
            <span className="campo-etiqueta">Todos los colores</span>
            <div className="biblioteca-colores">
              {BIBLIOTECA.map((c) => (
                <button key={c.hex} className="color-mini" style={{ background: c.hex }} title={`${c.nombre} · ${c.hex}`} onClick={() => usarColor(c.hex)} />
              ))}
            </div>
          </div>
        )}

        {coloresVisibles && colores && (
          <>
            <Segmentado
              etiqueta="Fondo claro u oscuro"
              opciones={[
                { valor: 'claro', etiqueta: 'Fondo claro' },
                { valor: 'oscuro', etiqueta: 'Fondo oscuro' },
              ]}
              valor={proyecto.modo}
              alCambiar={(v) => fijar('modo', v)}
            />
            <p className={`estado-contraste ${legible ? '' : 'estado-contraste--mal'}`}>
              <IconoCheck tamano={14} />
              {legible ? 'Todos los textos se leen bien' : 'Algún texto podría leerse con dificultad'}
            </p>
          </>
        )}
      </Bloque>

      {esPlantilla && (
        <Bloque titulo="Imagen">
          {proyecto.imagen ? (
            <div className="imagen-actual">
              <img src={proyecto.imagen.dataUrl} alt="" />
              <button className="boton boton--fantasma" onClick={() => elegirImagen('portada')}>
                <IconoImagen />
                Cambiar
              </button>
            </div>
          ) : (
            <button className="boton" onClick={() => elegirImagen('portada')}>
              <IconoImagen />
              Subir una imagen
            </button>
          )}
          {proyecto.imagen && (
            <Segmentado etiqueta="Dónde va la imagen" opciones={USOS} valor={proyecto.usoImagen} alCambiar={(v) => fijar('usoImagen', v)} />
          )}
        </Bloque>
      )}

      <Bloque titulo="Letra">
        <div className="lista-fuentes">
          {!esPlantilla && (
            <button className={`opcion-fuente ${proyecto.fuentes === null ? 'activa' : ''}`} onClick={() => fijar('fuentes', null)}>
              <span className="opcion-fuente-muestra">Aa</span>
              Original
            </button>
          )}
          {PARES_FUENTES.map((par) => (
            <button
              key={par.id}
              className={`opcion-fuente ${proyecto.fuentes === par.id ? 'activa' : ''}`}
              aria-pressed={proyecto.fuentes === par.id}
              onClick={() => fijar('fuentes', par.id)}
            >
              <span className="opcion-fuente-muestra" style={{ fontFamily: par.titulos, fontWeight: par.pesoTitulos }}>
                Aa
              </span>
              {par.nombre}
            </button>
          ))}
        </div>
      </Bloque>

      <Bloque titulo="Forma y espacio">
        <span className="campo-etiqueta">Esquinas</span>
        <Segmentado
          etiqueta="Esquinas"
          opciones={[
            ...(!esPlantilla ? [{ valor: ORIGINAL, etiqueta: 'Original' }] : []),
            ...(Object.keys(ETIQUETAS_ESQUINAS) as Esquinas[]).map((v) => ({ valor: v, etiqueta: ETIQUETAS_ESQUINAS[v] })),
          ]}
          valor={proyecto.esquinas ?? ORIGINAL}
          alCambiar={(v) => fijar('esquinas', v === ORIGINAL ? null : (v as Esquinas))}
        />
        <span className="campo-etiqueta">Espacio entre secciones</span>
        <Segmentado
          etiqueta="Espacio"
          opciones={[
            ...(!esPlantilla ? [{ valor: ORIGINAL, etiqueta: 'Original' }] : []),
            ...(Object.keys(ETIQUETAS_DENSIDAD) as Densidad[]).map((v) => ({ valor: v, etiqueta: ETIQUETAS_DENSIDAD[v] })),
          ]}
          valor={proyecto.densidad ?? ORIGINAL}
          alCambiar={(v) => fijar('densidad', v === ORIGINAL ? null : (v as Densidad))}
        />
      </Bloque>

      <Bloque titulo="Textos">
        <p className="tenue">Haz clic sobre cualquier texto de la página y escribe para cambiarlo.</p>
        {Object.keys(proyecto.textos).length > 0 && (
          <button className="boton boton--fantasma" onClick={() => fijar('textos', {})}>
            <IconoReiniciar />
            Restablecer textos
          </button>
        )}
      </Bloque>
    </div>
  )
}
