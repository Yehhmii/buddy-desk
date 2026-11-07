import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/** If the UI ever crashes, show a way back instead of a blank window. */
export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    window.api.diagnostics.report(`${error.message}\n${info.componentStack ?? ''}`.slice(0, 2000));
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <div>
          <p className="text-[22px] font-semibold tracking-[-0.02em]">Something went wrong</p>
          <p className="mt-2 text-[14px] text-mute">Your tasks and alarms are safe. Reload to carry on.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="no-drag mt-6 h-10 rounded-full bg-accent px-5 text-sm font-medium text-white"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
