# Features Documentation

## Core Features

### 📷 Barcode Scanning

The app uses the device camera to scan UPC barcodes for quick item lookup and management.

**How it works:**
- Click "Scan Item" from the home page
- Grant camera permissions when prompted
- Point the camera at a UPC barcode
- The app automatically detects and processes the barcode
- For new items, you'll be prompted to enter details
- For existing items, you can add or remove quantity

**Supported Formats:**
- UPC-A (standard 12-digit barcodes)
- EAN-13 (13-digit international barcodes)
- Other common barcode formats via ZXing library

**Manual Entry:**
- If camera is unavailable or barcode won't scan, you can enter the UPC manually
- Click the manual UPC input field and type the barcode number

### 📦 Inventory Management

Track all your grocery and home items in one place.

**Item Properties:**
- **Name**: Product name (e.g., "Eggs", "Milk")
- **UPC**: Universal Product Code for identification
- **Category**: Organize by type (Dairy, Produce, Meat, etc.)
- **Quantity**: Current stock level
- **Unit**: Measurement unit (count, bottles, boxes, lbs, oz, etc.)
- **Low Stock Threshold**: When to be alerted about low stock

**Inventory Actions:**
- **Add Items**: Scan or manually create new items
- **Update Quantity**: Add or remove stock as you shop or consume
- **Edit Details**: Modify name, category, unit, or thresholds
- **Search**: Find items by name or UPC
- **Filter**: View items by category
- **View History**: All changes are logged for pattern analysis

### 🧠 Adaptive Learning Algorithm

The app learns your consumption patterns over time to predict when you'll need to restock.

**How the Algorithm Works:**

1. **Data Collection**
   - Every time you add or remove items, the change is logged
   - Timestamps are recorded for temporal analysis
   - Both quantity changes and resulting stock levels are tracked

2. **Pattern Analysis**
   - Calculates consumption rate (items per day)
   - Identifies usage trends over time
   - Accounts for seasonal variations and irregularities

3. **Prediction Calculation**
   - `Consumption Rate = Total Consumed / Days Between First and Last Log`
   - `Days Until Restock = Current Quantity / Consumption Rate`
   - Confidence score increases with more data points (up to 10+ logs = 100% confidence)

4. **Continuous Improvement**
   - Predictions update as you use the app
   - More data = more accurate predictions
   - Click "Update Predictions" to recalculate based on latest data

**Prediction Metrics:**
- **Average Consumption Rate**: How quickly you use the item (units/day)
- **Days Until Restock**: Estimated days before running out
- **Confidence Score**: Accuracy rating (0-100%) based on data quantity

### 🛍️ Smart Shopping Recommendations

Get personalized shopping lists based on your inventory and consumption patterns.

**Priority Levels:**

**🔴 Urgent (High Priority)**
- Items that are out of stock (quantity = 0)
- Items below low stock threshold
- Items predicted to run out within 3 days

**🟡 Soon (Medium Priority)**
- Items predicted to run out within 7 days
- Items with quantity ≤ 2x low stock threshold

**🟢 Monitor (Low Priority)**
- Items with adequate stock but approaching low levels
- Items to keep an eye on

**Features:**
- Sorted by urgency and predicted restock time
- Shows current quantity, consumption rate, and predictions
- One-click "Mark as Purchased" to update inventory
- Direct link to scanning page for quick updates
- Explanatory information about the learning algorithm

### 📱 Progressive Web App (PWA)

Install the app on your device for a native app experience.

**PWA Benefits:**
- **Offline Access**: Work without internet connection
- **Home Screen Icon**: Add to your phone's home screen
- **Full Screen**: Runs like a native app
- **Push Notifications**: (Future feature) Get alerts for low stock
- **Fast Loading**: Cached resources load instantly

**Installation:**

*On Mobile (iOS):*
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add"

*On Mobile (Android):*
1. Open the app in Chrome
2. Tap the three-dot menu
3. Select "Add to Home Screen" or "Install App"
4. Tap "Add"

*On Desktop:*
1. Look for the install icon in the address bar
2. Click to install
3. App appears in your applications

### 🔄 Real-time Synchronization

All data is stored in Supabase PostgreSQL database and syncs across devices.

**Benefits:**
- Access your inventory from any device
- Share inventory with family members
- Automatic backups
- No data loss
- Fast queries and updates

## Advanced Features

### Category Management

Organize items by category for easier browsing:
- Dairy
- Produce
- Meat
- Bakery
- Beverages
- Snacks
- Household
- Personal Care
- Other

*Categories can be customized in the code if needed.*

### Unit Types

Multiple unit types supported:
- count (default for discrete items)
- bottles
- boxes
- cans
- lbs (pounds)
- oz (ounces)

*Additional units can be added in the code.*

### Low Stock Alerts

Visual indicators when items are running low:
- Yellow badge on inventory page
- Alert banner on home page
- Prominent placement in recommendations

### Search and Filter

**Search:**
- Search by item name (case-insensitive)
- Search by UPC code
- Real-time results as you type

**Filter:**
- Filter by category
- View all or specific categories
- Combine with search for precise results

### Inventory Logging

All inventory changes are tracked:
- **Action Type**: Add, Remove, or Update
- **Quantity Change**: Amount added or removed
- **Quantity After**: Resulting stock level
- **Timestamp**: When the change occurred

This historical data powers the adaptive learning algorithm.

## Planned Features

Future enhancements we're considering:
- 📸 Photo capture for items without barcodes
- 📅 Expiration date tracking
- 🔔 Push notifications for low stock
- 📊 Usage analytics and charts
- 🏪 Shopping location tracking
- 💰 Price tracking and budgeting
- 📝 Custom notes per item
- 👥 Multi-user support with sharing
- 🗂️ Custom categories and tags
- 🔍 Product name lookup from UPC database

## Best Practices

**For Best Results:**

1. **Scan regularly**: Update inventory every time you shop or consume items
2. **Be consistent**: Always update quantities for accurate predictions
3. **Set accurate thresholds**: Adjust low stock alerts to match your needs
4. **Use categories**: Organize items for easier management
5. **Update predictions weekly**: Click "Update Predictions" regularly
6. **Give it time**: Algorithm improves with more data over time

**Tips:**
- Start with items you use frequently
- Keep a consistent unit system for similar items
- Update inventory before shopping trips
- Use the recommendations page as your shopping list
- Adjust low stock thresholds based on how quickly you can restock
