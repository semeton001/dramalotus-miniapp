import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return NextResponse.json(
        { ok: false, error: 'Invalid token' },
        { status: 401 },
      );
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('uid, email')
      .eq('user_id', data.user.id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      user: {
        id: data.user.id,
        email: profile?.email ?? data.user.email,
        uid: profile?.uid ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Auth gagal' },
      { status: 500 },
    );
  }
}
