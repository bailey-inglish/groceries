"use client"

import { useState, useEffect } from "react"

export interface UserLocation {
  id: string
  name: string
  slug: string
  color: string
  isDefault: boolean
  isVisible: boolean
  sortOrder: number
}

export function useLocations() {
  const [locations, setLocations] = useState<UserLocation[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchLocations() {
    try {
      const res = await fetch("/api/locations")
      const data = await res.json()
      setLocations(data.locations || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLocations()
  }, [])

  const visibleLocations = locations.filter((location) => location.isVisible)
  const locationMap = Object.fromEntries(locations.map((l) => [l.slug, l]))

  function getColor(slug: string): string {
    return locationMap[slug]?.color || "bg-gray-100 text-gray-800"
  }

  function getLabel(slug: string): string {
    return locationMap[slug]?.name || slug.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return { locations: visibleLocations, allLocations: locations, loading, getColor, getLabel, refetch: fetchLocations }
}
