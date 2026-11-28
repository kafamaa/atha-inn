# ATHA INN — booking progress and staff notifications

## Enable guest booking tracking (required)

In the ATHA INN Supabase project, back up your database and run `supabase/booking-progress-upgrade.sql` in the SQL Editor.

The migration adds:
- `track_booking(uuid, text)`: accepts the full private booking UUID and the booking phone, returns **only** the booking status.
- `booking_alert_log`: private, service-role-only idempotency log so the same new request won't send repeated staff WhatsApp alerts.

Public guests are not given access to read the `bookings` table. Existing permissions remain intact.

**Test:** Submit a booking request on `/book`; open `/track`, enter the full reference and original phone, then confirm the visible status is “Request received.” Once staff confirms the booking, the status changes to “Reservation confirmed.” The tracker refreshes every 30 seconds while open.

## Staff alerts within the dashboard (works without Meta API)

Staff signed in to ATHA INN see a new request notification while their dashboard is open and visible. It polls Supabase every 25 seconds. These alerts do not deliver messages to WhatsApp or when the dashboard is closed.

## Automatic WhatsApp Business staff alerts (optional, requires provider setup)

The API route `/api/booking-notify` is implemented, but intentionally returns without sending if provider credentials are missing. It **does not** send WhatsApp messages automatically until the following Vercel Production environment variables are configured:

- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role key; server-only, never `NEXT_PUBLIC_`.
- `WHATSAPP_ACCESS_TOKEN`: Meta WhatsApp Business Cloud API permanent/token with relevant permission.
- `WHATSAPP_PHONE_NUMBER_ID`: sender's registered WhatsApp Business phone-number ID.
- `WHATSAPP_STAFF_TEMPLATE`: name of the **approved** generic template that has no parameters, for example: “New booking request received at ATHA INN. Open the staff dashboard to review it.”
- `WHATSAPP_TEMPLATE_LANGUAGE`: optionally `en_US` (the default).
- `WHATSAPP_STAFF_TO`: optionally `9609467278` (defaults to this number).

Set secrets directly in the Vercel project dashboard; don't paste them in chat or commit them to Git. The sender phone number and staff recipient must be configured and eligible to message through Meta's WhatsApp Business platform. Business-initiated templates, consent and charges are governed by Meta. An ordinary personal WhatsApp number cannot be used as a Cloud API sender without the required onboarding.

After setting variables, redeploy and submit a *new test booking*, then check the `booking_alert_log` status and Meta delivery results. `submitted` means Meta accepted the request, **not** that WhatsApp delivered it. Do not include guest personal details in the generic template.

Notifications are best-effort and must never determine whether a booking succeeds.

## Guest messaging

Guests can tap “Also message us on WhatsApp” after making a booking, using ATHA INN's only official number: **+960 9467278**. This opens WhatsApp with a prefilled message, but the guest must press Send.
