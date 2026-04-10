"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  ShoppingBasket,
  ChevronRight,
  ChevronLeft,
  Users,
  MapPin,
  Heart,
  Plus,
  X,
  Loader2,
  CheckCircle,
} from "lucide-react"
import { DEFAULT_LOCATIONS } from "@/lib/default-locations"

const DIETARY_OPTIONS = [
  { id: "vegetarian", label: "Vegetarian", emoji: "🥦" },
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "gluten-free", label: "Gluten-Free", emoji: "🌾" },
  { id: "dairy-free", label: "Dairy-Free", emoji: "🥛" },
  { id: "nut-free", label: "Nut-Free", emoji: "🥜" },
  { id: "halal", label: "Halal", emoji: "☪️" },
  { id: "kosher", label: "Kosher", emoji: "✡️" },
]

// Display-only emoji mapping for the onboarding UI
const LOCATION_EMOJIS: Record<string, string> = {
  FRIDGE: "🧊",
  FREEZER: "❄️",
  PANTRY: "🏠",
  SPICE_RACK: "🌶️",
  COUNTER: "🪴",
  CELLAR: "🍷",
  OTHER: "📦",
}

export default function OnboardingPage() {
  const router = useRouter()
  const { update: updateSession } = useSession()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1: Profile
  const [name, setName] = useState("")
  const [householdSize, setHouseholdSize] = useState(1)

  // Step 2: Dietary
  const [dietary, setDietary] = useState<string[]>([])
  const [otherAllergies, setOtherAllergies] = useState("")

  // Step 3: Locations
  const [visibleSlugs, setVisibleSlugs] = useState<string[]>(DEFAULT_LOCATIONS.map((l) => l.slug))
  const [customLocations, setCustomLocations] = useState<{ name: string; color: string }[]>([])
  const [newLocationName, setNewLocationName] = useState("")

  function toggleDietary(id: string) {
    setDietary((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  function toggleLocation(slug: string) {
    setVisibleSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  function addCustomLocation() {
    const name = newLocationName.trim()
    if (!name) return
    setCustomLocations((prev) => [...prev, { name, color: "bg-gray-100 text-gray-800" }])
    setNewLocationName("")
  }

  async function handleFinish() {
    setSaving(true)
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          householdSize,
          dietaryRestrictions: dietary,
          otherAllergies: otherAllergies.trim() || undefined,
          visibleLocationSlugs: visibleSlugs,
          customLocations,
        }),
      })
      // Update the JWT session so middleware allows through
      await updateSession({ onboardingCompleted: true })
      router.push("/")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const totalSteps = 3

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
      {/* Header */}
      <div className="p-6 flex flex-col items-center">
        <div className="flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-3 shadow-lg">
          <ShoppingBasket className="w-8 h-8 text-primary-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Let&apos;s get you set up</p>

        {/* Progress dots */}
        <div className="flex gap-2 mt-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i + 1 === step ? "w-6 bg-primary" : i + 1 < step ? "w-2 bg-primary/50" : "w-2 bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-8 max-w-lg mx-auto w-full">
        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Your Household</h2>
              </div>
              <p className="text-sm text-muted-foreground">Tell us a bit about who&apos;s eating</p>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label>Your name (optional)</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex"
                    className="h-11"
                    autoFocus={false}
                  />
                </div>

                <div className="space-y-2">
                  <Label>How many people in your household?</Label>
                  <div className="flex items-center gap-4 pt-1">
                    <button
                      type="button"
                      onClick={() => setHouseholdSize(Math.max(1, householdSize - 1))}
                      className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-xl font-medium hover:bg-secondary/80 transition-colors"
                    >
                      −
                    </button>
                    <div className="text-center min-w-[3rem]">
                      <div className="text-3xl font-bold">{householdSize}</div>
                      <div className="text-xs text-muted-foreground">{householdSize === 1 ? "person" : "people"}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHouseholdSize(Math.min(20, householdSize + 1))}
                      className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-xl font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Dietary Restrictions */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Dietary Preferences</h2>
              </div>
              <p className="text-sm text-muted-foreground">We&apos;ll use this for recipe suggestions and meal planning</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DIETARY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleDietary(opt.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    dietary.includes(opt.id)
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-white shadow-sm hover:shadow"
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                  {dietary.includes(opt.id) && <CheckCircle className="w-4 h-4 text-primary ml-auto shrink-0" />}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Other allergies or restrictions</Label>
              <Input
                value={otherAllergies}
                onChange={(e) => setOtherAllergies(e.target.value)}
                placeholder="e.g. shellfish, soy, sesame..."
                className="h-11"
              />
            </div>
          </div>
        )}

        {/* Step 3: Locations */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Storage Locations</h2>
              </div>
              <p className="text-sm text-muted-foreground">Select the locations you use and add any custom ones</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_LOCATIONS.map((loc) => (
                <button
                  key={loc.slug}
                  type="button"
                  onClick={() => toggleLocation(loc.slug)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                    visibleSlugs.includes(loc.slug)
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-white/50 shadow-sm opacity-50"
                  }`}
                >
                  <span className="text-lg">{LOCATION_EMOJIS[loc.slug] ?? "📦"}</span>
                  <span className="text-sm font-medium flex-1">{loc.name}</span>
                  {visibleSlugs.includes(loc.slug) && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>

            {customLocations.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Custom</Label>
                <div className="flex flex-wrap gap-2">
                  {customLocations.map((loc, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full text-sm"
                    >
                      <span>{loc.name}</span>
                      <button
                        type="button"
                        onClick={() => setCustomLocations((prev) => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="Add custom location..."
                className="h-10 flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomLocation() } }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomLocation}
                disabled={!newLocationName.trim()}
                className="h-10 gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white border-t px-4 py-4 safe-bottom">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          {step < totalSteps ? (
            <Button
              className="flex-1 gap-2"
              onClick={() => setStep(step + 1)}
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              className="flex-1 gap-2"
              onClick={handleFinish}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up…
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Get started!
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
