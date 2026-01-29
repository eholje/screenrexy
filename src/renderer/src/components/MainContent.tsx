import type { AppView } from '../App'
import { RecordView } from './views/RecordView'
import { ScreenshotView } from './views/ScreenshotView'
import { AnnotateView } from './views/AnnotateView'
import { GalleryView } from './views/GalleryView'
import { SettingsView } from './views/SettingsView'

interface MainContentProps {
  currentView: AppView
}

export function MainContent({ currentView }: MainContentProps): JSX.Element {
  const renderView = () => {
    switch (currentView) {
      case 'record':
        return <RecordView />
      case 'screenshot':
        return <ScreenshotView />
      case 'annotate':
        return <AnnotateView />
      case 'gallery':
        return <GalleryView />
      case 'settings':
        return <SettingsView />
      default:
        return <RecordView />
    }
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      {renderView()}
    </main>
  )
}
