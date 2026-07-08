import { Link } from 'react-router-dom';
export function WrappedState({ title, body, to, label }: { title: string; body: string; to?: string; label?: string }) { return <div className="wrapped-page"><div className="wrapped-state"><h1>{title}</h1><p>{body}</p>{to && <Link className="wrapped-primary" to={to}>{label}</Link>}</div></div>; }
