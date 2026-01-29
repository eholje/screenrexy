import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/constants/channels'
import type { CaptureSource } from '../shared/types/capture.types'

// Custom APIs for renderer
const api = {
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE)
  },

  // App info
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.APP_VERSION),
    getPath: (name: string): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_PATH, name)
  },

  // Capture operations
  capture: {
    getSources: (): Promise<CaptureSource[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_GET_SOURCES),
    getFocusedWindow: (): Promise<CaptureSource | null> =>
      ipcRenderer.invoke('capture:get-focused-window'),
    getPrimaryScreen: (): Promise<CaptureSource | null> =>
      ipcRenderer.invoke('capture:get-primary-screen'),
    saveScreenshot: (data: {
      dataUrl: string
      copyToClipboard: boolean
      saveToFile: boolean
      filename?: string
    }): Promise<{ clipboardSuccess: boolean; filePath: string | null }> =>
      ipcRenderer.invoke('capture:save-screenshot', data)
  },

  // File operations
  file: {
    save: (data: {
      buffer: ArrayBuffer
      defaultName: string
      filters?: { name: string; extensions: string[] }[]
    }): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE, data),
    saveAuto: (data: {
      buffer: ArrayBuffer
      filename: string
      subfolder?: string
    }): Promise<string> => ipcRenderer.invoke('file:save-auto', data),
    openFolder: (path?: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN_FOLDER, path),
    getRecent: (limit?: number): Promise<{
      path: string
      name: string
      type: 'video' | 'image'
      size: number
      created: number
    }[]> => ipcRenderer.invoke(IPC_CHANNELS.FILE_GET_RECENT, limit),
    copyToClipboard: (dataUrl: string): Promise<boolean> =>
      ipcRenderer.invoke('file:copy-to-clipboard', { dataUrl })
  },

  // Hotkey operations
  hotkey: {
    getAll: (): Promise<{
      id: string
      accelerator: string
      action: string
      enabled: boolean
    }[]> => ipcRenderer.invoke('hotkey:get-all'),
    update: (id: string, updates: {
      accelerator?: string
      enabled?: boolean
    }): Promise<boolean> => ipcRenderer.invoke('hotkey:update', id, updates),
    setEnabled: (id: string, enabled: boolean): Promise<void> =>
      ipcRenderer.invoke('hotkey:set-enabled', id, enabled),
    isRegistered: (accelerator: string): Promise<boolean> =>
      ipcRenderer.invoke('hotkey:is-registered', accelerator)
  },

  // Event listeners
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = Object.values(IPC_CHANNELS)
    if (validChannels.includes(channel as typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS])) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  },

  off: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = Object.values(IPC_CHANNELS)
    if (validChannels.includes(channel as typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS])) {
      ipcRenderer.removeListener(channel, callback)
    }
  }
}

// Expose protected APIs to renderer
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose API:', error)
  }
} else {
  // @ts-ignore (for non-isolated context, e.g., testing)
  window.api = api
}

// Type declaration for renderer
export type ElectronAPI = typeof api
