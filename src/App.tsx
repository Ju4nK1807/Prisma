import { useCallback, useEffect, useState } from 'react'
import { useAvisos } from './controles/Avisos'
import { cerrarSesion, leerSesion, type Cuenta } from './estado/cuentas'
import { leerCalidadIA, useGeneracionIA } from './estado/ia'
import { adoptarProyectoAnterior, leerProyectoGuardado, proyectoDeIA, type ImagenProyecto, type Proyecto } from './estado/proyecto'
import { prepararParaIA } from './logica/imagen'
import { coloresDeHtml, limpiarHtmlIA } from './logica/pagina'
import { hexesUnicos } from './logica/paleta'
import { Acceso } from './paneles/Acceso'
import { DialogoClave } from './paneles/DialogoClave'
import { Editor } from './paneles/Editor'
import { Generando } from './paneles/Generando'
import { Inicio } from './paneles/Inicio'
import { plataforma } from './plataforma'

type Pantalla = { tipo: 'inicio' } | { tipo: 'editor'; proyecto: Proyecto; clave: number }

/** Al entrar, se abre directamente la última página de esa cuenta, si la tiene. */
function pantallaInicial(cuenta: Cuenta): Pantalla {
  adoptarProyectoAnterior(cuenta.correo)
  const guardado = leerProyectoGuardado(cuenta.correo)
  return guardado ? { tipo: 'editor', proyecto: guardado, clave: Date.now() } : { tipo: 'inicio' }
}

export default function App() {
  const [cuenta, setCuenta] = useState<Cuenta | null>(leerSesion)
  if (!cuenta) return <Acceso alEntrar={setCuenta} />
  return (
    <Aplicacion
      key={cuenta.correo}
      cuenta={cuenta}
      alCerrarSesion={() => {
        cerrarSesion()
        setCuenta(null)
      }}
    />
  )
}

function Aplicacion({ cuenta, alCerrarSesion }: { cuenta: Cuenta; alCerrarSesion: () => void }) {
  const { avisar } = useAvisos()
  const ia = useGeneracionIA()
  const [pantalla, setPantalla] = useState<Pantalla>(() => pantallaInicial(cuenta))
  const [tieneClave, setTieneClave] = useState(false)
  const [ajustesIA, setAjustesIA] = useState(false)

  useEffect(() => {
    plataforma?.ia.estado().then((estado) => setTieneClave(estado.tieneClave))
  }, [])

  const abrirEditor = useCallback((proyecto: Proyecto) => {
    setPantalla({ tipo: 'editor', proyecto, clave: Date.now() })
  }, [])

  const recrear = useCallback(
    async (imagen: ImagenProyecto, paleta: string[], indicaciones: string) => {
      if (!plataforma) return
      const { datos, tipo } = await prepararParaIA(imagen.dataUrl)
      const resultado = await ia.ejecutar(() => plataforma!.ia.generar({ datos, tipo, indicaciones, calidad: leerCalidadIA() }))
      if (!resultado.ok) {
        if (!resultado.cancelado) avisar(resultado.error, 'error')
        return
      }
      const html = limpiarHtmlIA(resultado.html)
      if (!html) {
        avisar('La IA devolvió una respuesta que no es una página. Inténtalo de nuevo.', 'error')
        return
      }
      abrirEditor(proyectoDeIA(html, imagen, hexesUnicos([...coloresDeHtml(html), ...paleta]).slice(0, 8)))
    },
    [ia, avisar, abrirEditor],
  )

  return (
    <>
      {pantalla.tipo === 'inicio' ? (
        <Inicio
          cuenta={cuenta}
          tieneClave={tieneClave}
          hayProyectoGuardado={leerProyectoGuardado(cuenta.correo) !== null}
          alCrear={abrirEditor}
          alRecrear={(imagen, paleta, indicaciones) => void recrear(imagen, paleta, indicaciones)}
          alContinuar={() => {
            const guardado = leerProyectoGuardado(cuenta.correo)
            if (guardado) abrirEditor(guardado)
          }}
          alConfigurarClave={() => setAjustesIA(true)}
          alCerrarSesion={alCerrarSesion}
        />
      ) : (
        <Editor
          key={pantalla.clave}
          cuenta={cuenta}
          inicial={pantalla.proyecto}
          ia={ia}
          iaDisponible={tieneClave}
          alNuevo={() => setPantalla({ tipo: 'inicio' })}
          alConfigurarClave={() => setAjustesIA(true)}
          alCerrarSesion={alCerrarSesion}
        />
      )}

      {pantalla.tipo === 'inicio' && ia.activa && (
        <Generando titulo="Creando tu página" caracteres={ia.caracteres} alCancelar={ia.cancelar} />
      )}

      {ajustesIA && <DialogoClave tieneClave={tieneClave} alCerrar={() => setAjustesIA(false)} alCambiar={setTieneClave} />}
    </>
  )
}
