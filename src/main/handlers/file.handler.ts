import { ipcMain, dialog, shell, clipboard, nativeImage, app } from 'electron'
import { writeFile, mkdir, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { IPC_CHANNELS } from '../../shared/constants/channels'

export function registerFileHandlers(): void {
  // Save file with dialog
  ipcMain.handle(IPC_CHANNELS.FILE_SAVE, async (_event, data: {
    buffer: ArrayBuffer
    defaultName: string
    filters?: Electron.FileFilter[]
  }): Promise<string | null> => {
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: data.defaultName,
        filters: data.filters || [
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return null
      }

      await writeFile(result.filePath, Buffer.from(data.buffer))
      return result.filePath
    } catch (error) {
      console.error('Failed to save file:', error)
      throw error
    }
  })

  // Save file to default location without dialog
  ipcMain.handle('file:save-auto', async (_event, data: {
    buffer: ArrayBuffer
    filename: string
    subfolder?: string
  }): Promise<string> => {
    try {
      const videosPath = app.getPath('videos')
      const outputDir = join(videosPath, 'ScreenTool', data.subfolder || '')

      // Ensure directory exists
      await mkdir(outputDir, { recursive: true })

      const filePath = join(outputDir, data.filename)
      await writeFile(filePath, Buffer.from(data.buffer))

      return filePath
    } catch (error) {
      console.error('Failed to save file:', error)
      throw error
    }
  })

  // Open folder in file explorer
  ipcMain.handle(IPC_CHANNELS.FILE_OPEN_FOLDER, async (_event, folderPath?: string): Promise<void> => {
    const path = folderPath || join(app.getPath('videos'), 'ScreenTool')
    await shell.openPath(path)
  })

  // Get recent captures
  ipcMain.handle(IPC_CHANNELS.FILE_GET_RECENT, async (_event, limit = 20): Promise<{
    path: string
    name: string
    type: 'video' | 'image'
    size: number
    created: number
  }[]> => {
    try {
      const outputDir = join(app.getPath('videos'), 'ScreenTool')

      // Try to read directory, return empty if doesn't exist
      let files: string[]
      try {
        files = await readdir(outputDir)
      } catch {
        return []
      }

      // Get file stats and filter for media files
      const mediaExtensions = ['.webm', '.mp4', '.png', '.jpg', '.jpeg', '.gif']
      const fileStats = await Promise.all(
        files
          .filter((f) => mediaExtensions.some((ext) => f.toLowerCase().endsWith(ext)))
          .map(async (filename) => {
            const filePath = join(outputDir, filename)
            const stats = await stat(filePath)
            const isVideo = ['.webm', '.mp4'].some((ext) => filename.toLowerCase().endsWith(ext))

            return {
              path: filePath,
              name: filename,
              type: isVideo ? 'video' as const : 'image' as const,
              size: stats.size,
              created: stats.birthtime.getTime()
            }
          })
      )

      // Sort by creation time, newest first
      fileStats.sort((a, b) => b.created - a.created)

      return fileStats.slice(0, limit)
    } catch (error) {
      console.error('Failed to get recent files:', error)
      return []
    }
  })

  // Copy image to clipboard
  ipcMain.handle('file:copy-to-clipboard', async (_event, data: {
    dataUrl: string
  }): Promise<boolean> => {
    try {
      const image = nativeImage.createFromDataURL(data.dataUrl)
      clipboard.writeImage(image)
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  })

  // Save screenshot
  ipcMain.handle('capture:save-screenshot', async (_event, data: {
    dataUrl: string
    copyToClipboard: boolean
    saveToFile: boolean
    filename?: string
  }): Promise<{ clipboardSuccess: boolean; filePath: string | null }> => {
    const result = { clipboardSuccess: false, filePath: null as string | null }

    try {
      const image = nativeImage.createFromDataURL(data.dataUrl)

      // Copy to clipboard if requested
      if (data.copyToClipboard) {
        clipboard.writeImage(image)
        result.clipboardSuccess = true
      }

      // Save to file if requested
      if (data.saveToFile) {
        const outputDir = join(app.getPath('videos'), 'ScreenTool', 'screenshots')
        await mkdir(outputDir, { recursive: true })

        const filename = data.filename || `screenshot-${Date.now()}.png`
        const filePath = join(outputDir, filename)

        await writeFile(filePath, image.toPNG())
        result.filePath = filePath
      }

      return result
    } catch (error) {
      console.error('Failed to save screenshot:', error)
      throw error
    }
  })
}
