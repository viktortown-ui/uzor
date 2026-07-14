import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { flushSync } from 'react-dom';

type Props = { children: ReactNode };
type State = { failed: boolean; retryKey: number };

export class MobileDeltaCreateErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, retryKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Mobile Delta screen failed', error, info.componentStack);
  }

  resetBoundary = () => this.setState(({ retryKey }) => ({ failed: false, retryKey: retryKey + 1 }));
  retry = () => this.resetBoundary();
  resetBeforeNavigation = () => flushSync(() => this.resetBoundary());

  render() {
    if (this.state.failed) {
      return (
        <section className="mobile-delta-flow mobile-delta-state mobile-delta-error-boundary" role="alert" aria-labelledby="mobile-delta-error-title">
          <h1 id="mobile-delta-error-title">Не удалось открыть этот экран</h1>
          <p>Черновик сохранён. Можно повторить попытку или вернуться к описанию изменения.</p>
          <button className="mobile-delta-primary" type="button" onClick={this.retry}>Повторить</button>
          <Link to="/contribute" onClick={this.resetBeforeNavigation}>Вернуться к описанию</Link>
          <Link to="/pulse" onClick={this.resetBeforeNavigation}>Вернуться в Пульс</Link>
        </section>
      );
    }
    return <div key={this.state.retryKey} className="mobile-delta-boundary-host">{this.props.children}</div>;
  }
}
