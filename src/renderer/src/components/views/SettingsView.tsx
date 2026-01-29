import { useState, useEffect } from 'react'
import type { VideoQuality } from '../../../../shared/types/capture.types'
import { VIDEO_QUALITY_PRESETS } from '../../../../shared/types/capture.types'

interface HotkeyBinding {
  id: string
  accelerator: string
  action: string
  enabled: boolean
}

const ACTION_LABELS: Record<string, string> = {
  startStopRecording: 'Start/Stop Recording',
  pauseRecording: 'Pause Recording',
  screenshot: 'Take Screenshot',
  regionScreenshot: 'Region Screenshot'
}

export function SettingsView(): JSX.Element {
  const [quality, setQuality] = useState<VideoQuality>('high')
  const [fps, setFps] = useState(30)
  const [outputFormat, setOutputFormat] = useState<'mp4' | 'webm'>('mp4')
  const [hotkeys, setHotkeys] = useState<HotkeyBinding[]>([])
  const [editingHotkey, setEditingHotkey] = useState<string | null>(null)

  // Load hotkeys on mount
  useEffect(() => {
    loadHotkeys()
  }, [])

  const loadHotkeys = async () => {
    try {
      const bindings = await window.api.hotkey.getAll()
      setHotkeys(bindings)
    } catch (error) {
      console.error('Failed to load hotkeys:', error)
    }
  }

  const handleHotkeyToggle = async (id: string, enabled: boolean) => {
    try {
      await window.api.hotkey.setEnabled(id, enabled)
      setHotkeys((prev) =>
        prev.map((h) => (h.id === id ? { ...h, enabled } : h))
      )
    } catch (error) {
      console.error('Failed to toggle hotkey:', error)
    }
  }

  const handleHotkeyCapture = (id: string) => {
    setEditingHotkey(id)
  }

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (!editingHotkey) return

    e.preventDefault()

    // Build accelerator string
    const parts: string[] = []
    if (e.ctrlKey) parts.push('Control')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')
    if (e.metaKey) parts.push('Meta')

    // Get the key
    const key = e.key.toUpperCase()
    if (!['CONTROL', 'ALT', 'SHIFT', 'META'].includes(key)) {
      parts.push(key === ' ' ? 'Space' : key)

      const accelerator = parts.join('+')

      // Check if already registered
      const isRegistered = await window.api.hotkey.isRegistered(accelerator)
      const currentHotkey = hotkeys.find((h) => h.id === editingHotkey)

      if (isRegistered && currentHotkey?.accelerator !== accelerator) {
        alert(`Hotkey ${accelerator} is already in use`)
        return
      }

      // Update hotkey
      try {
        const success = await window.api.hotkey.update(editingHotkey, { accelerator })
        if (success) {
          setHotkeys((prev) =>
            prev.map((h) => (h.id === editingHotkey ? { ...h, accelerator } : h))
          )
        }
      } catch (error) {
        console.error('Failed to update hotkey:', error)
      }

      setEditingHotkey(null)
    }
  }

  const formatAccelerator = (accelerator: string): string => {
    return accelerator
      .replace('CommandOrControl', 'Ctrl')
      .replace('Control', 'Ctrl')
      .replace('+', ' + ')
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {/* Video Quality */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Video Quality</h2>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(VIDEO_QUALITY_PRESETS) as VideoQuality[]).map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${
                  quality === q
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }
              `}
            >
              <span className="font-medium text-foreground">{VIDEO_QUALITY_PRESETS[q].label}</span>
              <p className="text-xs text-muted-foreground mt-1">
                {VIDEO_QUALITY_PRESETS[q].width}x{VIDEO_QUALITY_PRESETS[q].height} @{' '}
                {(VIDEO_QUALITY_PRESETS[q].videoBitsPerSecond / 1_000_000).toFixed(1)} Mbps
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Frame Rate */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Frame Rate</h2>
        <div className="flex gap-3">
          {[24, 30, 60].map((f) => (
            <button
              key={f}
              onClick={() => setFps(f)}
              className={`
                px-6 py-3 rounded-lg border-2 font-medium transition-all
                ${
                  fps === f
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }
              `}
            >
              {f} FPS
            </button>
          ))}
        </div>
      </section>

      {/* Output Format */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Output Format</h2>
        <div className="flex gap-3">
          {(['mp4', 'webm'] as const).map((format) => (
            <button
              key={format}
              onClick={() => setOutputFormat(format)}
              className={`
                px-6 py-3 rounded-lg border-2 font-medium uppercase transition-all
                ${
                  outputFormat === format
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }
              `}
            >
              {format}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {outputFormat === 'mp4'
            ? 'MP4 provides better compatibility but requires conversion after recording.'
            : 'WebM records directly but may have limited playback support.'}
        </p>
      </section>

      {/* Hotkeys */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Hotkeys</h2>
        <p className="text-sm text-muted-foreground">
          Click on a hotkey to change it. Press Escape to cancel.
        </p>
        <div className="space-y-2">
          {hotkeys.map((hotkey) => (
            <div
              key={hotkey.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
            >
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hotkey.enabled}
                    onChange={(e) => handleHotkeyToggle(hotkey.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                </label>
                <span className={`text-sm ${hotkey.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {ACTION_LABELS[hotkey.action] || hotkey.action}
                </span>
              </div>
              <button
                onClick={() => handleHotkeyCapture(hotkey.id)}
                onKeyDown={editingHotkey === hotkey.id ? handleKeyDown : undefined}
                className={`
                  px-3 py-1 rounded text-xs font-mono transition-colors
                  ${editingHotkey === hotkey.id
                    ? 'bg-primary text-primary-foreground animate-pulse'
                    : 'bg-background border border-border text-muted-foreground hover:border-primary'
                  }
                `}
              >
                {editingHotkey === hotkey.id
                  ? 'Press keys...'
                  : formatAccelerator(hotkey.accelerator)}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Output Folder */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Output Folder</h2>
        <div className="flex gap-3">
          <input
            type="text"
            readOnly
            value="~/Videos/ScreenTool"
            className="flex-1 px-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground"
          />
          <button
            onClick={() => window.api.file.openFolder()}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Open
          </button>
        </div>
      </section>

      {/* About */}
      <section className="space-y-2 pt-4 border-t border-border">
        <h2 className="text-lg font-semibold text-foreground">About</h2>
        <p className="text-sm text-muted-foreground">
          ScreenTool v1.0.0
        </p>
        <p className="text-xs text-muted-foreground">
          A Windows screen recording app with screenshots and annotations.
        </p>
      </section>
    </div>
  )
}
