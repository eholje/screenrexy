import {
  VIDEO_QUALITY_PRESETS,
  type RecordingOptions,
  type RecordingState,
  type RecordingStatus,
  type CaptureRegion,
  type VideoQuality
} from '../../../shared/types/capture.types'

export interface RecordingServiceEvents {
  onStateChange: (state: RecordingState) => void
  onDurationUpdate: (duration: number) => void
  onError: (error: Error) => void
  onDataAvailable: (blob: Blob) => void
}

export class RecordingService {
  private mediaRecorder: MediaRecorder | null = null
  private mediaStream: MediaStream | null = null
  private recordedChunks: Blob[] = []
  private startTime: number = 0
  private pausedDuration: number = 0
  private pauseStartTime: number = 0
  private durationInterval: number | null = null
  private state: RecordingState = 'idle'
  private events: Partial<RecordingServiceEvents> = {}

  constructor(events?: Partial<RecordingServiceEvents>) {
    this.events = events || {}
  }

  private setState(newState: RecordingState): void {
    this.state = newState
    this.events.onStateChange?.(newState)
  }

  private updateDuration(): void {
    if (this.state === 'recording') {
      const elapsed = Date.now() - this.startTime - this.pausedDuration
      this.events.onDurationUpdate?.(elapsed)
    }
  }

  async startRecording(options: RecordingOptions): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error('Recording already in progress')
    }

    try {
      // Get video stream from desktopCapturer source
      const videoStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: options.sourceId
          }
        } as MediaTrackConstraints
      })

      // Create combined stream
      const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()]

      // Add microphone if requested
      if (options.includeMicrophone) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true
            },
            video: false
          })
          tracks.push(...micStream.getAudioTracks())
        } catch (micError) {
          console.warn('Could not access microphone:', micError)
        }
      }

      // Add system audio if requested (via display media)
      if (options.includeAudio) {
        try {
          const displayMedia = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          })
          // Only take the audio track, discard the video
          const audioTracks = displayMedia.getAudioTracks()
          if (audioTracks.length > 0) {
            tracks.push(...audioTracks)
          }
          // Stop the video track we don't need
          displayMedia.getVideoTracks().forEach((track) => track.stop())
        } catch (audioError) {
          console.warn('Could not capture system audio:', audioError)
        }
      }

      this.mediaStream = new MediaStream(tracks)

      // Create MediaRecorder with appropriate settings
      const mimeType = this.getSupportedMimeType()
      const qualityPreset = VIDEO_QUALITY_PRESETS[options.quality]

      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        videoBitsPerSecond: qualityPreset.videoBitsPerSecond
      })

      this.recordedChunks = []
      this.startTime = Date.now()
      this.pausedDuration = 0

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
          this.events.onDataAvailable?.(event.data)
        }
      }

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        this.events.onError?.(new Error('Recording failed'))
        this.cleanup()
      }

      this.mediaRecorder.onstop = () => {
        // Recording stopped, data is ready
      }

      // Request data every second for progress indication
      this.mediaRecorder.start(1000)

      // Start duration timer
      this.durationInterval = window.setInterval(() => this.updateDuration(), 100)

      this.setState('recording')
    } catch (error) {
      console.error('Failed to start recording:', error)
      this.cleanup()
      throw error
    }
  }

  pauseRecording(): void {
    if (this.state !== 'recording' || !this.mediaRecorder) {
      return
    }

    this.mediaRecorder.pause()
    this.pauseStartTime = Date.now()
    this.setState('paused')
  }

  resumeRecording(): void {
    if (this.state !== 'paused' || !this.mediaRecorder) {
      return
    }

    this.pausedDuration += Date.now() - this.pauseStartTime
    this.mediaRecorder.resume()
    this.setState('recording')
  }

  async stopRecording(): Promise<Blob> {
    if (this.state === 'idle' || !this.mediaRecorder) {
      throw new Error('No recording in progress')
    }

    this.setState('processing')

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.getSupportedMimeType()
        const blob = new Blob(this.recordedChunks, { type: mimeType })
        this.cleanup()
        resolve(blob)
      }

      this.mediaRecorder.stop()
    })
  }

  cancelRecording(): void {
    this.cleanup()
  }

  getStatus(): RecordingStatus {
    let duration = 0
    if (this.state === 'recording') {
      duration = Date.now() - this.startTime - this.pausedDuration
    } else if (this.state === 'paused') {
      duration = this.pauseStartTime - this.startTime - this.pausedDuration
    }

    return {
      state: this.state,
      duration
    }
  }

  private cleanup(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval)
      this.durationInterval = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }

    this.mediaRecorder = null
    this.recordedChunks = []
    this.setState('idle')
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    return 'video/webm'
  }
}

// Singleton instance
let recordingServiceInstance: RecordingService | null = null

export function getRecordingService(events?: Partial<RecordingServiceEvents>): RecordingService {
  if (!recordingServiceInstance) {
    recordingServiceInstance = new RecordingService(events)
  }
  return recordingServiceInstance
}

export function createRecordingService(events: Partial<RecordingServiceEvents>): RecordingService {
  return new RecordingService(events)
}
