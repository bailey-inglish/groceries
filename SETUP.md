# Quick Setup Guide

Follow these steps to get the Groceries Inventory Manager up and running:

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Supabase

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in your project details:
   - Name: groceries (or any name you prefer)
   - Database Password: Choose a strong password
   - Region: Choose the closest region to you
4. Click "Create new project" and wait for it to be ready

### Create the Database Schema

1. In your Supabase dashboard, navigate to the SQL Editor
2. Copy and paste the following SQL commands:

```sql
-- Create inventory_items table
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  upc TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'count',
  low_stock_threshold INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_inventory_items_upc ON inventory_items(upc);
CREATE INDEX idx_inventory_items_category ON inventory_items(category);

-- Create inventory_logs table
CREATE TABLE inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_change INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('add', 'remove', 'update')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for logs
CREATE INDEX idx_inventory_logs_item_id ON inventory_logs(item_id);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs(created_at);

-- Create prediction_data table
CREATE TABLE prediction_data (
  item_id UUID PRIMARY KEY REFERENCES inventory_items(id) ON DELETE CASCADE,
  average_consumption_rate DECIMAL NOT NULL,
  days_until_restock INTEGER NOT NULL,
  confidence_score DECIMAL NOT NULL,
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

3. Click "Run" to execute the SQL

### Get Your API Credentials

1. In the Supabase dashboard, click on the "Settings" icon (gear icon)
2. Navigate to "API" under Project Settings
3. You'll find two important values:
   - **Project URL** (under "Config")
   - **anon public** key (under "Project API keys")

## 3. Configure Environment Variables

1. Copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

2. Open `.env.local` and replace the placeholder values with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_actual_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
```

## 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 5. Test the Application

### Add Your First Item

1. Click "Scan Item" on the home page
2. Grant camera permissions when prompted
3. Enter a UPC code manually (e.g., `012345678901`) or scan a real barcode
4. Fill in the item details:
   - Name: Test Item
   - Category: Other
   - Unit: count
   - Initial Quantity: 5
5. Click "Create Item"

### Test Inventory Management

1. Go to the "Inventory" page
2. You should see your test item listed
3. Click "Edit" to modify any details
4. Try the search and category filter

### Test Recommendations

1. Go to "Shopping List"
2. Click "Update Predictions"
3. As you use the app more, the predictions will become more accurate

## 6. Build for Production

```bash
npm run build
npm start
```

## 7. Deploy (Optional)

You can deploy this app to Vercel, Netlify, or any platform that supports Next.js:

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add your environment variables in the Vercel dashboard
5. Deploy!

### Deploy to Netlify

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Create a new site from Git
4. Select your repository
5. Add your environment variables
6. Set build command: `npm run build`
7. Set publish directory: `.next`
8. Deploy!

## Troubleshooting

### Camera Not Working

- Make sure you're using HTTPS (localhost uses HTTP but is allowed for development)
- Grant camera permissions when prompted
- Try a different browser (Chrome and Safari work best)
- On mobile, use the native camera for better performance

### Database Errors

- Check that your Supabase URL and key are correct
- Verify the tables were created successfully in the Supabase dashboard
- Check the browser console for specific error messages

### Build Errors

- Make sure all dependencies are installed: `npm install`
- Clear the Next.js cache: `rm -rf .next`
- Try building again: `npm run build`

## Next Steps

- Customize the categories to match your needs
- Add more unit types if needed
- Adjust the low stock thresholds
- Create custom icons for the PWA
- Set up notifications for low stock items

Enjoy managing your inventory! 🛒
