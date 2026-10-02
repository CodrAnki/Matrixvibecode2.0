import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode; /** Changing this (e.g. the route path) clears a previous error. */ resetKey?: string }
interface State { error: Error | null }

/** Last line of defence: a render error in one page shows a friendly message instead of a blank app. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State { return { error } }

  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[ui] render error:', error.message, info.componentStack) }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-[60svh] place-items-center p-6">
        <div className="glass max-w-md p-8 text-center">
          <p className="hud-label mb-3">Something went wrong</p>
          <p className="text-sm text-slate-300">This page ran into an unexpected problem. Your data is safe — please try again.</p>
          <button onClick={() => window.location.reload()} className="mt-5 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-cyan-100 hover:bg-cyan-400/20">Reload page</button>
        </div>
      </div>
    )
  }
}
