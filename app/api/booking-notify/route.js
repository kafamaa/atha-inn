import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };
const reply = () => NextResponse.json({ received: true }, { headers: noStore });

// Sends an automatic WhatsApp Business template message only after a successful
// new public booking and only when the provider is configured. No tokens go to the browser.
export async function POST(request) {
  try {
    const body = await request.json();
    const bookingId = String(body.bookingId || '');
    const phone = String(body.phone || '').replace(/\D/g, '').slice(-7);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId) || phone.length !== 7) return reply();

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const from = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const template = process.env.WHATSAPP_STAFF_TEMPLATE;
    const staff = (process.env.WHATSAPP_STAFF_TO || '9609467278').replace(/\D/g, '');
    if (!key || !url || !token || !from || !template || !/^\d{10,15}$/.test(staff)) return reply();

    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: booking, error: fetchError } = await db.from('bookings')
      .select('id, phone, status, created_at').eq('id', bookingId).maybeSingle();

    if (fetchError || !booking || booking.status !== 'request'
      || String(booking.phone || '').replace(/\D/g, '').slice(-7) !== phone
      || Date.now() - new Date(booking.created_at).getTime() > 5 * 60 * 1000) return reply();

    // Unique booking_id prevents repeated requests from spamming staff.
    const { error: logError } = await db.from('booking_alert_log').insert({ booking_id: bookingId, delivery_status: 'attempted' });
    if (logError) return reply();

    // The approved template should contain a generic staff alert; don't expose
    // guest names, numbers, or other private booking details to unnecessary systems.
    const response = await fetch(`https://graph.facebook.com/v22.0/${encodeURIComponent(from)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: staff,
        type: 'template',
        template: { name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US' } },
      }),
      signal: AbortSignal.timeout(9000),
    });
    await db.from('booking_alert_log').update({
      delivery_status: response.ok ? 'submitted' : 'failed',
      sent_at: response.ok ? new Date().toISOString() : null,
    }).eq('booking_id', bookingId);

    if (!response.ok) console.error('WhatsApp Business alert rejected:', response.status);
  } catch (error) {
    console.error('Booking staff alert error:', error?.message || 'Unknown error');
  }
  return reply();
}
