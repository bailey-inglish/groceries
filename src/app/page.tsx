import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Package,
  AlertTriangle,
  ScanLine,
  TrendingDown,
  Clock,
  Calendar,
} from "lucide-react"
import { getExpiringItems, getItemsRunningLow } from "@/lib/predictions"
import { seedDefaultLocations } from "@/lib/locations"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/signin")

  const userId = session.user.id

  // Seed default locations for new users if needed
  await seedDefaultLocations(userId)

  const [locationCounts, recentActivity, expiringItems, lowItems, totalItems, userLocations, nudgeItems] = await Promise.all([
    prisma.inventoryItem.groupBy({
      by: ["location"],
      where: { userId },
      _count: { location: true },
    }),
    prisma.stockEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { inventoryItem: { select: { name: true } } },
    }),
    getExpiringItems(userId, 7),
    getItemsRunningLow(userId),
    prisma.inventoryItem.count({ where: { userId } }),
    prisma.userLocation.findMany({
      where: { userId, isVisible: true },
      orderBy: [{ sortOrder: "asc" }],
    }),
    // Quantity nudge items: packageSize known, quantity < 10% of package
    prisma.inventoryItem.findMany({
      where: {
        userId,
        packageSize: { not: null },
      },
      select: { id: true, name: true, quantity: true, unit: true, packageSize: true, packageUnit: true, updatedAt: true },
    }).then((items) =>
      items.filter(
        (i) =>
          i.packageSize! > 0 &&
          i.quantity / i.packageSize! < 0.1 &&
          // Only nudge if updated in the last 72 hours (avoid stale items)
          Date.now() - new Date(i.updatedAt).getTime() < 72 * 60 * 60 * 1000
      ).slice(0, 3)
    ),
  ])

  // Build a slug → color map from user locations
  const locationColorMap: Record<string, string> = Object.fromEntries(
    userLocations.map((l) => [l.slug, l.color])
  )
  const locationLabelMap: Record<string, string> = Object.fromEntries(
    userLocations.map((l) => [l.slug, l.name])
  )

  const userInitials = session.user.name
    ? session.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : session.user.email?.slice(0, 2).toUpperCase() ?? "U"

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{greeting}! 👋</h1>
            <p className="text-sm text-muted-foreground">{session.user.name || session.user.email}</p>
          </div>
          <Link href="/settings">
            <Avatar className="w-10 h-10 cursor-pointer ring-2 ring-primary/20 hover:ring-primary transition-all">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{totalItems}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Items</div>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm ${expiringItems.length > 0 ? "bg-red-50" : ""}`}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${expiringItems.length > 0 ? "text-red-600" : "text-foreground"}`}>
                {expiringItems.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Expiring</div>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm ${lowItems.length > 0 ? "bg-yellow-50" : ""}`}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${lowItems.length > 0 ? "text-yellow-600" : "text-foreground"}`}>
                {lowItems.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Running Low</div>
            </CardContent>
          </Card>
        </div>

        <Link href="/scan">
          <Card className="border-0 shadow-sm bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors mt-2">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-primary-foreground/20 rounded-xl">
                <ScanLine className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold text-base">Scan a Product</div>
                <div className="text-sm opacity-80">Add or update items quickly</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/meal-plan">
          <Card className="border-0 shadow-sm bg-violet-600 text-white cursor-pointer hover:bg-violet-700 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold text-base">Meal Planner</div>
                <div className="text-sm opacity-80">Plan your week&apos;s meals</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {nudgeItems.length > 0 && (
          <Card className="border-0 shadow-sm border-l-4 border-l-amber-400 bg-amber-50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                <TrendingDown className="w-4 h-4" />
                Almost Empty — confirm quantities
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1">
              {nudgeItems.map((item) => {
                const pct = Math.round((item.quantity / item.packageSize!) * 100)
                return (
                  <Link href="/inventory" key={item.id}>
                    <div className="flex items-center justify-between py-2 border-b border-amber-200 last:border-0">
                      <span className="text-sm font-medium text-amber-900 truncate">{item.name}</span>
                      <Badge className="bg-amber-200 text-amber-900 text-xs shrink-0">{pct}% left</Badge>
                    </div>
                  </Link>
                )
              })}
            </CardContent>
          </Card>
        )}

        {(expiringItems.length > 0 || lowItems.length > 0) && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1">
              {expiringItems.slice(0, 3).map((item) => {
                const daysLeft = Math.ceil(
                  (new Date(item.expirationDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )
                return (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-sm font-medium truncate">{item.name}</span>
                    </div>
                    <Badge variant="destructive" className="text-xs shrink-0">
                      {daysLeft === 0 ? "Today" : `${daysLeft}d`}
                    </Badge>
                  </div>
                )
              })}
              {lowItems.slice(0, 3).map((item) => (
                <div key={item.itemId} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-yellow-500 shrink-0" />
                    <span className="text-sm font-medium truncate">{item.itemName}</span>
                  </div>
                  <Badge variant="warning" className="text-xs shrink-0">
                    {item.currentQuantity} {item.unit}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">Storage Overview</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {locationCounts.length === 0 ? (
              <div className="text-center py-6">
                <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No items yet. Start scanning!</p>
                <Link href="/scan">
                  <Button size="sm" className="mt-3">Add your first item</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {locationCounts.map((loc) => (
                  <Link href={`/inventory?location=${loc.location}`} key={loc.location}>
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${locationColorMap[loc.location] || "bg-gray-100 text-gray-800"} cursor-pointer hover:opacity-80 transition-opacity`}>
                      <Package className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold capitalize truncate">
                          {locationLabelMap[loc.location] || loc.location.replace(/_/g, " ").toLowerCase()}
                        </div>
                        <div className="text-xs opacity-70">{loc._count.location} items</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {recentActivity.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1">
              {recentActivity.map((event) => (
                <div key={event.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      event.eventType === "SCAN_IN" ? "bg-green-500" :
                      event.eventType === "SCAN_OUT" ? "bg-red-500" : "bg-blue-500"
                    }`} />
                    <span className="text-sm truncate">{event.inventoryItem.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium ${
                      event.eventType === "SCAN_IN" ? "text-green-600" :
                      event.eventType === "SCAN_OUT" ? "text-red-600" : "text-blue-600"
                    }`}>
                      {event.eventType === "SCAN_IN" ? "+" : ""}{Math.abs(event.quantityChange)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
