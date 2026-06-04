import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

function generateUid() {
  return randomInt(100000000, 1000000000);
}

async function createUniqueUid() {
  for (let i = 0; i < 10; i++) {
    const uid = generateUid();

    const { data } = await supabaseAdmin
      .from('profiles')
      .select('uid')
      .eq('uid', uid)
      .maybeSingle();

    if (!data) {
      return uid;
    }
  }

  throw new Error('Gagal membuat UID unik');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email = String(body?.email ?? '').trim().toLowerCase();
    const otp = String(body?.otp ?? '').trim();

    if (!email || !otp) {
      return NextResponse.json(
        { ok: false, error: 'Email dan OTP wajib diisi' },
        { status: 400 },
      );
    }

    const { data: otpRow } = await supabaseAdmin
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp)
      .maybeSingle();

    if (!otpRow) {
      return NextResponse.json(
        { ok: false, error: 'OTP tidak valid' },
        { status: 400 },
      );
    }

    if (new Date(otpRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { ok: false, error: 'OTP sudah expired' },
        { status: 400 },
      );
    }

    const { data: pending } = await supabaseAdmin
      .from('pending_registrations')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!pending) {
      return NextResponse.json(
        { ok: false, error: 'Registrasi pending tidak ditemukan' },
        { status: 404 },
      );
    }

    if (new Date(pending.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { ok: false, error: 'Registrasi sudah expired' },
        { status: 400 },
      );
    }

    const createUser = await supabaseAdmin.auth.admin.createUser({
      email,
      password: pending.password,
      email_confirm: true,
    });

    if (createUser.error || !createUser.data.user) {
      return NextResponse.json(
        { ok: false, error: createUser.error?.message || 'Gagal membuat user' },
        { status: 400 },
      );
    }

    const uid = await createUniqueUid();

    await supabaseAdmin.from('profiles').insert({
      user_id: createUser.data.user.id,
      uid,
      email,
    });

    await supabaseAdmin
      .from('pending_registrations')
      .delete()
      .eq('email', email);

    await supabaseAdmin
      .from('email_verifications')
      .delete()
      .eq('email', email);

    return NextResponse.json({
      ok: true,
      message: 'Email berhasil diverifikasi',
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Verifikasi gagal' },
      { status: 500 },
    );
  }
}
