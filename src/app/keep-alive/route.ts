import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Disabilita la cache per far funzionare sempre il Cron Job
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { data, error } = await supabase.from('donatori').select('id').limit(1);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Supabase è sveglio!', data });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
