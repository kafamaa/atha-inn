# 🚀 Deployment Checklist for ATHA INN

## ✅ What's Complete

- [x] Staff management system built and tested
- [x] Photo upload functionality working
- [x] Staff directory on home page ready
- [x] Database schema created
- [x] Code committed to GitHub
- [x] Build verified (npm run build passes)
- [x] Vercel configuration added

## 📋 Next Steps (In Order)

### 1. **Set Up Supabase Database** (5 min)
   ```
   [ ] Go to https://app.supabase.com
   [ ] Open your project
   [ ] Go to SQL Editor
   [ ] Copy ALL content from: supabase/schema.sql
   [ ] Paste into SQL Editor and RUN
   [ ] Wait for confirmation (all tables created)
   [ ] Check tables exist in Database tab
   ```

### 2. **Set Environment Variables in Vercel** (3 min)
   ```
   [ ] Go to https://vercel.com/dashboard
   [ ] Click on atha-inn project
   [ ] Go to Settings → Environment Variables
   [ ] Add: NEXT_PUBLIC_SUPABASE_URL
       Value: https://bxdodrddvbizmruvebna.supabase.co
   [ ] Add: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
       Value: sb_publishable_nPLLo11XemYzQlaVddK_Rg_zNVad9kt
   [ ] Click "Save"
   [ ] Go to Deployments
   [ ] Click "Redeploy" on latest deployment
   [ ] Wait for build to complete
   ```

### 3. **Test the Application** (10 min)
   ```
   [ ] Visit https://atha-inn.vercel.app
   [ ] Home page loads successfully
   [ ] Can see "Rooms" section
   [ ] "Meet our team" section visible (but empty)
   [ ] Click "Staff login" at bottom
   ```

### 4. **Create Admin Account** (2 min)
   ```
   [ ] Go to /login
   [ ] Click "Sign up"
   [ ] Enter: email & password
   [ ] Verify email (check email inbox)
   [ ] Log in - you are now ADMIN ✓
   [ ] Should see staff dashboard at /staff
   ```

### 5. **Add First Staff Member** (3 min)
   ```
   [ ] In staff dashboard, go to "Staff" tab
   [ ] Click "+ Add staff"
   [ ] Enter:
       Name: Ahmed Hassan
       Role: Manager
       Bio: Friendly local manager
       Order: 1
       Visibility: ✓ (checked)
   [ ] Click "Add photo"
   [ ] Upload a photo
   [ ] Click "Save staff member"
   [ ] Should see success message
   ```

### 6. **Verify Home Page Update** (2 min)
   ```
   [ ] Go back to home page /
   [ ] Scroll down
   [ ] Look for "Meet our team" section
   [ ] Should see the staff member you added
   [ ] Photo should display correctly
   [ ] Try adding more staff (optional)
   ```

### 7. **Set Up Business Details** (5 min)
   ```
   [ ] Go to /staff/settings
   [ ] Update:
       - Hotel name
       - Tagline
       - About description
       - Address
       - Phone numbers
       - WhatsApp number
       - Email
       - Logo & hero image URLs (optional)
   [ ] Click "Save settings"
   ```

### 8. **Add Rooms** (10 min)
   ```
   [ ] Go to /staff/rooms
   [ ] Click "+ Add room"
   [ ] Enter room details:
       - Room name: "101"
       - Type: "Deluxe Double"
       - Price per night: 50 USD
       - Max guests: 2
       - Description: (nice description)
       - Add photo
   [ ] Click "Save room"
   [ ] Add more rooms (at least 2-3)
   [ ] Go back to home page - should see rooms!
   ```

## 🧪 Testing Checklist

After deployment, test these features:

- [ ] Home page loads without errors
- [ ] Rooms display with photos
- [ ] Staff directory shows with photos and bios
- [ ] Can access staff dashboard at /staff
- [ ] Can add/edit/delete staff members
- [ ] Photos upload and display correctly
- [ ] Staff page responsive on mobile
- [ ] Only public staff appear on home page
- [ ] Only admin can manage staff
- [ ] Can navigate all tabs in staff dashboard

## 🔧 Troubleshooting

### Staff not showing on home page?
- [ ] Check `is_public` is ticked in staff form
- [ ] Verify photo URL is accessible
- [ ] Reload browser (may be cached)
- [ ] Check browser console for errors

### Photos not uploading?
- [ ] Check file size < 10MB
- [ ] File format must be JPG/PNG
- [ ] Check you're logged in as staff
- [ ] Check internet connection

### Database errors?
- [ ] Verify schema.sql was run completely
- [ ] Check all tables exist in Supabase
- [ ] Verify environment variables are set
- [ ] Try refreshing dashboard in browser

### Vercel deployment failed?
- [ ] Check build logs in Vercel dashboard
- [ ] Verify environment variables are set
- [ ] Check GitHub is up to date with git push
- [ ] Try manual redeploy from Vercel dashboard

## 📱 Mobile Testing

Test on actual devices:
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] Tablet (iPad/Android tablet)

Things to check:
- [ ] Staff cards display correctly
- [ ] Photos load quickly
- [ ] Text is readable
- [ ] Can tap to scroll
- [ ] Forms work properly
- [ ] No horizontal scrolling

## 📊 Database Verification

In Supabase SQL Editor, run these to verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check staff table
SELECT * FROM public.staff;

-- Check if policies exist
SELECT * FROM pg_policies WHERE tablename = 'staff';
```

## 🎉 Success!

Once you've completed all items above, your ATHA INN system is ready:

✓ Guests can visit your website
✓ Staff can manage the guesthouse
✓ Team members are displayed to guests
✓ Photos upload automatically
✓ Everything syncs to database

## 📞 Need Help?

- Supabase issues: https://supabase.io/docs
- Next.js issues: https://nextjs.org/docs
- Vercel issues: https://vercel.com/docs
- General questions: Check SETUP.md

---

**Last Updated:** 2026-11-22
**Version:** 1.0.0
**Status:** ✅ Ready for Deployment
