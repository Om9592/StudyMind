import { supabase } from './supabase';
export async function api(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in again to continue.');
  let response;
  try { response = await fetch(`/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(path === 'generate' ? 125000 : 80000) }); }
  catch (error) { throw new Error(error.name === 'TimeoutError' ? 'This request timed out. Please try again with a shorter lecture.' : 'Cannot reach the server. Check your internet connection and try again.'); }
  let result;
  try { result = await response.json(); } catch { throw new Error('The server returned an unexpected response. Please try again.'); }
  if (!response.ok) { const error = new Error(result.error || 'The request failed. Please try again.'); error.code = result.code; throw error; }
  return result;
}
