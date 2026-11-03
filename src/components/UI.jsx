import React, { useEffect, useRef, useId } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, ArrowUpRight, ArrowRight, X, Check, LoaderCircle, Leaf, Atom, FlaskConical, Sigma, Landmark, FileText, Search, Inbox, AlertCircle, ChevronRight } from 'lucide-react';
import { cx } from '../lib/utils';
import { SUBJECTS } from '../data/demo';
import { useApp } from '../context/AppContext';

export function Logo({ small = false, light = false }) { return <Link to="/" className={cx('brand', light && 'brand-light')} aria-label="StudyMind AI home"><span className="brand-mark"><BookOpen size={23} strokeWidth={1.8}/><Sparkles className="brand-spark" size={11} fill="currentColor"/></span>{!small && <span>StudyMind<span className="brand-ai">AI</span></span>}</Link>; }
export function Button({ children, to, href, variant = 'primary', size = '', className, loading, icon: Icon, disabled, ...props }) {
  const classes = cx('btn', `btn-${variant}`, size && `btn-${size}`, className);
  const inner = <>{loading ? <LoaderCircle size={17} className="spin"/> : Icon ? <Icon size={17}/> : null}{children}</>;
  if (to) return <Link to={to} className={classes} {...props}>{inner}</Link>;
  if (href) return <a href={href} className={classes} {...props}>{inner}</a>;
  return <button className={classes} disabled={loading || disabled} {...props}>{inner}</button>;
}
export function IconButton({ icon: Icon, label, className, ...props }) { return <button className={cx('icon-btn', className)} title={label} aria-label={label} {...props}><Icon size={18}/></button>; }
export function Badge({ children, color = 'green', className }) { return <span className={cx('badge', `badge-${color}`, className)}>{children}</span>; }
export function SubjectIcon({ subject = 'General', size = '', className }) { const style = SUBJECTS[subject] || SUBJECTS.General; const Icon = { leaf: Leaf, atom: Atom, flask: FlaskConical, sigma: Sigma, landmark: Landmark, book: BookOpen }[style.icon]; return <span className={cx('subject-icon', size && `subject-${size}`, className)} style={{ background: style.color, color: style.ink }}><Icon size={size === 'lg' ? 27 : size === 'sm' ? 17 : 22} strokeWidth={1.65}/></span>; }
export function PageHeading({ eyebrow, title, description, children }) { return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="heading-actions">{children}</div>}</div>; }
export function EmptyState({ icon: Icon = Inbox, title, description, action, compact = false }) { return <div className={cx('empty-state', compact && 'compact')}><span className="empty-icon"><Icon size={28} strokeWidth={1.5}/></span><h3>{title}</h3><p>{description}</p>{action}</div>; }
export function Loading({ label = 'Loading your workspace…' }) { return <div className="loading-state" role="status"><LoaderCircle className="spin" size={26}/><span>{label}</span></div>; }
export function ErrorMessage({ children, onRetry }) { if (!children) return null; return <div className="error-message" role="alert"><AlertCircle size={19}/><div>{children}</div>{onRetry && <button onClick={onRetry}>Try again</button>}</div>; }
export function SectionHeading({ title, description, children }) { return <div className="section-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{children}</div>; }
export function Modal({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null); const titleId = useId(); const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => ref.current?.querySelector('input, textarea, select, button')?.focus(), 30);
    function onKey(e) {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const items = [...(ref.current?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex="0"]') || [])];
        const first = items[0], last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(timer); document.removeEventListener('keydown', onKey); document.body.style.overflow = oldOverflow; previous?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cx('modal', wide && 'modal-wide')}><div className="modal-header"><h2 id={titleId}>{title}</h2><IconButton icon={X} label="Close dialog" onClick={onClose}/></div>{children}</section></div>;
}
export function Toasts() { const { toasts } = useApp(); return <div className="toast-stack" aria-live="polite">{toasts.map(t => <div key={t.id} className={cx('toast', `toast-${t.type}`)}>{t.type === 'error' ? <AlertCircle size={18}/> : <Check size={18}/>}<span>{t.message}</span></div>)}</div>; }
export function SearchInput({ value, onChange, placeholder = 'Search…', className }) { return <div className={cx('search-input', className)}><Search size={17}/><input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}/>{value && <IconButton icon={X} label="Clear search" onClick={() => onChange('')}/>}</div>; }
export function ProgressBar({ value, className }) { return <div className={cx('progress-track', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Progress"><div style={{ width: `${Math.min(100, Math.max(0, value))}%` }}/></div>; }
export function DemoLabel({ full = false }) { return <Badge color="amber"><span className="status-dot"/>{full ? 'Demo · sample study material' : 'Sample'}</Badge>; }
export function TextArrow({ children, to, ...props }) { return <Link className="text-arrow" to={to} {...props}>{children}<ArrowRight size={16}/></Link>; }
export function Breadcrumb({ items }) { return <div className="breadcrumb"><Link to="/app">Workspace</Link>{items.map((item, i) => <React.Fragment key={i}><ChevronRight size={13}/>{item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}</React.Fragment>)}</div>; }
