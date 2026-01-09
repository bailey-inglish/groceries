# EasyGroceries

A beautiful, mobile-first Progressive Web App for smart grocery inventory management. Track what you have, predict what you'll need, never run out.

🌐 **Live App**: [easygroceries.vercel.app](https://easygroceries.vercel.app)

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 📱 Mobile-First PWA
- **Install on any device** - Works as a standalone app on iOS and Android
- **Fast and responsive** - Optimized for mobile performance with flat design
- **Clean UI** - Simple, elegant interface with intuitive navigation
- **Real-time sync** - Data syncs instantly across devices

### 📦 Inventory Management
- **Barcode scanning** - Use your camera to scan items in and out
- **Auto-lookup** - Automatically look up product names from barcodes (via Open Food Facts)
- **Custom locations** - Organize items by Pantry, Fridge, Freezer, or custom locations
- **Search and filter** - Quickly find items by name, barcode, or location
- **Edit and delete** - Manage quantities and categories

### 🧠 Smart Shopping List
- **Adaptive predictions** - AI learns your usage patterns
- **Suggested items** - Get recommendations based on:
  - Average days between purchases
  - Last scan out date
  - Confidence scores
- **Definite items** - Manually add items or mark when scanning out
- **One-tap actions** - Add suggestions to list or mark as purchased

### 🔐 Secure Authentication
- **Email OTP on PWA** - 6-digit code sent to email for app users
- **Magic link on web** - Passwordless email authentication on desktop
- **Private data** - Each user's data is isolated with Row Level Security
- **Session management** - Automatic token refresh and secure sessions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A Supabase account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/groceries.git
   cd groceries
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   
   Create a new project at [supabase.com](https://supabase.com), then:
   
   - Go to SQL Editor
   - Copy and run the contents of `database-schema.sql`
   - Enable Email auth in Authentication → Providers

4. **Configure environment variables**
   
   Create `.env.local` in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   
   Get these from: Supabase Dashboard → Project Settings → API

5. **Run the development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage

### The Ideal Workflow

1. **🛒 Go shopping**
   - Buy your groceries as usual

2. **📥 Scan items in**
   - Open the app
   - Tap "Scan In"
   - Scan each item's barcode
   - Enter name and select a location
   - Done in seconds per item!

3. **🍕 Use your groceries**
   - Cook, eat, enjoy your food throughout the week

4. **📤 Scan out when empty**
   - Finished the Cheez-Its? Scan the empty box
   - Choose to add it to your shopping list
   - The app tracks your usage

5. **🛍️ Review shopping list**
   - At the end of the week, check your shopping list
   - See definite items (what you marked)
   - See suggestions (what the app predicts you'll need)
   - Add predictions to your list with one tap
   - Go shopping with your smart list!

### How Predictions Work

The app analyzes your scan history:
- Groups items by barcode (UPC)
- Calculates average days between purchases
- Tracks when you last ran out
- Predicts when you'll need to restock (70% threshold)
- Confidence increases with more data points

After 2-3 purchase cycles, you'll start seeing accurate predictions!

## 🏗️ Tech Stack

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[Supabase](https://supabase.com/)** - Backend (Auth, Database, RLS)
- **[@zxing/library](https://github.com/zxing-js/library)** - Barcode scanning
- **[qrcode.react](https://github.com/zpao/qrcode.react)** - QR code generation
- **[sonner](https://sonner.emilkowal.ski/)** - Toast notifications

## 📁 Project Structure

```
groceries/
├── app/
│   ├── page.tsx                 # Login page (PWA install, QR code)
│   ├── layout.tsx               # Root layout
│   ├── auth-callback/           # Magic link callback
│   ├── home/                    # Dashboard with 4 main buttons
│   ├── scan-in/                 # Scan in flow
│   ├── scan-out/                # Scan out flow
│   ├── inventory/               # Inventory management
│   └── shopping-list/           # Shopping list with predictions
├── components/
│   └── BarcodeScanner.tsx       # Camera barcode scanner component
├── lib/
│   └── supabase.ts              # Supabase client & database helpers
├── public/
│   └── manifest.json            # PWA manifest
├── database-schema.sql          # Complete database schema
├── DATABASE.md                  # Setup and documentation
└── README.md                    # This file
```

## 🔒 Security

- **Row Level Security (RLS)** - All tables have RLS policies
- **Authenticated access only** - Users can only see their own data
- **Supabase Auth** - Secure session management
- **No exposed secrets** - Service role key never in client code
- **HTTPS required** - Camera access requires secure context

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
4. Deploy!

### Post-Deployment

1. Update Supabase redirect URLs:
   - Dashboard → Authentication → URL Configuration
   - Add your production URL to Site URL and Redirect URLs

2. Test the app:
   - Magic link login
   - Barcode scanning (requires HTTPS)
   - PWA installation

## 🐛 Troubleshooting

### Camera not working
- Ensure you're using HTTPS (required for camera access)
- Check browser permissions
- Test on a real mobile device (not simulator)

### Magic link not arriving
- Check spam folder
- Verify email provider is enabled in Supabase
- Check Supabase logs for email errors

### No predictions showing
- Need at least 2 complete scan cycles per item
- Click the refresh button in shopping list
- Check that `inventory_history` has data

See [DATABASE.md](DATABASE.md) for more troubleshooting help.

## 🛣️ Roadmap

- [ ] Push notifications for predicted restocks
- [ ] Barcode database integration (auto-fill item names)
- [ ] Receipt scanning with OCR
- [ ] Household sharing (multiple users, shared inventory)
- [ ] Expiration date tracking
- [ ] Price tracking and budget management
- [ ] Recipe integration
- [ ] Export data as CSV

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💬 Support

For issues or questions:
- Open an issue on GitHub
- Check [DATABASE.md](DATABASE.md) for setup help
- Review [Supabase docs](https://supabase.com/docs)

---

Made with ❤️ by [Your Name]
