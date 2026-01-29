import { ipcMain, desktopCapturer } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/channels'
import type { CaptureSource } from '../../shared/types/capture.types'

export function registerCaptureHandlers(): void {
  // Get available capture sources (screens and windows)
  ipcMain.handle(IPC_CHANNELS.CAPTURE_GET_SOURCES, async (): Promise<CaptureSource[]> => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 320, height: 180 },
        fetchWindowIcons: true
      })

      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        display_id: source.display_id,
        appIcon: source.appIcon?.toDataURL()
      }))
    } catch (error) {
      console.error('Failed to get capture sources:', error)
      throw error
    }
  })

  // Get the focused window for quick capture
  ipcMain.handle('capture:get-focused-window', async (): Promise<CaptureSource | null> => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 320, height: 180 }
      })

      // Get the first non-ScreenTool window
      const focusedSource = sources.find((s) => {
        // Exclude our own window
        return !s.name.includes('ScreenTool')
      })

      if (focusedSource) {
        return {
          id: focusedSource.id,
          name: focusedSource.name,
          thumbnail: focusedSource.thumbnail.toDataURL(),
          display_id: focusedSource.display_id
        }
      }

      return null
    } catch (error) {
      console.error('Failed to get focused window:', error)
      return null
    }
  })

  // Get primary display source for quick screen capture
  ipcMain.handle('capture:get-primary-screen', async (): Promise<CaptureSource | null> => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 320, height: 180 }
      })

      // First source is usually the primary display
      const primaryScreen = sources[0]
      if (primaryScreen) {
        return {
          id: primaryScreen.id,
          name: primaryScreen.name,
          thumbnail: primaryScreen.thumbnail.toDataURL(),
          display_id: primaryScreen.display_id
        }
      }

      return null
    } catch (error) {
      console.error('Failed to get primary screen:', error)
      return null
    }
  })
}
