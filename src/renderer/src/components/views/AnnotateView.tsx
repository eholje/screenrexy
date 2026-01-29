import { useState, useRef, useEffect } from 'react'
import { AnnotationCanvas } from '../annotation/AnnotationCanvas'
import { AnnotationToolbar } from '../annotation/AnnotationToolbar'
import { useAnnotationStore } from '../../stores/annotationStore'

export function AnnotateView(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const { clearAnnotations, annotations } = useAnnotationStore()

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: rect.width,
          height: rect.height - 80 // Account for toolbar
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const handleLoadImage = async () => {
    // For now, capture the primary screen as background
    try {
      const primaryScreen = await window.api.capture.getPrimaryScreen()
      if (!primaryScreen) return

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: primaryScreen.id
          }
        } as MediaTrackConstraints
      })

      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play()
          resolve()
        }
      })

      await new Promise((resolve) => requestAnimationFrame(resolve))

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0)

      stream.getTracks().forEach((track) => track.stop())

      setBackgroundImage(canvas.toDataURL('image/png'))
    } catch (error) {
      console.error('Failed to capture screen:', error)
    }
  }

  const handleExportCanvas = async () => {
    // Export annotations as image
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')

    await window.api.capture.saveScreenshot({
      dataUrl,
      copyToClipboard: true,
      saveToFile: true,
      filename: `annotated-${Date.now()}.png`
    })
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Annotations</h1>
        <div className="flex gap-2">
          <button
            onClick={handleLoadImage}
            className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Capture Screen
          </button>
          <button
            onClick={handleExportCanvas}
            disabled={annotations.length === 0}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Export
          </button>
        </div>
      </div>

      <AnnotationToolbar onClear={clearAnnotations} />

      <div
        ref={containerRef}
        className="flex-1 border border-border rounded-lg overflow-hidden bg-muted"
        style={{ position: 'relative' }}
      >
        {backgroundImage && (
          <img
            src={backgroundImage}
            alt="Background"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: dimensions.width,
              height: dimensions.height,
              objectFit: 'contain'
            }}
          />
        )}
        <AnnotationCanvas
          width={dimensions.width}
          height={dimensions.height}
          backgroundImage={backgroundImage || undefined}
        />
      </div>

      <div className="text-sm text-muted-foreground">
        <p>Tips:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Use <kbd className="px-1 py-0.5 bg-secondary rounded text-xs">Ctrl+Z</kbd> to undo, <kbd className="px-1 py-0.5 bg-secondary rounded text-xs">Ctrl+Y</kbd> to redo</li>
          <li>Press <kbd className="px-1 py-0.5 bg-secondary rounded text-xs">Delete</kbd> to remove selected annotation</li>
          <li>Double-click text to edit it</li>
        </ul>
      </div>
    </div>
  )
}
