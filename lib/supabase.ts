import { createClient } from '@supabase/supabase-js'

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// For build time, use placeholders but warn at runtime
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder'))) {
  console.warn('⚠️ Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

export interface InventoryItem {
  id: string
  name: string
  upc: string
  category: string
  quantity: number
  unit: string
  low_stock_threshold: number
  created_at: string
  updated_at: string
}

export interface InventoryLog {
  id: string
  item_id: string
  quantity_change: number
  quantity_after: number
  action: 'add' | 'remove' | 'update'
  created_at: string
}

export interface PredictionData {
  item_id: string
  average_consumption_rate: number
  days_until_restock: number
  confidence_score: number
  last_calculated: string
}

// Inventory Items
export async function getInventoryItems(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('updated_at', { ascending: false })
  
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
    .single()
  
  if (error) {
    console.error('Error fetching item by UPC:', error)
    return null
  }
  
  return data
}

export async function createInventoryItem(item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from('inventory_items')
    .insert([item])
    .select()
    .single()
  
  if (error) {
    console.error('Error creating inventory item:', error)
    return null
  }
  
  return data
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | null> {
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

// Inventory Logs
export async function createInventoryLog(log: Omit<InventoryLog, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabase
    .from('inventory_logs')
    .insert([log])
  
  if (error) {
    console.error('Error creating inventory log:', error)
  }
}

export async function getInventoryLogs(itemId: string): Promise<InventoryLog[]> {
  const { data, error } = await supabase
    .from('inventory_logs')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching inventory logs:', error)
    return []
  }
  
  return data || []
}

// Update quantity with logging
export async function updateItemQuantity(
  itemId: string, 
  quantityChange: number, 
  action: 'add' | 'remove' | 'update'
): Promise<InventoryItem | null> {
  // Get current item
  const { data: currentItem, error: fetchError } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', itemId)
    .single()
  
  if (fetchError || !currentItem) {
    console.error('Error fetching item:', fetchError)
    return null
  }
  
  const newQuantity = action === 'update' ? quantityChange : currentItem.quantity + quantityChange
  
  // Update item
  const updatedItem = await updateInventoryItem(itemId, { quantity: newQuantity })
  
  if (!updatedItem) return null
  
  // Log the change
  await createInventoryLog({
    item_id: itemId,
    quantity_change: action === 'update' ? quantityChange - currentItem.quantity : quantityChange,
    quantity_after: newQuantity,
    action
  })
  
  return updatedItem
}

// Prediction Data
export async function getPredictionData(): Promise<PredictionData[]> {
  const { data, error } = await supabase
    .from('prediction_data')
    .select('*')
    .order('days_until_restock', { ascending: true })
  
  if (error) {
    console.error('Error fetching prediction data:', error)
    return []
  }
  
  return data || []
}

export async function updatePredictionData(itemId: string, predictionData: Omit<PredictionData, 'item_id'>): Promise<void> {
  const { error } = await supabase
    .from('prediction_data')
    .upsert([{ item_id: itemId, ...predictionData }])
  
  if (error) {
    console.error('Error updating prediction data:', error)
  }
}

// Calculate predictions based on consumption patterns
export async function calculatePredictions(): Promise<void> {
  const items = await getInventoryItems()
  
  for (const item of items) {
    const logs = await getInventoryLogs(item.id)
    
    if (logs.length < 2) continue
    
    // Calculate consumption rate (items per day)
    const consumptionLogs = logs.filter(log => log.quantity_change < 0)
    
    if (consumptionLogs.length < 2) continue
    
    const totalConsumed = consumptionLogs.reduce((sum, log) => sum + Math.abs(log.quantity_change), 0)
    const oldestLog = consumptionLogs[consumptionLogs.length - 1]
    const newestLog = consumptionLogs[0]
    
    const daysBetween = Math.max(1, 
      (new Date(newestLog.created_at).getTime() - new Date(oldestLog.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    const consumptionRate = totalConsumed / daysBetween
    const daysUntilRestock = consumptionRate > 0 ? item.quantity / consumptionRate : 999
    
    // Confidence score based on number of data points and consistency
    const confidenceScore = Math.min(1, consumptionLogs.length / 10)
    
    await updatePredictionData(item.id, {
      average_consumption_rate: consumptionRate,
      days_until_restock: Math.round(daysUntilRestock),
      confidence_score: confidenceScore,
      last_calculated: new Date().toISOString()
    })
  }
}
