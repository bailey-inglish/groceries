# Groceries Inventory Manager 🛒

A Progressive Web App (PWA) built with Next.js and Supabase for managing grocery and home item inventory with intelligent, adaptive learning for restocking recommendations.

## Features

- **📷 Barcode Scanning**: Scan UPC barcodes to quickly add or remove items from your inventory
- **📦 Inventory Management**: Track quantities, categories, and stock levels of all your items
- **🧠 Adaptive Learning**: AI-powered algorithm that learns your consumption patterns
- **🛍️ Smart Shopping Lists**: Get personalized recommendations on what to buy and when
- **📱 PWA Support**: Install on your device and use offline
- **🔄 Real-time Updates**: Instant synchronization with Supabase backend

## Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Barcode Scanning**: @zxing/library
- **Camera Access**: react-webcam

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Supabase account (free tier works great)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/bailey-inglish/groceries.git
cd groceries
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL commands from `DATABASE.md` in your Supabase SQL editor
   - Copy your project URL and anon key

4. Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Usage

### Scanning Items

1. Navigate to the "Scan Item" page
2. Grant camera permissions when prompted
3. Point your camera at a product's UPC barcode
4. For new items, fill in the details (name, category, unit, etc.)
5. Choose to add or remove quantity from inventory

### Managing Inventory

1. View all items in the "Inventory" page
2. Search by name or UPC
3. Filter by category
4. Edit item details inline
5. See stock levels and low stock alerts

### Shopping Recommendations

1. Visit the "Shopping List" page
2. Click "Update Predictions" to run the adaptive learning algorithm
3. View prioritized items that need restocking:
   - **Urgent**: Out of stock or critically low
   - **Soon**: Predicted to run out within a week
   - **Monitor**: Items to keep an eye on
4. Mark items as purchased to update inventory
5. The algorithm learns from your patterns over time

## How the Adaptive Learning Works

The system tracks every inventory change and uses this data to:

1. **Calculate Consumption Rate**: Analyzes how quickly you use each item
2. **Predict Restocking**: Estimates when you'll run out based on current stock and usage rate
3. **Build Confidence**: Improves accuracy as more data is collected
4. **Prioritize Recommendations**: Suggests what to buy based on urgency and patterns

The more you use the app, the smarter it gets!

## Database Schema

See `DATABASE.md` for detailed information about the database structure.

## PWA Installation

On mobile devices:
- **iOS**: Tap the share button and select "Add to Home Screen"
- **Android**: Tap the menu button and select "Install App" or "Add to Home Screen"

On desktop browsers:
- Look for the install icon in the address bar
- Or use the browser menu to install the PWA

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database powered by [Supabase](https://supabase.com/)
- Barcode scanning via [ZXing](https://github.com/zxing-js/library)