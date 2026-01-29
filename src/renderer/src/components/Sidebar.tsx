import type { AppView } from '../App'

interface SidebarProps {
  currentView: AppView
  onViewChange: (view: AppView) => void
}

// Navigation items - balance between simplicity and power user features
const navItems: { id: AppView; label: string; icon: JSX.Element }[] = [
  {
    id: 'record',
    label: 'Capture',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
    )
  },
  {
    id: 'annotate',
    label: 'Annotate',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
      </svg>
    )
  },
  {
    id: 'gallery',
    label: 'Recordings',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="2" />
        <circle cx="12" cy="10" r="3" />
        <path d="m7 21 5-5 5 5" />
      </svg>
    )
  }
]

export function Sidebar({ currentView, onViewChange }: SidebarProps): JSX.Element {
  return (
    <div className="w-20 bg-card border-r border-border flex flex-col items-center py-6 gap-3">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`
            w-16 h-16 flex flex-col items-center justify-center rounded-xl
            transition-all duration-200 gap-1.5
            ${
              currentView === item.id
                ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-105'
            }
          `}
          title={item.label}
        >
          <div className="flex items-center justify-center">
            {item.icon}
          </div>
          <span className="text-[9px] font-semibold uppercase tracking-wide">{item.label}</span>
        </button>
      ))}
    </div>
  )
}
