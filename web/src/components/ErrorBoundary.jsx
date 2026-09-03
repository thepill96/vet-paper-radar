import { Component } from "react";

// 한 화면에서 오류가 나도 앱 전체가 하얗게 되지 않도록 감싸고, 원인을 화면에 보여준다.
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("UI error:", error, info); }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page">
        <div className="setup-warn">
          <b>이 화면을 표시하는 중 오류가 발생했습니다 / Something went wrong on this screen</b>
          <div>다른 탭은 계속 사용할 수 있습니다. 아래 내용을 그대로 알려주시면 고칠 수 있습니다.</div>
          <code>{String(this.state.error?.message || this.state.error)}</code>
        </div>
        <button className="btn" onClick={() => this.setState({ error: null })}>다시 시도 / Retry</button>
      </div>
    );
  }
}
