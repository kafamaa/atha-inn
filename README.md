# Atha Inn: website + admin system

- **Public website** (`/`): logo and welcome, rooms with photos, prices and facilities, guesthouse and kitchen information, photo and video gallery, WhatsApp, contact and location, and a booking request form (`/book`) that shows free rooms.
- **Admin system** (`/staff`, log in at `/login`). Every admin account (owner, reception, staff) has the same access. Six menu items:
  1. **Dashboard:** rooms tonight, new requests, arrivals and departures, unpaid invoices, this month's balance.
  2. **Reservations:** website requests, manual bookings for one or many rooms, calendar, room availability. Workflow: New request → Confirmed → Checked in → Checked out. Double bookings are blocked by the database.
  3. **Billing & Payments:** quotations, invoices and payment receipts with automatic numbers. Rooms × nights × price, extra charges, discounts, taxes, deposits, remaining balance, Paid / Partially paid / Unpaid, print or save as PDF, and WhatsApp.
  4. **Website & Gallery:** upload or remove photos and videos, publish or hide them, change the homepage cover, and edit rooms, prices, facilities and texts.
  5. **Finance & Reports:** income and expenses by category (guest payments are included automatically), daily and monthly summaries, occupancy, unpaid balances, and CSV and PDF reports.
  6. **Settings:** tax, document numbers, payment details, signature, admin accounts.
- **Backend:** Supabase (Postgres, logins and file storage). Guests who aren't logged in can only see the public website.

Everything is free on Supabase's and Vercel's free plans.

---

## 1. Create the database (Supabase)

1. Go to **supabase.com**, then **New project**. Name it `atha-inn` and choose the **Singapore** region (closest to the Maldives). Save the database password somewhere safe.
2. Open **SQL Editor**, then **New query**. Paste everything from `supabase/schema.sql` and press **Run**. You should see "Success".
3. **Authentication → Sign In / Providers → Email:** turn **off** "Allow new users to sign up" (only admins create accounts). Keep Email login on.
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
2. **Website & Gallery → Rooms:** use Quick setup, then edit each room's price, facilities, description and photo. Upload photos and videos under **Gallery**.
3. **Settings:** check tax rates, document numbers (next invoice `AT/2026/03`, receipts start at `RC/2026/001`) and payment details.
4. **Settings → Admin accounts:** add reception and staff with their email and a password, then give them those details.

## Updating from the earlier version

If you already ran the old `schema.sql`, simply run the new one again in the SQL Editor. It upgrades the database in place and moves any old website requests into Reservations. Then replace all the code files in GitHub; Vercel redeploys by itself.

## How reservations work

A guest picks dates and a number of rooms on the website and sends a request. It appears under **Reservations → Requests**, with a badge on the menu. Open it and tap **Confirm & assign rooms**: free rooms are suggested, and you tick the ones to give. After that, use **Check in** and **Check out**. Checking out marks the rooms "Needs cleaning". One reservation can hold several rooms, for example 5 rooms × 11 nights.

## Bills, payments and receipts

- **Record payment** on a reservation or invoice, and choose **Deposit**, **Part payment**, **Full payment** or **Balance payment**. A numbered receipt (`RC/2026/001`) is made automatically and shows the remaining balance.

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
app/login/page.js       admin login
app/staff/…             admin pages (dashboard, reservations, billing, website, finance, settings)
app/api/staff/route.js  creates / removes admin logins (server only, uses service_role key)
components/Sheets.js    booking, bill, payment, room forms
components/BillPaper.js invoice / quotation / receipt layout
components/Gallery.js   public gallery with photo/video viewer
lib/report.js           daily & monthly finance figures
lib/util.js             dates, money, tax calculations
```
