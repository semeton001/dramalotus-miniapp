import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';

const resend = new Resend(process.env.RESEND_API_KEY!);

function generateOtp() {
  return String(randomInt(100000, 999999));
}

async function checkOtpRateLimit(email: string) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

  const { data: existing } = await supabaseAdmin
    .from('otp_rate_limits')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (!existing) {
    await supabaseAdmin.from('otp_rate_limits').insert({
      email,
      request_count: 1,
      window_start: now.toISOString(),
    });

    return null;
  }

  if (existing.window_start < cutoff) {
    await supabaseAdmin
      .from('otp_rate_limits')
      .update({
        request_count: 1,
        window_start: now.toISOString(),
      })
      .eq('id', existing.id);

    return null;
  }

  if (existing.request_count >= 3) {
    return 'Terlalu banyak permintaan OTP. Coba lagi 10 menit lagi.';
  }

  await supabaseAdmin
    .from('otp_rate_limits')
    .update({
      request_count: existing.request_count + 1,
    })
    .eq('id', existing.id);

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email = String(body?.email ?? '').trim().toLowerCase();

    const rateLimitError = await checkOtpRateLimit(email);

    if (rateLimitError) {
      return NextResponse.json(
        { ok: false, error: rateLimitError },
        { status: 429 },
      );
    }
    const password = String(body?.password ?? '');

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email dan password wajib diisi' },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: 'Password minimal 6 karakter' },
        { status: 400 },
      );
    }

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();

    const existing = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email,
    );

    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'Email sudah terdaftar' },
        { status: 400 },
      );
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabaseAdmin
      .from('pending_registrations')
      .delete()
      .eq('email', email);

    await supabaseAdmin
      .from('email_verifications')
      .delete()
      .eq('email', email);

    await supabaseAdmin
      .from('pending_registrations')
      .insert({
        email,
        password,
        expires_at: expiresAt,
      });

    await supabaseAdmin
      .from('email_verifications')
      .insert({
        email,
        otp_code: otp,
        expires_at: expiresAt,
      });

    await resend.emails.send({
      from: 'DramaLotus <auth@dramalotus.site>',
      to: email,
      subject: 'Kode Verifikasi DramaLotus',
      html: `
        <div style="font-family:Arial,sans-serif;padding:24px">
          <h2>Verifikasi Email DramaLotus</h2>
          <p>Gunakan kode OTP berikut:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;margin:24px 0;">
            ${otp}
          </div>
          <p>Kode berlaku 10 menit.</p>
        </div>
      `,
    });

    return NextResponse.json({
      ok: true,
      requiresOtp: true,
      message: 'Kode OTP telah dikirim',
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Register gagal' },
      { status: 500 },
    );
  }
}
