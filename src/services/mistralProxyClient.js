import { supabase } from '../lib/supabaseClient';

const PROXY_URL = process.env.REACT_APP_SUPABASE_URL + '/functions/v1/mistral-proxy';

async function callProxy(target, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Utilisateur non connecté');
  }

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ target, body }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur proxy Mistral: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export function callMistralOCR(body) {
  return callProxy('ocr', body);
}

export function callMistralChat(body) {
  return callProxy('chat', body);
}
