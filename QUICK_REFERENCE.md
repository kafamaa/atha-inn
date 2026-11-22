# ATHA INN — Quick Reference Guide

## 🎯 What's New

You now have a complete **staff management system** with photo uploads. Staff members can be added, edited, and displayed on your website.

## ⚡ 3-Step Quick Start

### 1. Database (5 minutes)
```bash
# Go to: https://app.supabase.com
# SQL Editor → Paste supabase/schema.sql → RUN
```

### 2. Vercel Configuration (3 minutes)
```bash
# Vercel Dashboard → atha-inn → Settings → Environment Variables
# Add these two variables:
# NEXT_PUBLIC_SUPABASE_URL=https://bxdodrddvbizmruvebna.supabase.co
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_nPLLo11XemYzQlaVddK_Rg_zNVad9kt
# Redeploy
```

### 3. Test & Add Staff
```bash
# Visit: https://atha-inn.vercel.app
# /login → Sign up → Go to /staff/team
# Click "+ Add staff" → Upload photo → Save
# View home page → See staff section!
```

## 📂 Key Files

| File | Purpose |
|------|---------|
| `app/staff/team/page.js` | Admin staff management |
| `components/Sheets.js` | StaffForm for adding staff |
| `app/page.js` | Home page with staff section |
| `supabase/schema.sql` | Database with staff table |
| `SETUP.md` | Detailed setup guide |
| `DEPLOYMENT_CHECKLIST.md` | Full deployment steps |

## 🚀 URLs

| Page | URL | Access |
|------|-----|--------|
| Home | `/` | Public |
| Staff Login | `/login` | Public |
| Staff Dashboard | `/staff` | Admin only |
| Staff Management | `/staff/team` | Admin only |
| Room Management | `/staff/rooms` | Admin only |
| Bookings | `/staff/bookings` | Admin only |
| Bills | `/staff/bills` | Admin only |

## 📸 Staff Features

**What admins can do:**
- ✓ Upload staff photos
- ✓ Add name, role, bio
- ✓ Set display order
- ✓ Toggle public visibility
- ✓ Edit/delete staff

**What guests see:**
- ✓ Staff photos on home page
- ✓ Names and roles
- ✓ Short bios
- ✓ Only public staff

## 🔧 Commands

```bash
# Local development
npm install
npm run dev
# Visit http://localhost:3000

# Production build
npm run build
npm start

# Check for errors
npm run lint
```

## 🗄️ Database

**New table:** `public.staff`
```sql
id              uuid (primary key)
name            text (required)
role            text (staff role/job)
bio             text (short biography)
photo           text (URL to photo)
sort            integer (display order)
is_public       boolean (visible to guests?)
created_at      timestamp (auto)
```

## 🎨 Styling

Staff section is **responsive**:
- **Desktop**: 3-4 staff per row
- **Tablet**: 2 staff per row  
- **Mobile**: 1 staff per row

Styling uses existing color scheme:
- Turquoise (#0b4f5c)
- Coral (#cf4f28)
- Light background gradients

## 🔒 Permissions

| Feature | Admin | Staff | Guest |
|---------|-------|-------|-------|
| View staff | ✓ | ✓ | ✓ |
| Add staff | ✓ | ✗ | ✗ |
| Edit staff | ✓ | ✗ | ✗ |
| Delete staff | ✓ | ✗ | ✗ |
| Upload photos | ✓ | ✗ | ✗ |

## ❓ Common Issues

**Staff not showing on home page?**
- Check `is_public` is enabled
- Reload browser (clear cache)
- Check Supabase SQL to verify data

**Photos not uploading?**
- File must be JPG/PNG < 10MB
- Check you're logged in as admin
- Verify Supabase storage policy

**Vercel build failing?**
- Check env variables are set
- Verify no TypeScript errors
- Run `npm run build` locally to debug

## 📱 Testing Checklist

- [ ] Home page loads
- [ ] Staff section visible
- [ ] Photos display
- [ ] Admin can add staff
- [ ] Staff can edit profiles
- [ ] Mobile responsive
- [ ] No console errors

## 📚 More Info

- **Full setup guide**: Read `SETUP.md`
- **Deployment steps**: Read `DEPLOYMENT_CHECKLIST.md`
- **Database schema**: Read `supabase/schema.sql`
- **Code**: Check GitHub repo

## 🎉 Success Criteria

✓ Database running in Supabase
✓ Vercel deployed with env variables
✓ Admin account created
✓ At least 1 staff member added
✓ Staff visible on home page
✓ Photos uploading and displaying

## 📞 Support

- **Supabase**: https://supabase.io/docs
- **Next.js**: https://nextjs.org/docs
- **Vercel**: https://vercel.com/docs

---

**Last updated**: 2026-11-22  
**Version**: 1.0.0  
**Status**: ✅ Ready to deploy
