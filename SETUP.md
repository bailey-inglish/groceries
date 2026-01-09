# Quick Setup Guide

Follow these steps to get your Groceries PWA up and running in minutes.

## Step 1: Supabase Setup (5 minutes)

1. **Create a Supabase account**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign up (free tier is perfect)
   - Click "New Project"
   - Choose a name, database password, and region
   - Wait for database to provision (~2 minutes)

2. **Run the database schema**
   - In your project, go to "SQL Editor"
   - Click "New query"
   - Copy the entire contents of `database-schema.sql`
   - Paste and click "Run"
   - You should see "Success. No rows returned"

3. **Enable email authentication**
   - Go to "Authentication" → "Providers"
   - Make sure "Email" is enabled
   - (Optional) Customize email templates under "Email Templates"

4. **Get your API keys**
   - Go to "Project Settings" (gear icon) → "API"
   - Copy your "Project URL"
   - Copy your "anon public" key
   - Keep these for the next step!

## Step 2: Local Development (2 minutes)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create environment file**
   
   Create a file named `.env.local` in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
   
   Paste your URL and anon key from Step 1.

3. **Start the development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 3: Test It Out (5 minutes)

1. **Sign up with your email**
   - Enter your email on the login page
   - Click "Send Magic Link"
   - Check your email and click the link
   - You'll be redirected to the home screen!

2. **Try scanning an item**
   - Click "Scan In"
   - Allow camera permissions
   - Scan any barcode (try a cereal box!)
   - Enter the item name and location
   - Click "Add to Inventory"

3. **View your inventory**
   - Click "Inventory" from the home screen
   - You should see the item you just added!

4. **Test scanning out**
   - Click "Scan Out" from home
   - Scan the same barcode
   - Check "Add to shopping list"
   - Click "Scan Out"

5. **Check your shopping list**
   - Click "Shopping List" from home
   - You should see the item in your list!

## Step 4: Deploy to Production (Optional)

### Using Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/groceries.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Add environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Click "Deploy"
   - Wait ~2 minutes for deployment

3. **Update Supabase redirect URLs**
   - Go to Supabase Dashboard → "Authentication" → "URL Configuration"
   - Set "Site URL" to `https://easygroceries.vercel.app`
   - Add `https://easygroceries.vercel.app/auth-callback` to "Redirect URLs"
   - Click "Save"

4. **Test in production**
   - Visit [easygroceries.vercel.app](https://easygroceries.vercel.app)
   - Try logging in with OTP code (PWA) or magic link (desktop)
   - Test barcode scanning (requires HTTPS ✓)
   - Install as PWA on your phone!

## Troubleshooting

### "Camera not working"
- Make sure you're using HTTPS (localhost is OK for dev)
- Check that you allowed camera permissions
- Try on a real phone (not simulator)

### "Magic link not arriving"
- Check your spam folder
- Verify email provider is enabled in Supabase
- Try a different email address

### "No session found"
- Clear your browser cache and cookies
- Try incognito/private mode
- Check that your environment variables are correct

### "RLS policy violation"
- Make sure you're logged in
- Check that you ran the entire `database-schema.sql`
- Verify RLS is enabled on all tables

## Next Steps

Once everything is working:

1. **Customize locations**
   - In "Scan In", add your own custom locations
   - Examples: "Pantry", "Fridge", "Freezer", "Garage"

2. **Build your inventory**
   - Scan in all your current groceries
   - This gives the app baseline data

3. **Start the cycle**
   - As you use items, scan them out
   - Mark whether to add to shopping list
   - After 2-3 cycles, predictions will appear!

4. **Share with household**
   - Send the app URL to family members
   - They can create their own accounts
   - (Note: Currently separate inventories - household sharing coming soon!)

## Need Help?

- Check [DATABASE.md](DATABASE.md) for detailed setup
- Read [README.md](README.md) for usage guide
- Open an issue on GitHub
- Read Supabase docs: https://supabase.com/docs

Enjoy your smart grocery app! 🛒✨
