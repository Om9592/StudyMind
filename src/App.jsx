import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Toasts, Loading, Logo, Button } from './components/UI';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Generate from './pages/Generate';
import Notes from './pages/Notes';
import NoteDetail from './pages/NoteDetail';
import Revision from './pages/Revision';
import Practice from './pages/Practice';
import Assistant from './pages/Assistant';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import { ResourcePage, Guides, GuideArticle, HelpPage, ContactPage, LegalPage, IntegrationPage, NotFound, useSEO } from './pages/PublicPages';
import { RESOURCES } from './data/resources';
class ErrorBoundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  componentDidCatch(error) { console.error('Application render error:', error); }
  render() { if (this.state.error) return <div className="fatal-error"><Logo/><h1>Let’s turn the page and try again.</h1><p>Your saved notes are safe. Reload the workspace to recover.</p><Button onClick={() => window.location.assign('/app')}>Reload workspace</Button></div>; return this.props.children; }
}
function Protected() { const { user, authLoading } = useApp(); const location = useLocation(); if (authLoading) return <div className="auth-loading"><Logo/><Loading label="Opening your study workspace…"/></div>; return user ? <Outlet/> : <Navigate to="/login" replace state={{ from: location.pathname }}/>; }
function RouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => { if (hash) { const id = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 100); return () => clearTimeout(id); } window.scrollTo(0, 0); }, [pathname, hash]);
  useEffect(() => { let robots = document.querySelector('meta[name="robots"]'); if (pathname.startsWith('/app') || ['/login','/register','/reset-password','/update-password'].includes(pathname)) robots.content = 'noindex, nofollow'; else robots.content = 'index, follow, max-image-preview:large'; if (pathname.startsWith('/app')) document.title = 'My study workspace | StudyMind AI'; }, [pathname]);
  return null;
}
function Home() { useSEO('StudyMind AI — Turn YouTube Lectures Into Perfect Study Notes', 'Turn YouTube lectures into structured study notes, practice MCQs and 10-minute revision sheets. Learn in English, Hindi or Hinglish with StudyMind AI.', { '@context': 'https://schema.org', '@graph': [ { '@type': 'Organization', name: 'StudyMind AI', url: import.meta.env.VITE_SITE_URL || (typeof window === 'undefined' ? 'https://studymind.example.vercel.app' : window.location.origin), logo: `${import.meta.env.VITE_SITE_URL || (typeof window === 'undefined' ? 'https://studymind.example.vercel.app' : window.location.origin)}/favicon.svg` }, { '@type': 'WebSite', name: 'StudyMind AI', url: import.meta.env.VITE_SITE_URL || (typeof window === 'undefined' ? 'https://studymind.example.vercel.app' : window.location.origin), inLanguage: ['en', 'hi'] }, { '@type': 'SoftwareApplication', name: 'StudyMind AI', applicationCategory: 'EducationalApplication', operatingSystem: 'Web', description: 'Caption-grounded lecture notes, MCQ practice, active-recall revision and a lecture-aware study assistant.', featureList: ['YouTube lecture notes', 'Hindi and Hinglish notes', 'Practice MCQs', '10-minute revision', 'PDF export'] }, { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How does StudyMind turn a video into study notes?', acceptedAnswer: { '@type': 'Answer', text: 'StudyMind retrieves accessible YouTube captions and uses an AI provider to create structured notes, definitions, practice questions and revision material. If captions are unavailable, it reports an error rather than inventing content.' } }, { '@type': 'Question', name: 'Can I get notes in Hindi or Hinglish?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Choose English, Hindi or Hinglish before live generation. Technical terms and formulas are preserved.' } }] } ] }); return <Landing/>; }
export default function App({ Router = BrowserRouter, routerProps = {} }) {
  return <ErrorBoundary><Router {...routerProps}><AppProvider><RouteEffects/><Routes><Route path="/" element={<Home/>}/><Route path="/login" element={<Auth mode="login"/>}/><Route path="/register" element={<Auth mode="register"/>}/><Route path="/reset-password" element={<Auth mode="reset"/>}/><Route path="/update-password" element={<Auth mode="update-password"/>}/><Route path="/guides" element={<Guides/>}/><Route path="/guides/:slug" element={<GuideArticle/>}/>{Object.keys(RESOURCES).map(slug => <Route key={slug} path={`/${slug}`} element={<ResourcePage slug={slug}/>}/>)}<Route path="/help" element={<HelpPage/>}/><Route path="/contact" element={<ContactPage/>}/><Route path="/privacy" element={<LegalPage type="privacy"/>}/><Route path="/terms" element={<LegalPage type="terms"/>}/><Route path="/settings-integration" element={<IntegrationPage/>}/><Route element={<Protected/>}><Route path="/app" element={<Layout/>}><Route index element={<Dashboard/>}/><Route path="generate" element={<Generate/>}/><Route path="notes" element={<Notes/>}/><Route path="notes/:id" element={<NoteDetail/>}/><Route path="revision" element={<Revision/>}/><Route path="practice" element={<Practice/>}/><Route path="assistant" element={<Assistant/>}/><Route path="saved" element={<Notes saved/>}/><Route path="settings" element={<Settings/>}/></Route></Route><Route path="*" element={<NotFound/>}/></Routes><Toasts/></AppProvider></Router></ErrorBoundary>;
}
