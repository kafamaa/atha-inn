# ATHA INN — Guest House Management System

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the project root with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://bxdodrddvbizmruvebna.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_nPLLo11XemYzQlaVddK_Rg_zNVad9kt
```

### 2. Database Setup

1. Go to [Supabase Console](https://app.supabase.com)
2. Open your project → SQL Editor
3. Copy and paste the entire contents of `supabase/schema.sql`
4. Run the query to create all tables and security policies

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 5. Create First Account

1. Visit `/login`
2. Sign up with your email
3. The first account automatically becomes the owner/admin
4. Add additional staff members from Settings → Staff

## Features

### 🏠 Public Website (`/`)
- Home page with rooms showcase
- **NEW**: Staff directory showing team members with photos
- Room availability checker
- Booking request form
- Contact information

### 👥 Staff Dashboard (`/staff`)
- **NEW**: Staff Management page (`/staff/team`)
  - Add/edit staff members
  - Upload professional photos
  - Add bio and role
  - Control public visibility
  - Delete staff members

- Room board with occupancy status
- Booking management
- Website booking requests
- Quotations & invoices
- Payment tracking
- Financial reports (admin only)
- Settings (admin only)

### 📸 Staff Features (Admin)
- Upload staff photos (auto-resized to 800px width)
- Add staff bio and role
- Order staff on website
- Toggle public visibility
- Manage staff directory

## File Structure

```
/app
  /staff
    /team          ← New: Staff management page
    /rooms         ← Room management
    /bookings      ← Booking management
    /bills         ← Invoices & quotes
    /money         ← Financial reports (admin)
    /settings      ← Settings (admin)
  /api
  /book            ← Public booking form
  /login           ← Staff login
  page.js          ← Public home (updated with staff section)

/components
  Sheets.js        ← Updated with StaffForm
  StaffProvider.js ← Updated to load staff data

/supabase
  schema.sql       ← Updated with staff table

/lib
  staffContext.js
  supabase.js
  util.js
```

## Database Schema - New Staff Table

```sql
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'Staff',
  bio text default '',
  photo text default '',
  sort int not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
```

Public view for guests:
```sql
create or replace view public.public_staff as
  select id, name, role, bio, photo, sort from public.staff 
  where is_public order by sort, name;
```

## Deployment to Vercel

### Method 1: Automatic Deployment
1. Push to GitHub: `git push origin main`
2. Vercel automatically deploys from GitHub

### Method 2: Manual Deployment
```bash
npm install -g vercel
vercel --prod
```

### Environment Variables in Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Settings → Environment Variables
4. Add these variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. Redeploy

## Photo Upload Storage

Photos are stored in Supabase Storage:
- **Path**: `media/staff/` and `media/rooms/`
- **Bucket**: `media` (public bucket)
- **Resize**: Staff photos auto-resized to 800px width
- **Format**: JPEG

## Usage Guide

### Adding Staff Members (Admin)
1. Go to `/staff/team`
2. Click "+ Add staff"
3. Fill in: Name, Role, Bio, Order, Visibility
4. Click "Add photo" to upload
5. Click "Save staff member"

### Displaying Staff on Home Page
- Only staff members with `is_public = true` appear
- Sorted by `sort` field (ascending)
- Shows: photo, name, role, bio
- Responsive grid layout

## Troubleshooting

### Staff not appearing on home page
- Check `is_public` field is `true`
- Ensure photo URL is correct
- Revalidate cache (60 second cache on home page)

### Photos not uploading
- Verify Supabase storage policy allows authenticated staff
- Check file size < 10MB
- Ensure JPEG/PNG format

### Database errors
- Run schema.sql again in Supabase SQL Editor
- Check row-level security policies are enabled

## Next Steps

1. ✅ Set up Supabase and run schema.sql
2. ✅ Create first admin account
3. ✅ Add your property details in Settings
4. ✅ Add rooms with photos
5. ✅ Add staff members with photos
6. ✅ Deploy to Vercel
7. Test the full booking workflow

## Support

For Supabase issues: https://supabase.io/docs
For Next.js issues: https://nextjs.org/docs
For Vercel deployment: https://vercel.com/docs

