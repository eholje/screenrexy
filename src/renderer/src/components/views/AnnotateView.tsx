import { useState, useRef, useEffect } from 'react'
import { AnnotationCanvas } from '../annotation/AnnotationCanvas'
import { AnnotationToolbar } from '../annotation/AnnotationToolbar'
import { useAnnotationStore } from '../../stores/annotationStore'

interface AnnotateViewProps {
  screenshotData?: string
}

export function AnnotateView({ screenshotData }: AnnotateViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [voiceDuration, setVoiceDuration] = useState(0)
  const [voiceRecordingUrl, setVoiceRecordingUrl] = useState<string | null>(null)
  const voiceTimerRef = useRef<number | null>(null)

  const { clearAnnotations, annotations } = useAnnotationStore()

  // Load screenshot if provided
  useEffect(() => {
    if (screenshotData) {
      setBackgroundImage(screenshotData)
    }
  }, [screenshotData])

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
    // Capture the primary screen as background
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

  const handleStartVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)
        setVoiceRecordingUrl(audioUrl)

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start(1000) // Collect data every second
      setIsRecordingVoice(true)
      setVoiceDuration(0)

      // Start timer
      voiceTimerRef.current = window.setInterval(() => {
        setVoiceDuration(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Failed to start voice recording:', error)
      alert('Failed to access microphone. Please grant permission.')
    }
  }

  const handleStopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop()
      setIsRecordingVoice(false)

      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current)
        voiceTimerRef.current = null
      }
    }
  }

  const handleExportCanvas = async () => {
    // Export annotations as image
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')

    try {
      const result = await window.api.capture.saveScreenshot({
        dataUrl,
        copyToClipboard: true,
        saveToFile: true,
        filename: `annotated-${Date.now()}.png`
      })

      // If there's a voice recording, save it too
      if (voiceRecordingUrl) {
        const response = await fetch(voiceRecordingUrl)
        const blob = await response.blob()
        const buffer = await blob.arrayBuffer()

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
        await window.api.file.saveAuto({
          buffer,
          filename: `voice-note-${timestamp}.webm`,
          subfolder: 'VoiceNotes'
        })
      }

      alert(`Saved! ${result.clipboardSuccess ? 'Copied to clipboard.' : ''}`)
    } catch (error) {
      console.error('Failed to export:', error)
      alert('Failed to save annotation')
    }
  }

  const formatVoiceDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Annotate & Record</h1>
        <div className="flex gap-2">
          {!screenshotData && (
            <button
              onClick={handleLoadImage}
              className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Capture Screen
            </button>
          )}

          {/* Voice recording controls */}
          {!isRecordingVoice ? (
            <button
              onClick={handleStartVoiceRecording}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              Record Voice
            </button>
          ) : (
            <button
              onClick={handleStopVoiceRecording}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 animate-pulse"
            >
              <div className="w-3 h-3 rounded-full bg-white" />
              Stop ({formatVoiceDuration(voiceDuration)})
            </button>
          )}

          <button
            onClick={handleExportCanvas}
            disabled={!backgroundImage && annotations.length === 0}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Save & Export
          </button>
        </div>
      </div>

      {/* Voice recording playback */}
      {voiceRecordingUrl && !isRecordingVoice && (
        <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Voice note recorded ({formatVoiceDuration(voiceDuration)})</p>
            <audio src={voiceRecordingUrl} controls className="w-full mt-1" />
          </div>
          <button
            onClick={() => {
              setVoiceRecordingUrl(null)
              setVoiceDuration(0)
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

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
          <li>Draw, add text, and shapes to annotate your screenshot</li>
          <li>Click "Record Voice" to add voice notes to your annotation</li>
          <li>Use <kbd className="px-1 py-0.5 bg-secondary rounded text-xs">Ctrl+Z</kbd> to undo, <kbd className="px-1 py-0.5 bg-secondary rounded text-xs">Ctrl+Y</kbd> to redo</li>
          <li>"Save & Export" will save both the annotated image and voice note</li>
        </ul>
      </div>
    </div>
  )
}
