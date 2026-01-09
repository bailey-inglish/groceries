# Supabase Configuration for easygroceries.vercel.app

## Required Settings

### Authentication → URL Configuration

**Site URL:**
```
https://easygroceries.vercel.app
```

**Redirect URLs** (add both):
```
https://easygroceries.vercel.app/auth-callback
http://localhost:3000/auth-callback
```

The localhost URL allows testing during development, while the production URL is used in deployment.

## Why This Matters

- **Magic Links**: Desktop users receive an email with a link. When clicked, Supabase validates the token and redirects to `/auth-callback` on our domain.
- **OTP Codes**: PWA/mobile users enter a 6-digit code directly in the app, so they don't need the redirect (but it's still configured for consistency).

## Testing Checklist

After configuring:
- [ ] Desktop magic link redirects to `https://easygroceries.vercel.app/auth-callback`
- [ ] Mobile PWA OTP login works (no redirect needed)
- [ ] Local dev magic link redirects to `http://localhost:3000/auth-callback`
- [ ] QR code on desktop shows `https://easygroceries.vercel.app`

## Current Environment

The app is hardcoded to use `easygroceries.vercel.app` in:
- `app/page.tsx` - Magic link redirect URL
- `app/page.tsx` - QR code URL for desktop users
- Documentation (README, SETUP, FIXES)
