import { useState, useRef, useCallback, useEffect } from 'react'

interface VoiceRecorderProps {
  onRecordingComplete?: (blob: Blob, duration: number) => void
  maxDuration?: number // Max recording duration in seconds
  className?: string
}

export function VoiceRecorder({
  onRecordingComplete,
  maxDuration = 300, // 5 minutes default
  className = ''
}: VoiceRecorderProps): JSX.Element {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [waveformData, setWaveformData] = useState<number[]>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const animationRef = useRef<number | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // Set up audio analyzer for waveform visualization
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyzerRef.current = audioContextRef.current.createAnalyser()
      analyzerRef.current.fftSize = 256
      source.connect(analyzerRef.current)

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      })

      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        onRecordingComplete?.(blob, duration)

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())

        // Close audio context
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100)

      // Start duration timer
      setDuration(0)
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)

      // Start waveform animation
      const updateWaveform = () => {
        if (!analyzerRef.current) return

        const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount)
        analyzerRef.current.getByteFrequencyData(dataArray)

        // Convert to normalized values (0-1) and take a subset
        const samples = Array.from(dataArray.slice(0, 32)).map((v) => v / 255)
        setWaveformData(samples)

        if (isRecording) {
          animationRef.current = requestAnimationFrame(updateWaveform)
        }
      }
      updateWaveform()

      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Could not access microphone. Please grant permission.')
    }
  }, [maxDuration, duration, isRecording, onRecordingComplete])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    setIsRecording(false)
    setWaveformData([])
  }, [])

  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setDuration(0)
  }, [audioUrl])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Waveform visualization */}
      {isRecording && (
        <div className="flex items-center justify-center gap-1 h-12 bg-secondary/50 rounded-lg px-4">
          {waveformData.map((value, index) => (
            <div
              key={index}
              className="w-1 bg-primary rounded-full transition-all duration-75"
              style={{ height: `${Math.max(4, value * 40)}px` }}
            />
          ))}
        </div>
      )}

      {/* Audio playback */}
      {audioUrl && !isRecording && (
        <div className="flex items-center gap-4">
          <audio src={audioUrl} controls className="flex-1 h-10" />
          <button
            onClick={clearRecording}
            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
            title="Delete recording"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" />
            </svg>
            Stop Recording
          </button>
        )}

        {/* Duration display */}
        <span className="text-sm font-mono text-muted-foreground">
          {formatTime(duration)} / {formatTime(maxDuration)}
        </span>

        {/* Progress bar */}
        {isRecording && (
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-destructive transition-all duration-1000"
              style={{ width: `${(duration / maxDuration) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
