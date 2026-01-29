import { globalShortcut, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/channels'

export interface HotkeyBinding {
  id: string
  accelerator: string
  action: string
  enabled: boolean
}

const DEFAULT_HOTKEYS: HotkeyBinding[] = [
  { id: 'startStopRecording', accelerator: 'CommandOrControl+Shift+R', action: 'startStopRecording', enabled: true },
  { id: 'pauseRecording', accelerator: 'CommandOrControl+Shift+P', action: 'pauseRecording', enabled: true },
  { id: 'screenshot', accelerator: 'CommandOrControl+Shift+S', action: 'screenshot', enabled: true },
  { id: 'regionScreenshot', accelerator: 'CommandOrControl+Shift+A', action: 'regionScreenshot', enabled: true }
]

export class HotkeyService {
  private hotkeys: HotkeyBinding[] = []
  private mainWindow: BrowserWindow | null = null

  constructor() {
    this.hotkeys = [...DEFAULT_HOTKEYS]
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  registerAll(): void {
    this.unregisterAll()

    for (const hotkey of this.hotkeys) {
      if (hotkey.enabled) {
        this.register(hotkey)
      }
    }
  }

  private register(hotkey: HotkeyBinding): boolean {
    try {
      const success = globalShortcut.register(hotkey.accelerator, () => {
        this.triggerAction(hotkey.action)
      })

      if (!success) {
        console.warn(`Failed to register hotkey: ${hotkey.accelerator}`)
      }

      return success
    } catch (error) {
      console.error(`Error registering hotkey ${hotkey.accelerator}:`, error)
      return false
    }
  }

  private triggerAction(action: string): void {
    if (!this.mainWindow) return

    console.log(`Hotkey triggered: ${action}`)
    this.mainWindow.webContents.send(IPC_CHANNELS.HOTKEY_TRIGGERED, action)

    // Visual feedback - flash the window if hidden
    if (!this.mainWindow.isVisible()) {
      this.mainWindow.show()
      this.mainWindow.focus()
    }
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll()
  }

  updateHotkey(id: string, updates: Partial<HotkeyBinding>): boolean {
    const index = this.hotkeys.findIndex((h) => h.id === id)
    if (index === -1) return false

    const hotkey = this.hotkeys[index]

    // If accelerator changed, unregister old one
    if (updates.accelerator && updates.accelerator !== hotkey.accelerator) {
      globalShortcut.unregister(hotkey.accelerator)
    }

    // Update hotkey
    this.hotkeys[index] = { ...hotkey, ...updates }

    // Re-register if enabled
    if (this.hotkeys[index].enabled) {
      return this.register(this.hotkeys[index])
    }

    return true
  }

  setEnabled(id: string, enabled: boolean): void {
    const hotkey = this.hotkeys.find((h) => h.id === id)
    if (!hotkey) return

    if (enabled && !hotkey.enabled) {
      hotkey.enabled = true
      this.register(hotkey)
    } else if (!enabled && hotkey.enabled) {
      hotkey.enabled = false
      globalShortcut.unregister(hotkey.accelerator)
    }
  }

  getHotkeys(): HotkeyBinding[] {
    return [...this.hotkeys]
  }

  getHotkey(id: string): HotkeyBinding | undefined {
    return this.hotkeys.find((h) => h.id === id)
  }

  isRegistered(accelerator: string): boolean {
    return globalShortcut.isRegistered(accelerator)
  }
}

// Singleton instance
let hotkeyServiceInstance: HotkeyService | null = null

export function getHotkeyService(): HotkeyService {
  if (!hotkeyServiceInstance) {
    hotkeyServiceInstance = new HotkeyService()
  }
  return hotkeyServiceInstance
}
