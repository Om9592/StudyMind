import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, hasSupabase } from '../lib/supabase';
import { initialDemo, loadRemote, persistRecord, removeRecord, writeLocal, readLocal } from '../lib/store';
import { DEMO_PROFILE } from '../data/demo';
import { uid } from '../lib/utils';
const AppContext = createContext(null);
const EMPTY = { notes: [], folders: [], attempts: [], activities: [], chats: [], profile: { name: 'Student', email: '', exam: 'Other', dailyGoal: 30 } };
export function AppProvider({ children }) {
  const [demo, setDemo] = useState(!hasSupabase);
  const [demoEntered, setDemoEntered] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(hasSupabase);
  const [data, setData] = useState(EMPTY);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [theme, setTheme] = useState('light');
  const [toasts, setToasts] = useState([]);
  const [liveAI, setLiveAI] = useState(false);
  const dataRef = useRef(data); dataRef.current = data;
  const demoRef = useRef(demo); demoRef.current = demo;
  const userId = session?.user?.id;
  const user = demo && demoEntered ? { id: 'demo-user', email: data.profile.email } : session?.user;
  const notify = useCallback((message, type = 'success') => { const id = uid(); setToasts(t => [...t.slice(-3), { id, message, type }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000); }, []);
  useEffect(() => { const saved = localStorage.getItem('studymind-theme') || 'light'; if (saved !== theme) setTheme(saved); document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('studymind-theme', theme); }, [theme]);
  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(r => setLiveAI(Boolean(r.liveAI))).catch(() => setLiveAI(false));
    if (!supabase) { if (readLocal('entered', false)) { setDemoEntered(true); setData(initialDemo()); } return; }
    let active = true;
    supabase.auth.getSession().then(({ data: { session }, error }) => { if (!active) return; if (error) notify(error.message, 'error'); setSession(session); setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setDemo(false); setAuthLoading(false); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [notify]);
  const refresh = useCallback(async () => {
    if (!userId || demoRef.current) return;
    setDataLoading(true); setDataError('');
    try { const next = await loadRemote(userId); setData(next); } catch (error) { setDataError(error.message); } finally { setDataLoading(false); }
  }, [userId]);
  useEffect(() => { if (userId && !demo) refresh(); }, [userId, demo, refresh]);
  const enterDemo = () => { if (hasSupabase) { notify('This deployment uses secure account sign-in.', 'info'); return; } writeLocal('entered', true); setDemoEntered(true); setDemo(true); setData(initialDemo()); };
  const signIn = async (email, password) => { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; };
  const signUp = async (name, email, password) => { const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: `${window.location.origin}/login` } }); if (error) throw error; return data; };
  const signOut = async () => { if (!demo) { const { error } = await supabase.auth.signOut(); if (error) throw error; } setSession(null); setData(EMPTY); if (!hasSupabase) { setDemo(false); setDemoEntered(false); writeLocal('entered', false); } };
  const saveCollection = async (kind, next, item, previous = null) => {
    const old = dataRef.current;
    setData(d => ({ ...d, [kind]: next })); dataRef.current = { ...old, [kind]: next };
    try { await persistRecord(kind, item, userId, demoRef.current, previous); }
    catch (error) { setData(old); dataRef.current = old; notify(`Could not save: ${error.message}`, 'error'); throw error; }
  };
  const saveNote = async (note, isNew = true) => {
    const old = dataRef.current.notes; const exists = old.some(n => n.id === note.id);
    const next = exists ? old.map(n => n.id === note.id ? note : n) : [note, ...old];
    await saveCollection('notes', next, note, exists ? old.find(n => n.id === note.id) : null);
    if (isNew && !exists) notify('Study set saved to your library.');
  };
  const updateNote = async (id, patch) => { const note = dataRef.current.notes.find(n => n.id === id); if (!note) return; await saveNote({ ...note, ...patch, updatedAt: new Date().toISOString() }, false); };
  const deleteNote = async id => { const next = dataRef.current.notes.filter(n => n.id !== id); await removeRecord('notes', id, userId, demoRef.current, next); setData(d => ({ ...d, notes: next, chats: d.chats.filter(c => c.noteId !== id) })); notify('Notes deleted.'); };
  const addFolder = async (name, color = '#6c9669') => { const folder = { id: uid(), name: name.trim(), color }; if (!folder.name || folder.name.length > 60) throw new Error('Use a folder name between 1 and 60 characters.'); if (dataRef.current.folders.some(f => f.name.toLowerCase() === folder.name.toLowerCase())) throw new Error('A folder with this name already exists.'); await saveCollection('folders', [...dataRef.current.folders, folder], folder); notify('Folder created.'); return folder; };
  const deleteFolder = async id => {
    const remaining = dataRef.current.folders.filter(f => f.id !== id);
    await removeRecord('folders', id, userId, demoRef.current, remaining);
    for (const note of dataRef.current.notes.filter(n => n.folderId === id)) await updateNote(note.id, { folderId: null });
    setData(d => ({ ...d, folders: remaining })); notify('Folder removed. Your notes are still in My Notes.');
  };
  const addAttempt = async attempt => { await saveCollection('attempts', [attempt, ...dataRef.current.attempts], attempt); };
  const addActivity = async (kind, minutes) => { const activity = { id: uid(), kind, minutes, createdAt: new Date().toISOString() }; try { await saveCollection('activities', [activity, ...dataRef.current.activities], activity); } catch {} };
  const addChats = async (messages, alreadyPersisted = false) => {
    if (alreadyPersisted) {
      const next = [...dataRef.current.chats, ...messages];
      dataRef.current = { ...dataRef.current, chats: next };
      setData(d => ({ ...d, chats: next }));
      return;
    }
    for (const message of messages) await saveCollection('chats', [...dataRef.current.chats, message], message);
  };
  const clearChat = async noteId => {
    if (demo) { const next = dataRef.current.chats.filter(m => m.noteId !== noteId); writeLocal('chats', next); setData(d => ({ ...d, chats: next })); }
    else { const { error } = await supabase.from('chat_messages').delete().eq('note_id', noteId).eq('user_id', userId); if (error) { notify(error.message, 'error'); return; } setData(d => ({ ...d, chats: d.chats.filter(m => m.noteId !== noteId) })); }
    notify('Conversation cleared.');
  };
  const updateProfile = async patch => {
    const next = { ...dataRef.current.profile, ...patch };
    if (demo) { writeLocal('profile', next); setData(d => ({ ...d, profile: next })); }
    else { const { error } = await supabase.from('profiles').update({ name: next.name, exam: next.exam, daily_goal: Number(next.dailyGoal), updated_at: new Date().toISOString() }).eq('id', userId); if (error) throw new Error(error.message); setData(d => ({ ...d, profile: next })); await supabase.auth.updateUser({ data: { name: next.name } }); }
    notify('Profile updated.');
  };
  return <AppContext.Provider value={{ ...data, demo, user, session, authLoading, dataLoading, dataError, refresh, theme, setTheme, toasts, notify, liveAI, enterDemo, signIn, signUp, signOut, saveNote, updateNote, deleteNote, addFolder, deleteFolder, addAttempt, addActivity, addChats, clearChat, updateProfile }}>{children}</AppContext.Provider>;
}
export const useApp = () => useContext(AppContext) || { ...EMPTY, toasts: [], demo: !hasSupabase, user: null, liveAI: false };
