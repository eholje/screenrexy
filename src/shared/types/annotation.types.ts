/**
 * Types for annotation functionality
 */

export type AnnotationTool = 'select' | 'pen' | 'highlighter' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'eraser'

export interface Point {
  x: number
  y: number
}

export interface BaseAnnotation {
  id: string
  type: AnnotationTool
  color: string
  strokeWidth: number
  opacity: number
  timestamp?: number // For video annotations
  createdAt: number
}

export interface PenAnnotation extends BaseAnnotation {
  type: 'pen' | 'highlighter'
  points: number[] // Flat array [x1,y1,x2,y2,...]
  tension: number
}

export interface RectangleAnnotation extends BaseAnnotation {
  type: 'rectangle'
  x: number
  y: number
  width: number
  height: number
  fill?: string
}

export interface CircleAnnotation extends BaseAnnotation {
  type: 'circle'
  x: number
  y: number
  radiusX: number
  radiusY: number
  fill?: string
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow'
  points: [number, number, number, number] // [x1, y1, x2, y2]
  pointerLength: number
  pointerWidth: number
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text'
  x: number
  y: number
  text: string
  fontSize: number
  fontFamily: string
  fontStyle?: 'normal' | 'italic' | 'bold' | 'bold italic'
}

export type Annotation =
  | PenAnnotation
  | RectangleAnnotation
  | CircleAnnotation
  | ArrowAnnotation
  | TextAnnotation

export interface VoiceAnnotation {
  id: string
  startTime: number // Timestamp in video (ms)
  duration: number
  audioBlob: Blob
  waveform?: number[]
  createdAt: number
}

export interface AnnotationToolSettings {
  tool: AnnotationTool
  color: string
  strokeWidth: number
  fontSize: number
  fontFamily: string
  opacity: number
}

export const DEFAULT_TOOL_SETTINGS: AnnotationToolSettings = {
  tool: 'pen',
  color: '#ff0000',
  strokeWidth: 3,
  fontSize: 24,
  fontFamily: 'Arial',
  opacity: 1
}

export const DEFAULT_COLORS = [
  '#ff0000', // Red
  '#ff9500', // Orange
  '#ffcc00', // Yellow
  '#34c759', // Green
  '#007aff', // Blue
  '#5856d6', // Purple
  '#ff2d55', // Pink
  '#000000', // Black
  '#ffffff'  // White
]
