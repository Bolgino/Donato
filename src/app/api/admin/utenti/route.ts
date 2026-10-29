// Gestione degli admin (utenti di Supabase Auth): elenco, invito via email, rimozione.
// Usa la SUPABASE_SERVICE_ROLE_KEY, che resta solo sul server (Vercel) e non arriva mai al browser.
// Ogni richiesta deve arrivare da un admin già collegato: il browser manda il suo token.
import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function clientServer(url: string, chiave: string) {
  return createClient(url, chiave, { auth: { autoRefreshToken: false, persistSession: false } });
}
type Verifica = { ok: true; sb: ReturnType<typeof clientServer>; utente: User } | { ok: false; risposta: NextResponse };

function errore(messaggio: string, status: number) {
  return NextResponse.json({ error: messaggio }, { status });
}

async function verifica(req: Request): Promise<Verifica> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chiave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chiave) return { ok: false, risposta: errore("Su Vercel manca la variabile SUPABASE_SERVICE_ROLE_KEY.", 500) };
  const sb = clientServer(url, chiave);
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, risposta: errore("Accesso non autorizzato.", 401) };
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { ok: false, risposta: errore("Accesso non autorizzato: rientra nell'area riservata.", 401) };
  return { ok: true, sb, utente: data.user };
}

/** Traduce gli errori di Supabase in istruzioni comprensibili */
function spiega(messaggio: string): { testo: string; status: number } {
  const m = messaggio.toLowerCase();
  if (m.includes("already been registered") || m.includes("already registered") || m.includes("already exists"))
    return { testo: "Questa email ha già un account: può usare «Password dimenticata?» nella pagina di accesso.", status: 409 };
  if (m.includes("not authorized"))
    return {
      testo: "Supabase non può mandare email a questo indirizzo: il servizio email gratuito scrive solo ai membri del team Supabase. Collega una casella email (SMTP) come spiegato nella Guida.",
      status: 400,
    };
  if (m.includes("rate limit") || m.includes("too many"))
    return { testo: "Troppe email in poco tempo: Supabase ha bloccato l'invio. Riprova più tardi (o collega una casella email SMTP, vedi Guida).", status: 429 };
  return { testo: messaggio, status: 500 };
}

export async function GET(req: Request) {
  const v = await verifica(req);
  if (!v.ok) return v.risposta;
  const { data, error } = await v.sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return errore(spiega(error.message).testo, 500);
  const utenti = data.users
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      invitato: u.invited_at ?? null,
      creato: u.created_at,
      ultimoAccesso: u.last_sign_in_at ?? null,
      io: u.id === v.utente.id,
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
  return NextResponse.json({ utenti });
}

export async function POST(req: Request) {
  const v = await verifica(req);
  if (!v.ok) return v.risposta;
  const corpo = (await req.json().catch(() => ({}))) as { email?: string };
  const email = (corpo.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errore("Scrivi un indirizzo email valido.", 400);
  // Il link della mail riporta sullo stesso sito da cui è partito l'invito
  const origine = req.headers.get("origin") || new URL(req.url).origin;
  const { error } = await v.sb.auth.admin.inviteUserByEmail(email, { redirectTo: `${origine}/admin/imposta-password` });
  if (error) {
    const e = spiega(error.message);
    return errore(e.testo, e.status);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const v = await verifica(req);
  if (!v.ok) return v.risposta;
  const corpo = (await req.json().catch(() => ({}))) as { id?: string };
  if (!corpo.id) return errore("Manca l'utente da togliere.", 400);
  if (corpo.id === v.utente.id) return errore("Non puoi togliere l'accesso a te stesso.", 400);
  const { error } = await v.sb.auth.admin.deleteUser(corpo.id);
  if (error) return errore(spiega(error.message).testo, 500);
  return NextResponse.json({ ok: true });
}
