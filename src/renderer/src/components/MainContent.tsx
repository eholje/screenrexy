import type { AppView } from '../App'
import { RecordView } from './views/RecordView'
import { ScreenshotView } from './views/ScreenshotView'
import { AnnotateView } from './views/AnnotateView'
import { GalleryView } from './views/GalleryView'
import { SettingsView } from './views/SettingsView'

interface MainContentProps {
  currentView: AppView
  onViewChange: (view: AppView, screenshot?: string) => void
  screenshotData?: string
}

export function MainContent({ currentView, onViewChange, screenshotData }: MainContentProps): JSX.Element {
  const handleNavigate = (view: 'annotate', screenshot?: string) => {
    onViewChange(view, screenshot)
  }

  const renderView = () => {
    switch (currentView) {
      case 'record':
        return <RecordView onNavigate={handleNavigate} />
      case 'screenshot':
        return <ScreenshotView />
      case 'annotate':
        return <AnnotateView screenshotData={screenshotData} />
      case 'gallery':
        return <GalleryView />
      case 'settings':
        return <SettingsView />
      default:
        return <RecordView onNavigate={handleNavigate} />
    }
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      {renderView()}
    </main>
  )
}
