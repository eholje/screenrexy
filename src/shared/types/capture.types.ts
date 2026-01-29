/**
 * Types for screen capture functionality
 */

export interface CaptureSource {
  id: string
  name: string
  thumbnail: string
  display_id?: string
  appIcon?: string
}

export interface RecordingOptions {
  sourceId: string
  sourceType: 'screen' | 'window'
  region?: CaptureRegion
  includeAudio: boolean
  includeMicrophone: boolean
  quality: VideoQuality
  fps: number
}

export interface CaptureRegion {
  x: number
  y: number
  width: number
  height: number
}

export type VideoQuality = 'low' | 'medium' | 'high' | 'ultra'

export interface VideoQualityPreset {
  label: string
  videoBitsPerSecond: number
  width?: number
  height?: number
}

export const VIDEO_QUALITY_PRESETS: Record<VideoQuality, VideoQualityPreset> = {
  low: { label: 'Low (720p)', videoBitsPerSecond: 2_500_000, width: 1280, height: 720 },
  medium: { label: 'Medium (1080p)', videoBitsPerSecond: 5_000_000, width: 1920, height: 1080 },
  high: { label: 'High (1440p)', videoBitsPerSecond: 10_000_000, width: 2560, height: 1440 },
  ultra: { label: 'Ultra (4K)', videoBitsPerSecond: 20_000_000, width: 3840, height: 2160 }
}

export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing'

export interface RecordingStatus {
  state: RecordingState
  duration: number
  fileSize?: number
  outputPath?: string
}

export interface ScreenshotOptions {
  sourceId?: string
  region?: CaptureRegion
  format: 'png' | 'jpg'
  quality?: number // 0-100 for jpg
  copyToClipboard: boolean
  savePath?: string
}
