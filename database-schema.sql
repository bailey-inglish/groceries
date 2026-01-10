-- ====================================================================
-- Groceries PWA - Complete Database Schema
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- USERS TABLE
-- ====================================================================
-- Note: Supabase Auth handles user authentication
-- We'll reference auth.users via user_id foreign key

-- ====================================================================
-- INVENTORY ITEMS TABLE
-- ====================================================================
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  upc TEXT NOT NULL,
  category TEXT,
  location TEXT, -- e.g., "Pantry", "Fridge", "Freezer", custom locations
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity = 1),
  unit TEXT NOT NULL DEFAULT 'count',
  scan_in_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  scan_out_date TIMESTAMP WITH TIME ZONE,
  add_to_shopping_list BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_inventory_items_user_id ON inventory_items(user_id);
CREATE INDEX idx_inventory_items_upc ON inventory_items(upc);
CREATE INDEX idx_inventory_items_location ON inventory_items(location);
CREATE INDEX idx_inventory_items_scan_out_date ON inventory_items(scan_out_date);

-- ====================================================================
-- INVENTORY HISTORY TABLE
-- ====================================================================
-- Track each scan in/out event for consumption pattern analysis
CREATE TABLE inventory_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upc TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT,
  location TEXT,
  action TEXT NOT NULL CHECK (action IN ('scan_in', 'scan_out')),
  quantity INTEGER NOT NULL DEFAULT 1,
  scan_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for pattern analysis queries
CREATE INDEX idx_inventory_history_user_id ON inventory_history(user_id);
CREATE INDEX idx_inventory_history_upc ON inventory_history(upc);
CREATE INDEX idx_inventory_history_scan_date ON inventory_history(scan_date);
CREATE INDEX idx_inventory_history_action ON inventory_history(action);

-- ====================================================================
-- SHOPPING LIST TABLE
-- ====================================================================
CREATE TABLE shopping_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  upc TEXT,
  category TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_suggested BOOLEAN NOT NULL DEFAULT FALSE, -- true = predicted, false = definite/user-added
  prediction_confidence DECIMAL, -- 0-1 score for suggested items
  last_scan_out_date TIMESTAMP WITH TIME ZONE,
  average_days_between_purchases DECIMAL,
  purchased BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shopping_list_user_id ON shopping_list(user_id);
CREATE INDEX idx_shopping_list_is_suggested ON shopping_list(is_suggested);
CREATE INDEX idx_shopping_list_purchased ON shopping_list(purchased);
CREATE INDEX idx_shopping_list_upc ON shopping_list(upc);

-- ====================================================================
-- USER LOCATIONS TABLE
-- ====================================================================
-- Store custom locations per user
CREATE TABLE user_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, location_name)
);

CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);

-- ====================================================================
-- USER PRODUCT INFO TABLE
-- ====================================================================
-- Store user-specific preferred names, categories, and locations for UPCs
-- This allows auto-fill on subsequent scans of the same barcode
CREATE TABLE user_product_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upc TEXT NOT NULL,
  preferred_name TEXT NOT NULL,
  preferred_category TEXT,
  preferred_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, upc)
);

-- Indexes
CREATE INDEX idx_user_product_info_user_id ON user_product_info(user_id);
CREATE INDEX idx_user_product_info_upc ON user_product_info(upc);
CREATE INDEX idx_user_product_info_user_upc ON user_product_info(user_id, upc);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_product_info ENABLE ROW LEVEL SECURITY;

-- inventory_items policies
CREATE POLICY "Users can view their own inventory items"
  ON inventory_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory items"
  ON inventory_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory items"
  ON inventory_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory items"
  ON inventory_items FOR DELETE
  USING (auth.uid() = user_id);

-- inventory_history policies
CREATE POLICY "Users can view their own inventory history"
  ON inventory_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory history"
  ON inventory_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- shopping_list policies
CREATE POLICY "Users can view their own shopping list"
  ON shopping_list FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopping list items"
  ON shopping_list FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping list items"
  ON shopping_list FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping list items"
  ON shopping_list FOR DELETE
  USING (auth.uid() = user_id);

-- user_locations policies
CREATE POLICY "Users can view their own locations"
  ON user_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own locations"
  ON user_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own locations"
  ON user_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own locations"
  ON user_locations FOR DELETE
  USING (auth.uid() = user_id);

-- user_product_info policies
CREATE POLICY "Users can view their own product info"
  ON user_product_info FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product info"
  ON user_product_info FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product info"
  ON user_product_info FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product info"
  ON user_product_info FOR DELETE
  USING (auth.uid() = user_id);

-- ====================================================================
-- FUNCTIONS
-- ====================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_list_updated_at BEFORE UPDATE ON shopping_list
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_product_info_updated_at BEFORE UPDATE ON user_product_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
