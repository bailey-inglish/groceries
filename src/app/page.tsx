import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { seedDefaultLocations } from "@/lib/locations"
import { InventoryDashboard } from "@/components/inventory-dashboard"
import { Suspense } from "react"

export default async function HomePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/signin")

  await seedDefaultLocations(session.user.id)

  const userName = session.user.name || session.user.email || "User"

  return (
    <Suspense>
      <InventoryDashboard userName={userName} />
    </Suspense>
  )
}
