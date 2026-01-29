import { useState, useCallback, useRef, useEffect } from 'react'
import {
  RecordingService,
  createRecordingService
} from '../services/RecordingService'
import type {
  RecordingState,
  RecordingOptions,
  VideoQuality
} from '../../../shared/types/capture.types'

export interface UseRecordingOptions {
  onRecordingComplete?: (blob: Blob) => void
  onError?: (error: Error) => void
}

export interface UseRecordingReturn {
  state: RecordingState
  duration: number
  startRecording: (options: RecordingOptions) => Promise<void>
  stopRecording: () => Promise<Blob | null>
  pauseRecording: () => void
  resumeRecording: () => void
  cancelRecording: () => void
}

export function useRecording(options?: UseRecordingOptions): UseRecordingReturn {
  const [state, setState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0)
  const serviceRef = useRef<RecordingService | null>(null)

  // Initialize service on mount
  useEffect(() => {
    serviceRef.current = createRecordingService({
      onStateChange: setState,
      onDurationUpdate: setDuration,
      onError: (error) => {
        console.error('Recording error:', error)
        options?.onError?.(error)
      }
    })

    return () => {
      serviceRef.current?.cancelRecording()
    }
  }, [])

  const startRecording = useCallback(async (recordingOptions: RecordingOptions) => {
    if (!serviceRef.current) return
    await serviceRef.current.startRecording(recordingOptions)
  }, [])

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!serviceRef.current) return null
    try {
      const blob = await serviceRef.current.stopRecording()
      options?.onRecordingComplete?.(blob)
      return blob
    } catch (error) {
      console.error('Failed to stop recording:', error)
      return null
    }
  }, [options])

  const pauseRecording = useCallback(() => {
    serviceRef.current?.pauseRecording()
  }, [])

  const resumeRecording = useCallback(() => {
    serviceRef.current?.resumeRecording()
  }, [])

  const cancelRecording = useCallback(() => {
    serviceRef.current?.cancelRecording()
    setDuration(0)
  }, [])

  return {
    state,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording
  }
}

// Helper to format duration in HH:MM:SS
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((v) => v.toString().padStart(2, '0'))
    .join(':')
}
