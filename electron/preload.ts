import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  CANALES,
  type AccionMenu,
  type OpcionesGuardar,
  type PeticionGenerar,
  type PeticionModificar,
  type PeticionObjetos,
  type ResultadoClave,
  type ResultadoIA,
  type ResultadoObjetos,
} from './compartido'

function suscribir<T>(canal: string, oyente: (valor: T) => void) {
  const manejador = (_evento: IpcRendererEvent, valor: T) => oyente(valor)
  ipcRenderer.on(canal, manejador)
  return () => {
    ipcRenderer.removeListener(canal, manejador)
  }
}

const api = {
  obtenerVersion: (): Promise<string> => ipcRenderer.invoke(CANALES.version),
  guardarArchivo: (opciones: OpcionesGuardar): Promise<string | null> => ipcRenderer.invoke(CANALES.guardarArchivo, opciones),
  abrirArchivo: (ruta: string): Promise<boolean> => ipcRenderer.invoke(CANALES.abrirArchivo, ruta),
  abrirEnlace: (url: string): Promise<void> => ipcRenderer.invoke(CANALES.abrirEnlace, url),
  copiarTexto: (texto: string): Promise<void> => ipcRenderer.invoke(CANALES.copiarTexto, texto),
  alAccionMenu: (oyente: (accion: AccionMenu) => void) => suscribir(CANALES.accionMenu, oyente),
  ia: {
    estado: (): Promise<{ tieneClave: boolean }> => ipcRenderer.invoke(CANALES.iaEstado),
    guardarClave: (clave: string): Promise<ResultadoClave> => ipcRenderer.invoke(CANALES.iaGuardarClave, clave),
    borrarClave: (): Promise<void> => ipcRenderer.invoke(CANALES.iaBorrarClave),
    generar: (peticion: PeticionGenerar): Promise<ResultadoIA> => ipcRenderer.invoke(CANALES.iaGenerar, peticion),
    modificar: (peticion: PeticionModificar): Promise<ResultadoIA> => ipcRenderer.invoke(CANALES.iaModificar, peticion),
    objetos: (peticion: PeticionObjetos): Promise<ResultadoObjetos> => ipcRenderer.invoke(CANALES.iaObjetos, peticion),
    cancelar: (): Promise<void> => ipcRenderer.invoke(CANALES.iaCancelar),
    alProgreso: (oyente: (caracteres: number) => void) => suscribir(CANALES.iaProgreso, oyente),
  },
}

export type ApiPrisma = typeof api

contextBridge.exposeInMainWorld('prisma', api)
