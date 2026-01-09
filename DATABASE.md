# Groceries PWA - Database Setup Guide

## Overview

This document provides complete setup instructions for the Groceries Inventory Manager Progressive Web App.

## Database Schema

The application uses **Supabase** (PostgreSQL) with the following tables:

### Tables

1. **inventory_items** - Stores current inventory
2. **inventory_history** - Logs all scan in/out events for pattern analysis
3. **shopping_list** - Manages shopping list with predictions
4. **user_locations** - Stores custom storage locations per user

See `database-schema.sql` for the complete SQL schema with Row Level Security (RLS) policies.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the database to be provisioned

### 2. Set Up Authentication

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates (optional but recommended):
   - Customize the "Magic Link" template for better branding
   - Set the redirect URL to match your deployment URL

### 3. Run the Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Copy the contents of `database-schema.sql`
3. Paste and run the SQL commands
4. Verify all tables are created in **Database** → **Tables**

### 4. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from:
- Supabase Dashboard → **Project Settings** → **API**

### 5. Install Dependencies

```bash
npm install
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

### Authentication
- Magic link login (passwordless)
- Email-based authentication via Supabase Auth
- Session management with auto-refresh

### Scan In
- Barcode scanner using device camera
- Add items with name, category, location, and quantity
- Custom locations (e.g., "Pantry", "Fridge", "Freezer")
- Automatic inventory tracking

### Scan Out
- Scan items to mark as used
- Option to add to shopping list when scanning out
- Removes from active inventory
- Logs usage for pattern analysis

### Inventory Management
- View all current items
- Filter by location
- Search by name or barcode
- Edit item details (name, category, location, quantity, notes)
- Delete items

### Smart Shopping List
- **Definite items** - manually added or scanned out with "add to list"
- **Suggested items** - AI predictions based on usage patterns
- Predicts when you'll need to restock based on:
  - Average days between purchases
  - Last scan out date
  - Confidence score based on data points
- Mark items as purchased
- Add items manually
- Refresh predictions on demand

### Progressive Web App
- Mobile-first design
- Install as standalone app on iOS and Android
- Offline-capable (with service worker)
- QR code for desktop users to access on mobile
- Push notifications (can be added)

## Usage Flow

### Ideal User Journey

1. **Buy groceries**
   - User goes shopping
   
2. **Scan in items**
   - Open the app
   - Tap "Scan In"
   - Scan barcode of each item
   - Enter item name and select location
   - Repeat for all groceries
   
3. **Use groceries**
   - User consumes items throughout the week
   
4. **Scan out when empty**
   - When item runs out (e.g., empty Cheez-Its box)
   - Open app, tap "Scan Out"
   - Scan the barcode
   - Choose whether to add to shopping list
   
5. **Review shopping list**
   - At end of week, tap "Shopping List"
   - See definite items (manually added)
   - See suggested items (AI predictions)
   - Add suggestions to definite list
   - Go shopping with the list

### Prediction Algorithm

The app analyzes your scan history:
- Groups scans by UPC (barcode)
- Calculates average days between purchases
- Predicts restock date based on last scan out
- Confidence score increases with more data points
- Suggests items when approaching restock time (70% threshold)

## Development

### Tech Stack
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - Backend (Auth, Database, RLS)
- **@zxing/library** - Barcode scanning
- **qrcode.react** - QR code generation
- **sonner** - Toast notifications

### Project Structure
```
groceries/
├── app/
│   ├── page.tsx               # Login page with PWA install
│   ├── auth-callback/         # OAuth callback
│   ├── home/                  # Main dashboard
│   ├── scan-in/               # Scan in flow
│   ├── scan-out/              # Scan out flow
│   ├── inventory/             # Inventory management
│   └── shopping-list/         # Shopping list with predictions
├── components/
│   └── BarcodeScanner.tsx     # Camera barcode scanner
├── lib/
│   └── supabase.ts            # Supabase client and helpers
├── public/
│   └── manifest.json          # PWA manifest
└── database-schema.sql        # Complete database schema
```

### Key Files
- `lib/supabase.ts` - All database operations and helper functions
- `database-schema.sql` - Complete database schema with RLS policies
- `app/page.tsx` - Landing page with mobile detection and QR code
- `components/BarcodeScanner.tsx` - Camera integration for barcode scanning

## Deployment

### Recommended: Vercel

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Deploy

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Post-Deployment
1. Update Supabase Auth redirect URLs:
   - Supabase Dashboard → **Authentication** → **URL Configuration**
   - Add your production URL to **Site URL** and **Redirect URLs**
2. Test magic link login
3. Test barcode scanning (requires HTTPS)
4. Test PWA installation

## Security

- **Row Level Security (RLS)** enabled on all tables
- Users can only access their own data
- Supabase Auth handles session management
- ANON key is safe to expose (client-side)
- No service role key in client code

## Troubleshooting

### Camera not working
- Ensure HTTPS (required for camera access)
- Check browser permissions
- Test on actual mobile device (not simulator)

### Magic link not working
- Verify Supabase redirect URLs
- Check email spam folder
- Ensure email provider is enabled in Supabase

### RLS errors
- Verify user is authenticated
- Check RLS policies in Supabase Dashboard
- Ensure `auth.uid()` matches `user_id` in tables

### Predictions not appearing
- Need at least 2 scan in/out cycles per item
- Click refresh button in shopping list
- Check `inventory_history` table has data

## Future Enhancements

- [ ] Push notifications for predicted restocks
- [ ] Barcode database integration (auto-fill item names)
- [ ] Receipt scanning with OCR
- [ ] Household sharing (multiple users, one inventory)
- [ ] Expiration date tracking
- [ ] Price tracking and budget management
- [ ] Recipe integration
- [ ] Export data as CSV

## Support

For issues or questions, check:
- `DATABASE.md` for schema details
- `SETUP.md` for setup instructions
- Supabase documentation: https://supabase.com/docs
- Next.js documentation: https://nextjs.org/docs
