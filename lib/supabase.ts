import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

// ====================================================================
// TYPES
// ====================================================================

export interface InventoryItem {
  id: string
  user_id: string
  name: string
  upc: string
  category: string | null
  location: string | null
  quantity: number
  unit: string
  scan_in_date: string
  scan_out_date: string | null
  add_to_shopping_list: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InventoryHistory {
  id: string
  user_id: string
  upc: string
  item_name: string
  category: string | null
  location: string | null
  action: 'scan_in' | 'scan_out'
  quantity: number
  scan_date: string
  created_at: string
}

export interface ShoppingListItem {
  id: string
  user_id: string
  item_name: string
  upc: string | null
  category: string | null
  quantity: number
  is_suggested: boolean
  prediction_confidence: number | null
  last_scan_out_date: string | null
  average_days_between_purchases: number | null
  purchased: boolean
  created_at: string
  updated_at: string
}

export interface UserLocation {
  id: string
  user_id: string
  location_name: string
  created_at: string
}

// ====================================================================
// INVENTORY ITEMS
// ====================================================================

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .is('scan_out_date', null) // Only active items (not scanned out)
    .order('scan_in_date', { ascending: false })

  if (error) {
    console.error('Error fetching inventory items:', error)
    return []
  }

  return data || []
}

export async function getInventoryItemByUPC(upc: string): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('upc', upc)
    .is('scan_out_date', null)
    .maybeSingle()

  if (error) {
    console.error('Error fetching item by UPC:', error)
    return null
  }

  return data
}

export async function scanInItem(
  upc: string,
  name: string,
  category: string | null = null,
  location: string | null = null,
  quantity: number = 1
): Promise<InventoryItem | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('User not authenticated')
    return null
  }

  // Create inventory item
  const { data: item, error: itemError } = await supabase
    .from('inventory_items')
    .insert([{
      user_id: user.id,
      name,
      upc,
      category,
      location,
      quantity,
      scan_in_date: new Date().toISOString()
    }])
    .select()
    .single()

  if (itemError) {
    console.error('Error scanning in item:', itemError)
    return null
  }

  // Log the scan in
  await supabase
    .from('inventory_history')
    .insert([{
      user_id: user.id,
      upc,
      item_name: name,
      category,
      location,
      action: 'scan_in',
      quantity,
      scan_date: new Date().toISOString()
    }])

  return item
}

export async function scanOutItem(
  itemId: string,
  addToShoppingList: boolean = false
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('User not authenticated')
    return false
  }

  // Get the item first
  const { data: item, error: fetchError } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', itemId)
    .single()

  if (fetchError || !item) {
    console.error('Error fetching item:', fetchError)
    return false
  }

  // Update item with scan_out_date and shopping list flag
  const { error: updateError } = await supabase
    .from('inventory_items')
    .update({
      scan_out_date: new Date().toISOString(),
      add_to_shopping_list: addToShoppingList
    })
    .eq('id', itemId)

  if (updateError) {
    console.error('Error scanning out item:', updateError)
    return false
  }

  // Log the scan out
  await supabase
    .from('inventory_history')
    .insert([{
      user_id: user.id,
      upc: item.upc,
      item_name: item.name,
      category: item.category,
      location: item.location,
      action: 'scan_out',
      quantity: item.quantity,
      scan_date: new Date().toISOString()
    }])

  // If adding to shopping list, add it
  if (addToShoppingList) {
    await addToShoppingListDefinite(item.name, item.upc, item.category, item.quantity)
  }

  return true
}

export async function updateInventoryItem(
  id: string,
  updates: Partial<Pick<InventoryItem, 'name' | 'category' | 'location' | 'quantity' | 'notes'>>
): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from('inventory_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating inventory item:', error)
    return null
  }

  return data
}

export async function deleteInventoryItem(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting inventory item:', error)
    return false
  }

  return true
}

// ====================================================================
// INVENTORY HISTORY
// ====================================================================

export async function getInventoryHistory(upc?: string): Promise<InventoryHistory[]> {
  let query = supabase
    .from('inventory_history')
    .select('*')
    .order('scan_date', { ascending: false })

  if (upc) {
    query = query.eq('upc', upc)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching inventory history:', error)
    return []
  }

  return data || []
}

// ====================================================================
// SHOPPING LIST
// ====================================================================

export async function getShoppingList(): Promise<ShoppingListItem[]> {
  const { data, error } = await supabase
    .from('shopping_list')
    .select('*')
    .eq('purchased', false)
    .order('is_suggested', { ascending: true }) // Definite items first
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching shopping list:', error)
    return []
  }

  return data || []
}

export async function addToShoppingListDefinite(
  itemName: string,
  upc: string | null = null,
  category: string | null = null,
  quantity: number = 1
): Promise<ShoppingListItem | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('User not authenticated')
    return null
  }

  // Check if item already exists in shopping list
  const { data: existing } = await supabase
    .from('shopping_list')
    .select('*')
    .eq('user_id', user.id)
    .eq('item_name', itemName)
    .eq('purchased', false)
    .maybeSingle()

  if (existing) {
    // Update existing item
    const { data, error } = await supabase
      .from('shopping_list')
      .update({
        quantity: existing.quantity + quantity,
        is_suggested: false, // Mark as definite
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating shopping list item:', error)
      return null
    }
    return data
  }

  // Create new shopping list item
  const { data, error } = await supabase
    .from('shopping_list')
    .insert([{
      user_id: user.id,
      item_name: itemName,
      upc,
      category,
      quantity,
      is_suggested: false
    }])
    .select()
    .single()

  if (error) {
    console.error('Error adding to shopping list:', error)
    return null
  }

  return data
}

export async function convertSuggestionToDefinite(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('shopping_list')
    .update({ is_suggested: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error converting suggestion to definite:', error)
    return false
  }

  return true
}

export async function markShoppingItemPurchased(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('shopping_list')
    .update({ purchased: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error marking item as purchased:', error)
    return false
  }

  return true
}

export async function removeFromShoppingList(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('shopping_list')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error removing from shopping list:', error)
    return false
  }

  return true
}

// ====================================================================
// SHOPPING LIST PREDICTIONS
// ====================================================================

export async function generateShoppingPredictions(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Get all historical scan data grouped by UPC
  const { data: history, error } = await supabase
    .from('inventory_history')
    .select('*')
    .eq('user_id', user.id)
    .order('scan_date', { ascending: true })

  if (error || !history) return

  // Group by UPC
  const itemGroups = history.reduce((acc, record) => {
    if (!acc[record.upc]) {
      acc[record.upc] = []
    }
    acc[record.upc].push(record)
    return acc
  }, {} as Record<string, InventoryHistory[]>)

  // Analyze each item
  for (const [upc, records] of Object.entries(itemGroups)) {
    const typedRecords = records as InventoryHistory[]
    const scanIns = typedRecords.filter(r => r.action === 'scan_in')
    const scanOuts = typedRecords.filter(r => r.action === 'scan_out')

    // Need at least 2 complete cycles (scan in -> scan out) to predict
    if (scanIns.length < 2 || scanOuts.length < 2) continue

    // Calculate average days between purchases
    const daysBetween: number[] = []
    for (let i = 1; i < scanIns.length; i++) {
      const days = (new Date(scanIns[i].scan_date).getTime() - new Date(scanIns[i - 1].scan_date).getTime()) / (1000 * 60 * 60 * 24)
      daysBetween.push(days)
    }

    if (daysBetween.length === 0) continue

    const avgDays = daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length
    const lastScanOut = scanOuts[scanOuts.length - 1]
    const daysSinceLastScanOut = (Date.now() - new Date(lastScanOut.scan_date).getTime()) / (1000 * 60 * 60 * 24)

    // If we're approaching the average repurchase time, add to suggested list
    if (daysSinceLastScanOut >= avgDays * 0.7) { // 70% threshold
      const confidence = Math.min(1, scanIns.length / 5) // More data = higher confidence

      // Check if already in shopping list
      const { data: existing } = await supabase
        .from('shopping_list')
        .select('*')
        .eq('upc', upc)
        .eq('user_id', user.id)
        .eq('purchased', false)
        .maybeSingle()

      if (!existing) {
        // Add as suggestion
        await supabase
          .from('shopping_list')
          .insert([{
            user_id: user.id,
            item_name: lastScanOut.item_name,
            upc,
            category: lastScanOut.category,
            quantity: 1,
            is_suggested: true,
            prediction_confidence: confidence,
            last_scan_out_date: lastScanOut.scan_date,
            average_days_between_purchases: avgDays
          }])
      }
    }
  }
}

// ====================================================================
// USER LOCATIONS
// ====================================================================

export async function getUserLocations(): Promise<UserLocation[]> {
  const { data, error } = await supabase
    .from('user_locations')
    .select('*')
    .order('location_name', { ascending: true })

  if (error) {
    console.error('Error fetching user locations:', error)
    return []
  }

  return data || []
}

export async function addUserLocation(locationName: string): Promise<UserLocation | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('User not authenticated')
    return null
  }

  const { data, error } = await supabase
    .from('user_locations')
    .insert([{
      user_id: user.id,
      location_name: locationName
    }])
    .select()
    .single()

  if (error) {
    console.error('Error adding user location:', error)
    return null
  }

  return data
}

export async function deleteUserLocation(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_locations')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting user location:', error)
    return false
  }

  return true
}
