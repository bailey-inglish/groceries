# 🛒 Pantry - Smart Grocery Tracker

A mobile-first Progressive Web App (PWA) for tracking your grocery inventory with barcode scanning, adaptive restocking predictions, and AI-powered meal suggestions.

## Features

- **📷 Barcode Scanning** - Camera-based scanning via html5-qrcode + Open Food Facts API
- **📦 Inventory Management** - Track items across Fridge, Freezer, Pantry, Spice Rack, etc.
- **🔮 Adaptive Predictions** - Calculate consumption rates and predict when you'll run out
- **🤖 AI Meal Suggestions** - OpenAI-powered recipe ideas based on your current inventory
- **📝 Recipe Library** - Save and manage your own recipes
- **🛍️ Smart Shopping List** - Auto-populated from inventory predictions
- **📱 PWA** - Installable on iOS and Android, works offline

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + Radix UI components
- **Prisma** ORM with **SQLite** (dev) / PostgreSQL (prod)
- **NextAuth.js v5** - credentials-based auth
- **next-pwa** - PWA/Service Worker
- **html5-qrcode** - barcode scanning
- **OpenAI SDK** - recipe suggestions
- **Zustand** - client state
- **Zod** - API validation

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-here-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY=""
```

### 3. Initialize database
```bash
npx prisma db push
```

### 4. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Production Build

```bash
npm run build
npm start
```

## PWA Installation

**iOS Safari**: Share → Add to Home Screen  
**Android Chrome**: Menu → Install App

## API Routes

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/signup` | User registration |
| `GET/POST /api/inventory` | List/create inventory items |
| `GET/PUT/DELETE /api/inventory/[id]` | Item CRUD |
| `POST /api/inventory/[id]/scan` | Record scan in/out event |
| `GET /api/products/lookup?barcode=` | Open Food Facts lookup (cached) |
| `GET/POST /api/recipes` | List/create recipes |
| `POST /api/recipes/suggest` | AI recipe suggestions |
| `GET/POST /api/shopping-list` | Shopping list |
| `PUT/DELETE /api/shopping-list/[id]` | Update/delete list item |
| `GET/PUT /api/settings` | User settings |

## OpenAI Integration

Add your OpenAI API key in **Settings** to enable AI meal suggestions. The app uses `gpt-4o-mini` by default. Your key is stored in the database and only used for recipe suggestions.

## License

MIT
