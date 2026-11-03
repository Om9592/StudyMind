import React, { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowRight, Sparkles, BookOpen, Timer, CircleHelp, MessagesSquare, Bookmark, Settings, Search, ChevronDown, ChevronRight, Sun, Moon, Menu, X, ArrowUpRight, LogOut, Flame, Command, FolderOpen, Check, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Logo, IconButton, Badge, Modal, Button, SearchInput, SubjectIcon, EmptyState, Loading, ErrorMessage } from './UI';
import { getStreak, cx } from '../lib/utils';
const nav = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/generate', label: 'Generate Notes', icon: Sparkles },
  { to: '/app/notes', label: 'My Notes', icon: BookOpen },
  { to: '/app/revision', label: 'Revision Center', icon: Timer, badge: '10 min' },
  { to: '/app/practice', label: 'Practice MCQs', icon: CircleHelp },
  { to: '/app/assistant', label: 'AI Study Assistant', icon: MessagesSquare },
  { to: '/app/saved', label: 'Saved Lectures', icon: Bookmark }
];
export default function Layout() {
  const app = useApp(); const location = useLocation(); const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false); const [searchOpen, setSearchOpen] = useState(false); const [query, setQuery] = useState(''); const [accountOpen, setAccountOpen] = useState(false); const [upgradeOpen, setUpgradeOpen] = useState(false);
  const current = nav.find(n => n.to === location.pathname) || (location.pathname.startsWith('/app/notes/') ? { label: 'My Notes' } : { label: 'Settings' });
  useEffect(() => { setMobileOpen(false); setAccountOpen(false); window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => { const onKey = e => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(v => !v); } if (e.key === 'Escape') { setMobileOpen(false); setAccountOpen(false); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);
  const results = app.notes.filter(n => `${n.title} ${n.subject} ${n.summary}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
  const initials = (app.profile.name || 'Student').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const logout = async () => { try { await app.signOut(); navigate('/'); } catch (e) { app.notify(e.message, 'error'); } };
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    {mobileOpen && <div className="sidebar-scrim" onClick={() => setMobileOpen(false)}/>}
    <aside className={cx('sidebar', mobileOpen && 'sidebar-open')} aria-label="Main navigation">
      <div className="sidebar-brand"><Logo/><IconButton icon={X} label="Close navigation" className="mobile-close" onClick={() => setMobileOpen(false)}/></div>
      <button className="workspace-switch" onClick={() => { setQuery(''); setSearchOpen(true); }}><span className="workspace-avatar">S</span><span>My workspace<small>{app.demo ? 'Demo workspace' : 'Personal workspace'}</small></span><ChevronDown size={15}/></button>
      <div className="nav-label">WORKSPACE</div>
      <nav className="sidebar-nav" aria-label="Workspace navigation">{nav.map((n, i) => <React.Fragment key={n.to}>{i === 3 && <div className="nav-label study-label">STUDY TOOLS</div>}<NavLink to={n.to} end={n.end} className={({ isActive }) => cx('nav-item', isActive && 'active')}><n.icon size={19} strokeWidth={1.65}/><span>{n.label}</span>{n.badge && <small>{n.badge}</small>}{n.to === '/app/notes' && app.notes.length > 0 && <small className="nav-count">{app.notes.length}</small>}</NavLink></React.Fragment>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-plan"><span className="plan-spark"><Sparkles size={18}/></span><h4>A little smarter, every day.</h4><p>Your next breakthrough starts with one lecture.</p><button onClick={() => setUpgradeOpen(true)}>Explore your plan <ArrowUpRight size={15}/></button></div><NavLink to="/app/settings" className={({ isActive }) => cx('nav-item', isActive && 'active')}><Settings size={19} strokeWidth={1.65}/><span>Settings</span></NavLink><Link to="/help" className="nav-item"><CircleHelp size={19} strokeWidth={1.65}/><span>Help & getting started</span><ArrowUpRight size={14}/></Link><div className="sidebar-foot"><span className="status-dot"/>Made for curious minds <span>↗</span></div></div>
    </aside>
    <div className="workspace-main">
      <header className="app-topbar"><div className="topbar-left"><IconButton icon={Menu} label="Open navigation" className="mobile-menu" onClick={() => setMobileOpen(true)}/><span className="topbar-workspace">My workspace</span><ChevronRight size={14}/><span>{current.label}</span></div><div className="topbar-actions"><button className="global-search" onClick={() => { setQuery(''); setSearchOpen(true); }}><Search size={16}/><span>Search anything…</span><kbd>⌘ K</kbd></button><IconButton icon={app.theme === 'light' ? Moon : Sun} label={`Switch to ${app.theme === 'light' ? 'dark' : 'light'} mode`} onClick={() => app.setTheme(app.theme === 'light' ? 'dark' : 'light')}/><span className="topbar-divider"/><div className="account-wrap"><button className="avatar avatar-button" onClick={() => setAccountOpen(v => !v)} aria-label="Open account menu" aria-expanded={accountOpen}>{initials}</button>{accountOpen && <><div className="dropdown-dismiss" onClick={() => setAccountOpen(false)}/><div className="account-dropdown"><strong>{app.profile.name}</strong><small>{app.demo ? 'Local demo · no real account' : app.user?.email}</small><Link to="/app/settings"><Settings size={16}/> Profile & settings</Link><button onClick={logout}><LogOut size={16}/> {app.demo ? 'Exit demo' : 'Sign out'}</button></div></>}</div></div></header>
      {app.demo && <div className="demo-strip"><span><span className="status-dot"/><strong>You're in demo mode.</strong> Explore with sample notes. No videos are analyzed.</span><Link to="/settings-integration">Connect live AI <ArrowUpRight size={13}/></Link></div>}
      <main id="main-content" className="page-content">{app.dataError ? <ErrorMessage onRetry={app.refresh}>{app.dataError}</ErrorMessage> : app.dataLoading ? <Loading/> : <Outlet/>}</main>
      <footer className="workspace-footer"><span>Less busywork. More lightbulb moments.</span><span>StudyMind AI <span className="footer-dot">·</span> <Link to="/privacy">Privacy</Link></span></footer>
    </div>
    <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Find your next lightbulb moment"><SearchInput value={query} onChange={setQuery} placeholder="Search notes, topics, or subjects…"/><div className="command-results">{!query && <div className="command-label">QUICK ACTIONS</div>}{!query && <button className="command-item" onClick={() => { setSearchOpen(false); navigate('/app/generate'); }}><Sparkles size={18}/><span>Generate new notes</span><kbd>↵</kbd></button>}<div className="command-label">{query ? 'MATCHING NOTES' : 'RECENT NOTES'}</div>{results.map(n => <button key={n.id} className="command-item" onClick={() => { setSearchOpen(false); navigate(`/app/notes/${n.id}`); }}><SubjectIcon subject={n.subject} size="sm"/><span>{n.title}<small>{n.subject} · {n.language}</small></span><ChevronRight size={16}/></button>)}{results.length === 0 && <EmptyState compact icon={Search} title="No matching notes" description="Try a subject, a concept, or a different keyword."/>}</div><div className="command-footer"><kbd>esc</kbd> to close <span><Command size={12}/> K to open</span></div></Modal>
    <Modal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} title="Your learning, without limits"><div className="plan-modal-icon"><Sparkles size={30}/></div><h3 className="modal-feature-title">{app.demo ? 'Explore the complete study toolkit.' : 'Your student plan is free.'}</h3><p className="muted">{app.demo ? 'This demo includes the full workflow with sample material. Connect Supabase and an AI provider to generate notes from real captions.' : 'No charges or paid tiers. Fair use includes 10 live lecture generations, 200 AI assistant messages and 30 custom quizzes each calendar month. Other study tools stay available.'}</p><div className="plan-checks">{['Structured notes in 3 languages', 'Practice quizzes & smart revision', 'Your own private notes library'].map(x => <div key={x}><Check size={17}/>{x}</div>)}</div><Button to={app.demo ? '/settings-integration' : '/app/generate'} onClick={() => setUpgradeOpen(false)} icon={ArrowRight}>{app.demo ? 'Set up live generation' : 'Create your next study set'}</Button></Modal>
  </div>;
}
