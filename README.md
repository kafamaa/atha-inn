# Atha Inn: website + staff system

- **Public website** (`/`): rooms, prices, photos, contact, WhatsApp, and online booking requests (`/book`) that check which rooms are free.
- **Staff system** (`/staff`, log in at `/login`):
  - **Front desk:** today's board, bookings and calendar, website requests, check-in/out, rooms, quotations and invoices, guest payments.
  - **Owner / manager:** everything, plus income and expenses, settings and staff accounts.
- **Backend:** Supabase (Postgres + login). Security rules in the database decide what each person can see, so front-desk staff can never read your money figures, even with technical tricks.

Everything is free on Supabase's and Vercel's free plans.

---

## 1. Create the database (Supabase)

1. Go to **supabase.com**, then **New project**. Name it `atha-inn` and choose the **Singapore** region (closest to the Maldives). Save the database password somewhere safe.
2. Open **SQL Editor**, then **New query**. Paste everything from `supabase/schema.sql` and press **Run**. You should see "Success".
3. **Authentication → Sign In / Providers → Email:** turn **off** "Allow new users to sign up" (only you create staff accounts). Keep Email login on.
4. **Authentication → Users → Add user → Create new user.** Enter *your* email and a strong password, and tick "Auto confirm". **The first account becomes the owner.**
5. **Project Settings → API.** Copy three values:
   - Project URL
   - `anon` `public` key
   - `service_role` key (secret: never share it or put it in the website code)

## 2. Put the code on GitHub

Create a new **private** repository (e.g. `kafamaa/atha-inn`) and upload all files from this folder. Don't upload `node_modules` or `.env` files.

## 3. Publish on Vercel

1. **vercel.com**, then **Add New → Project**, then import the GitHub repository.
2. Under **Environment Variables**, add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |

3. Press **Deploy**. Your site is now live at `https://atha-inn.vercel.app` (or whatever name Vercel gives it). You can add your own domain later under **Settings → Domains**.

## 4. First login

1. Open `your-site/login` and sign in with the owner account from step 1.4.
2. **Rooms:** use Quick setup, then tap each room to set its name, price, description and photo.
3. **Settings (⚙):** check business details, tax rates, invoice numbers (next invoice is `AT/2026/03`), payment details and pictures.
4. **Settings → Staff accounts:** add each staff member with their email and a password, then give them those details. Choose **Front desk** or **Owner / manager**.

## How bookings from the website work

A guest picks dates and sees only free rooms, then sends a request. It shows up under **Requests**, with a badge on the menu. Tap it and choose **Accept → make booking**, then WhatsApp the guest to confirm. The database itself blocks double-booking a room, even if two staff save at the same moment.

## Bills

- Numbers are given automatically by the database (`AT/2026/03`, `QT/2026/01`…). You can change the prefixes and next numbers in Settings.
- For rooms, fill in **Nights**: "3 rooms × 1 night × MVR 450". Leave Nights empty for other items.
- To print or make a PDF: open a bill, tap **Print / PDF**, then choose "Save as PDF".
- Each bill keeps the tax rates it was made with, so changing rates later never alters old invoices.
- Check current T-GST and Green Tax rates with MIRA before relying on the defaults (T-GST 17%, service 10%, Green Tax USD 6 per guest-night).

## Run on your computer (optional)

```bash
cp .env.example .env.local   # fill in the three values
npm install
npm run dev                  # http://localhost:3000
```

## Files

```
supabase/schema.sql     database tables, security rules, booking + numbering logic
app/page.js             public home page
app/book/page.js        public booking request form
app/login/page.js       staff login
app/staff/…             staff pages (today, bookings, requests, rooms, bills, money, settings)
app/api/staff/route.js  creates / removes staff logins (server only, uses service_role key)
components/Sheets.js    booking, bill, payment, room forms
components/BillPaper.js invoice / quotation layout
lib/util.js             dates, money, tax calculations
```
