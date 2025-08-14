# 🔧 Fix Supabase Email Verification

## Problem
Email verification links are pointing to localhost:3000 instead of Supabase, causing "requested path is invalid" errors.

## Solution

### Step 1: Reset Supabase URL Configuration to Default

1. **Go to your Supabase Dashboard**
   - Navigate to [supabase.com](https://supabase.com)
   - Open your project: `sdlmyaffbnjkmzwpdwqp`

2. **Go to Authentication → URL Configuration**
   - Click **"Authentication"** in the left sidebar
   - Click **"URL Configuration"**

3. **Clear and Reset the URLs:**
   - **Site URL**: Clear this field completely (leave it empty)
   - **Redirect URLs**: Clear all entries (delete everything)
   - **Save the changes**

4. **Wait a few seconds, then add the default:**
   - **Site URL**: `https://sdlmyaffbnjkmzwpdwqp.supabase.co`
   - **Redirect URLs**: Add only this one:
     ```
     https://sdlmyaffbnjkmzwpdwqp.supabase.co/auth/callback
     ```
   - **Save the changes**

### Step 2: Check Email Templates

1. **Go to Authentication → Email Templates**
2. **Click on "Confirm signup" template**
3. **Verify the confirmation link format:**
   ```
   https://sdlmyaffbnjkmzwpdwqp.supabase.co/auth/v1/verify?token={{ .Token }}&type=signup&next=/auth/callback
   ```
4. **If the template is wrong, reset it to default or manually set the correct URL**

### Step 3: Verify Authentication Settings

1. **Go to Authentication → Settings**
2. **Ensure these settings:**
   - ✅ **Enable email confirmations** (checked)
   - ✅ **Enable email change confirmations** (checked)
   - ✅ **Secure email change** (checked)
   - ❌ **Enable phone confirmations** (unchecked, unless you want it)

### Step 4: Test the Verification Flow

1. **Reload your Chrome extension**
2. **Try creating a new account**
3. **Check your email for the verification link**
4. **Click the verification link** - it should now work properly

## How Supabase Email Verification Works

### Default Flow:
1. **User signs up** → Supabase creates user with `email_confirmed_at = null`
2. **Supabase sends email** with verification link to: `https://sdlmyaffbnjkmzwpdwqp.supabase.co/auth/v1/verify?token=...`
3. **User clicks link** → Goes to Supabase's built-in verification page
4. **Supabase verifies token** → Updates `email_confirmed_at` timestamp
5. **User can now sign in** → `email_confirmed_at` is not null

### What Our Extension Does:
- Uses proper Supabase API endpoints
- Detects when email confirmation is required
- Provides clear messaging to users
- Handles verification status properly

## Expected Behavior

After fixing:
- ✅ Email verification links point to Supabase
- ✅ Users can verify their email by clicking the link
- ✅ After verification, users can sign in to the extension
- ✅ No more "requested path is invalid" errors
- ✅ Proper error handling and user feedback

## Alternative: Disable Email Confirmation (For Testing)

If you want to test without email verification:

1. **Go to Authentication → Settings**
2. **Uncheck "Enable email confirmations"**
3. **Save changes**

This allows immediate sign-in after registration (for testing only).

## For Production

When ready for production:
1. **Re-enable email confirmations**
2. **Set up proper redirect URLs** to your actual domain
3. **Configure custom email templates** if needed
4. **Consider redirecting verified users to job sites** (LinkedIn, ZipRecruiter, etc.)

## Troubleshooting

### If still getting "requested path is invalid":
1. **Check the actual URL in the email** - what does it point to?
2. **Verify redirect URLs in Supabase** match exactly
3. **Check email template** has correct verification URL
4. **Try disabling and re-enabling email confirmations**

### If verification link doesn't work:
1. **Check Supabase logs** for verification errors
2. **Verify the token format** in the URL
3. **Test with a fresh signup** to get a new verification email
