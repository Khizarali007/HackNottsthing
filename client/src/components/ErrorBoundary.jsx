import { Component } from 'react'
import StatusDialog from './StatusDialog.jsx'

// Shows an XP error dialog instead of a blank page if rendering crashes.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Commit Explorer crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="h-screen w-screen xp-desktop">
        <StatusDialog
          title="Commit Explorer - Error"
          icon="error"
          action={
            <button type="button" className="xp-button" onClick={() => window.location.reload()}>
              Reload
            </button>
          }
        >
          <p>Something went wrong and Commit Explorer has to reload.</p>
          <p className="xp-dialog-detail">{String(this.state.error.message || this.state.error)}</p>
        </StatusDialog>
      </div>
    )
  }
}
