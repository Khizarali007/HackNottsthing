// Centred XP dialog for loading, empty and error states.
// icon: 'loading' | 'info' | 'error'
export default function StatusDialog({ title, icon = 'info', children, action }) {
  return (
    <div className="xp-dialog-overlay">
      <div className="xp-window xp-dialog" role={icon === 'error' ? 'alertdialog' : 'status'}>
        <div className="xp-titlebar">
          <span className="xp-title">{title}</span>
        </div>
        <div className="xp-dialog-body">
          {icon === 'loading' ? (
            <div className="xp-progress" aria-label="Loading">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <span className={`xp-icon xp-icon--${icon}`} aria-hidden="true">
              {icon === 'error' ? '✕' : 'i'}
            </span>
          )}
          <div className="xp-dialog-text">{children}</div>
        </div>
        {action && <div className="xp-dialog-actions">{action}</div>}
      </div>
    </div>
  )
}
