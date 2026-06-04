import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

async function checkLoginRateLimit(email: string) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

  const { data } = await supabaseAdmin
    .from('login_rate_limits')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (!data) return null;

  if (data.window_start < cutoff) {
    await supabaseAdmin
      .from('login_rate_limits')
      .update({
        failed_count: 0,
        window_start: now.toISOString(),
      })
      .eq('id', data.id);

    return null;
  }

  if (data.failed_count >= 5) {
    return 'Terlalu banyak percobaan login. Coba lagi 15 menit lagi.';
  }

  return null;
}

async function incrementLoginFail(email: string) {
  const now = new Date();

  const { data } = await supabaseAdmin
    .from('login_rate_limits')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (!data) {
    await supabaseAdmin.from('login_rate_limits').insert({
      email,
      failed_count: 1,
      window_start: now.toISOString(),
    });
    return;
  }

  await supabaseAdmin
    .from('login_rate_limits')
    .update({
      failed_count: data.failed_count + 1,
    })
    .eq('id', data.id);
}

async function resetLoginFail(email: string) {
  await supabaseAdmin
    .from('login_rate_limits')
    .delete()
    .eq('email', email);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');

    const blocked = await checkLoginRateLimit(email);

    if (blocked) {
      return NextResponse.json(
        { ok: false, error: blocked },
        { status: 429 },
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email dan password wajib diisi' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      await incrementLoginFail(email);

      return NextResponse.json(
        { ok: false, error: 'Email atau password salah.' },
        { status: 401 },
      );
    }

    await resetLoginFail(email);

    return NextResponse.json({
      ok: true,
      user: data.user,
      session: data.session,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Login gagal' },
      { status: 500 },
    );
  }
}
