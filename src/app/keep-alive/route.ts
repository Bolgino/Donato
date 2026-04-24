import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Assicurati che il path sia corretto per il tuo progetto

export async function GET() {
  try {
    // QUI ERA L'ERRORE: Ora interroga la tabella corretta "candidature"
    const { data, error } = await supabase.from('candidature').select('*').limit(1);

    if (error) throw error;

    return NextResponse.json({ status: 'success', message: 'Database svegliato con successo!' });
  } catch (error) {
    console.error('Errore Keep-Alive:', error);
    // Ho aggiunto il messaggio di errore nella risposta così se fallisce vedi subito il perché!
    return NextResponse.json({ status: 'error', details: error }, { status: 500 });
  }
}
