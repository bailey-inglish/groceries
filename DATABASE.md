# Supabase Database Schema

This document describes the PostgreSQL database schema for the Groceries Inventory Manager application.

## Tables

### inventory_items

Stores information about each grocery or home item being tracked.

```sql
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

-- Index for faster UPC lookups
CREATE INDEX idx_inventory_items_upc ON inventory_items(upc);

-- Index for category filtering
CREATE INDEX idx_inventory_items_category ON inventory_items(category);
```

### inventory_logs

Logs all inventory changes for tracking consumption patterns.

```sql
CREATE TABLE inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_change INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('add', 'remove', 'update')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster item log lookups
CREATE INDEX idx_inventory_logs_item_id ON inventory_logs(item_id);

-- Index for time-based queries
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs(created_at);
```

### prediction_data

Stores calculated predictions for item restocking based on consumption patterns.

```sql
CREATE TABLE prediction_data (
  item_id UUID PRIMARY KEY REFERENCES inventory_items(id) ON DELETE CASCADE,
  average_consumption_rate DECIMAL NOT NULL,
  days_until_restock INTEGER NOT NULL,
  confidence_score DECIMAL NOT NULL,
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Setup Instructions

1. Create a new Supabase project at https://supabase.com
2. Go to the SQL Editor in your Supabase dashboard
3. Run the SQL commands above to create the tables
4. Enable Row Level Security (RLS) if needed for your use case
5. Copy your project URL and anon key to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Example Data

To test the application, you can insert some sample data:

```sql
INSERT INTO inventory_items (name, upc, category, quantity, unit, low_stock_threshold)
VALUES 
  ('Eggs', '012345678901', 'Dairy', 12, 'count', 6),
  ('Milk', '012345678902', 'Dairy', 1, 'bottles', 1),
  ('Bread', '012345678903', 'Bakery', 2, 'loaves', 1),
  ('Apples', '012345678904', 'Produce', 6, 'count', 3),
  ('Chicken Breast', '012345678905', 'Meat', 2, 'lbs', 1);
```
