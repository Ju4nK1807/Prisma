import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, safeStorage, shell, type MenuItemConstructorOptions } from 'electron'
import { mkdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CANALES, type AccionMenu, type OpcionesGuardar, type PeticionGenerar, type PeticionModificar, type PeticionObjetos } from './compartido'
import { cancelar, generarDesdeImagen, generarObjetos, modificarPagina, validarClave } from './ia'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// dist-electron/ contiene main.js y preload.cjs; dist/ contiene la interfaz
const RAIZ_APP = path.join(__dirname, '..')
const DIST_RENDERER = path.join(RAIZ_APP, 'dist')
const URL_DEV = process.env.VITE_DEV_SERVER_URL
// Vite copia public/ dentro de dist/ al compilar
const ICONO = path.join(URL_DEV ? path.join(RAIZ_APP, 'public') : DIST_RENDERER, 'icon.png')

let ventana: BrowserWindow | null = null

// Solo se escriben o abren archivos que el usuario eligió en un diálogo nativo
const rutasPermitidas = new Set<string>()

function enviarAccion(accion: AccionMenu) {
  ventana?.webContents.send(CANALES.accionMenu, accion)
}

function construirMenu() {
  // Los atajos se muestran en el menú, pero los gestiona la interfaz para no dispararlos dos veces
  const item = (label: string, accion: AccionMenu, accelerator?: string): MenuItemConstructorOptions => ({
    label,
    click: () => enviarAccion(accion),
    ...(accelerator ? { accelerator, registerAccelerator: false } : {}),
  })
  const separador: MenuItemConstructorOptions = { type: 'separator' }
  const plantilla: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'Archivo',
      submenu: [item('Nueva página', 'nuevo', 'CmdOrCtrl+N'), item('Exportar página…', 'exportar', 'CmdOrCtrl+E'), separador, { role: 'quit', label: 'Salir' }],
    },
    {
      label: 'Edición',
      submenu: [
        item('Deshacer', 'deshacer', 'CmdOrCtrl+Z'),
        item('Rehacer', 'rehacer', 'CmdOrCtrl+Shift+Z'),
        separador,
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'resetZoom', label: 'Tamaño real' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        separador,
        { role: 'togglefullscreen', label: 'Pantalla completa' },
        { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(plantilla))
}

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 680,
    title: 'Prisma',
    icon: ICONO,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f6f5f2',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  ventana.once('ready-to-show', () => ventana?.show())
  ventana.on('closed', () => {
    ventana = null
  })

  // Los enlaces externos se abren en el navegador del sistema, nunca dentro de la app
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  ventana.webContents.on('will-navigate', (evento, url) => {
    if (URL_DEV && url.startsWith(URL_DEV)) return
    evento.preventDefault()
  })

  if (URL_DEV) ventana.loadURL(URL_DEV)
  else ventana.loadFile(path.join(DIST_RENDERER, 'index.html'))
}

// --- Clave de API: cifrada con el almacén seguro del sistema operativo ---

const rutaClave = () => path.join(app.getPath('userData'), 'clave-ia.bin')

async function leerClave(): Promise<string | null> {
  try {
    const datos = await readFile(rutaClave())
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(datos) : null
  } catch {
    return null
  }
}

function registrarIpc() {
  ipcMain.handle(CANALES.version, () => app.getVersion())

  ipcMain.handle(CANALES.guardarArchivo, async (evento, opciones: OpcionesGuardar) => {
    const propietaria = BrowserWindow.fromWebContents(evento.sender)
    let carpeta = app.getPath('documents')
    let carpetaCreada = false
    if (opciones.carpeta) {
      carpeta = path.join(carpeta, path.basename(opciones.carpeta))
      carpetaCreada = (await mkdir(carpeta, { recursive: true })) !== undefined
    }
    const configuracion = {
      title: opciones.titulo ?? 'Guardar archivo',
      defaultPath: path.join(carpeta, path.basename(opciones.nombreSugerido)),
      filters: opciones.filtros,
    }
    const resultado = propietaria ? await dialog.showSaveDialog(propietaria, configuracion) : await dialog.showSaveDialog(configuracion)
    if (resultado.canceled || !resultado.filePath) {
      // No dejar una carpeta vacía si el usuario cancela
      if (carpetaCreada) await rmdir(carpeta).catch(() => undefined)
      return null
    }
    await writeFile(resultado.filePath, opciones.contenido, 'utf8')
    rutasPermitidas.add(resultado.filePath)
    return resultado.filePath
  })

  ipcMain.handle(CANALES.abrirArchivo, async (_evento, ruta: string) => {
    if (!rutasPermitidas.has(ruta)) return false
    return (await shell.openPath(ruta)) === ''
  })

  ipcMain.handle(CANALES.abrirEnlace, async (_evento, url: string) => {
    if (typeof url === 'string' && url.startsWith('https://')) await shell.openExternal(url)
  })

  ipcMain.handle(CANALES.copiarTexto, (_evento, texto: string) => {
    clipboard.writeText(String(texto))
  })

  ipcMain.handle(CANALES.iaEstado, async () => ({ tieneClave: (await leerClave()) !== null }))

  ipcMain.handle(CANALES.iaGuardarClave, async (_evento, clave: string) => {
    const limpia = String(clave).trim()
    if (!limpia) return { ok: false, error: 'Escribe tu clave de API.' }
    if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: 'Este equipo no permite guardar la clave de forma segura.' }
    const validacion = await validarClave(limpia)
    if (!validacion.ok) return validacion
    await writeFile(rutaClave(), safeStorage.encryptString(limpia))
    return { ok: true }
  })

  ipcMain.handle(CANALES.iaBorrarClave, async () => {
    await rm(rutaClave(), { force: true })
  })

  ipcMain.handle(CANALES.iaGenerar, async (evento, peticion: PeticionGenerar) => {
    const clave = await leerClave()
    if (!clave) return { ok: false, error: 'Primero configura tu clave de API.' }
    return generarDesdeImagen(clave, peticion, (n) => evento.sender.send(CANALES.iaProgreso, n))
  })

  ipcMain.handle(CANALES.iaModificar, async (evento, peticion: PeticionModificar) => {
    const clave = await leerClave()
    if (!clave) return { ok: false, error: 'Primero configura tu clave de API.' }
    return modificarPagina(clave, peticion, (n) => evento.sender.send(CANALES.iaProgreso, n))
  })

  ipcMain.handle(CANALES.iaObjetos, async (evento, peticion: PeticionObjetos) => {
    const clave = await leerClave()
    if (!clave) return { ok: false, error: 'Primero configura tu clave de API.' }
    return generarObjetos(clave, peticion, (n) => evento.sender.send(CANALES.iaProgreso, n))
  })

  ipcMain.handle(CANALES.iaCancelar, () => cancelar())
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) crearVentana()
})

app.whenReady().then(() => {
  registrarIpc()
  construirMenu()
  crearVentana()
})
