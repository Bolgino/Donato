import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// È fondamentale usare la SERVICE_ROLE_KEY per scavalcare le policy di sicurezza (RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    // 1. Inserisce un nuovo record
    const { data: insertData, error: insertError } = await supabase
      .from('keep_alive')
      .insert([{ pinged_at: new Date().toISOString() }])
      .select();

    if (insertError) throw insertError;

    // 2. Cancella il record appena creato
    const { error: deleteError } = await supabase
      .from('keep_alive')
      .delete()
      .eq('id', insertData[0].id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ 
      success: true, 
      message: 'Ping DB completato con operazioni di Read/Write' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Errore Keep-Alive:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
