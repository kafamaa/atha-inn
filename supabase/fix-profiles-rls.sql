-- Fix: Profiles RLS policy - allow users to read their own profile
-- Run this in Supabase SQL Editor to fix the "No staff access" error

-- First, re-enable RLS if it was disabled
alter table public.profiles enable row level security;

-- Drop old problematic policies
drop policy if exists p_profiles_read on public.profiles;
drop policy if exists p_profiles_admin on public.profiles;

-- Create new simplified policies that don't have circular dependency
-- Policy 1: Any authenticated user can read their OWN profile
create policy p_profiles_read on public.profiles for select to authenticated 
  using (id = auth.uid());

-- Policy 2: Users can only update their own profile if they are admin
create policy p_profiles_admin on public.profiles for update to authenticated 
  using (id = auth.uid() AND role = 'admin') 
  with check (id = auth.uid() AND role = 'admin');

-- Verify the policy is working
SELECT * FROM public.profiles LIMIT 1;
