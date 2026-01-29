import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/channels'
import { getHotkeyService, type HotkeyBinding } from '../services/HotkeyService'

export function registerHotkeyHandlers(): void {
  const hotkeyService = getHotkeyService()

  // Get all hotkeys
  ipcMain.handle('hotkey:get-all', (): HotkeyBinding[] => {
    return hotkeyService.getHotkeys()
  })

  // Update a hotkey
  ipcMain.handle('hotkey:update', (_event, id: string, updates: Partial<HotkeyBinding>): boolean => {
    return hotkeyService.updateHotkey(id, updates)
  })

  // Enable/disable a hotkey
  ipcMain.handle('hotkey:set-enabled', (_event, id: string, enabled: boolean): void => {
    hotkeyService.setEnabled(id, enabled)
  })

  // Check if accelerator is already registered
  ipcMain.handle('hotkey:is-registered', (_event, accelerator: string): boolean => {
    return hotkeyService.isRegistered(accelerator)
  })
}
