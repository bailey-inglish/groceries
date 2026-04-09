"use client"

import { useState, useEffect } from "react"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  User,
  Key,
  LogOut,
  Save,
  Loader2,
  CheckCircle,
  Users,
} from "lucide-react"

const DIETARY_OPTIONS = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "gluten-free", label: "Gluten-Free" },
  { id: "dairy-free", label: "Dairy-Free" },
  { id: "nut-free", label: "Nut-Free" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
]

interface Settings {
  id: string
  email: string
  name?: string
  householdSize: number
  dietaryRestrictions: string[]
  hasOpenAiKey: boolean
  openAiKey: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name: "",
    householdSize: 1,
    dietaryRestrictions: [] as string[],
    openAiKey: "",
  })

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data)
        setForm({
          name: data.name || "",
          householdSize: data.householdSize || 1,
          dietaryRestrictions: data.dietaryRestrictions || [],
          openAiKey: "",
        })
        setLoading(false)
      })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        householdSize: form.householdSize,
        dietaryRestrictions: form.dietaryRestrictions,
      }
      if (form.openAiKey) {
        payload.openAiKey = form.openAiKey
      }

      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      setSaved(true)
      setForm((prev) => ({ ...prev, openAiKey: "" }))
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  function toggleDietary(id: string) {
    setForm((prev) => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(id)
        ? prev.dietaryRestrictions.filter((d) => d !== id)
        : [...prev.dietaryRestrictions, id],
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-lg mx-auto px-4 py-4">
            <Skeleton className="h-7 w-24" />
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {/* Profile */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  value={settings?.email || ""}
                  disabled
                  className="h-11 bg-muted"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Display Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  className="h-11"
                />
              </div>
            </CardContent>
          </Card>

          {/* Household */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Household
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Household Size</Label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, householdSize: Math.max(1, form.householdSize - 1) })}
                    className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 text-lg font-medium"
                  >
                    −
                  </button>
                  <span className="text-xl font-bold min-w-[2rem] text-center">
                    {form.householdSize}
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, householdSize: Math.min(20, form.householdSize + 1) })}
                    className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 text-primary-foreground text-lg font-medium"
                  >
                    +
                  </button>
                  <span className="text-sm text-muted-foreground ml-2">
                    {form.householdSize === 1 ? "person" : "people"}
                  </span>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="block mb-3">Dietary Restrictions</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DIETARY_OPTIONS.map((opt) => (
                    <div
                      key={opt.id}
                      className="flex items-center gap-2 p-3 rounded-lg border hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => toggleDietary(opt.id)}
                    >
                      <Checkbox
                        id={opt.id}
                        checked={form.dietaryRestrictions.includes(opt.id)}
                        onCheckedChange={() => toggleDietary(opt.id)}
                      />
                      <label
                        htmlFor={opt.id}
                        className="text-sm cursor-pointer"
                      >
                        {opt.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* OpenAI */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                AI Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Add your OpenAI API key to enable AI-powered recipe suggestions.
              </p>
              <div className="space-y-1.5">
                <Label>OpenAI API Key</Label>
                <Input
                  type="password"
                  value={form.openAiKey}
                  onChange={(e) => setForm({ ...form, openAiKey: e.target.value })}
                  placeholder={settings?.hasOpenAiKey ? "••••••••••••• (already set)" : "sk-..."}
                  className="h-11 font-mono"
                />
              </div>
              {settings?.hasOpenAiKey && (
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <CheckCircle className="w-3.5 h-3.5" />
                  API key is configured
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Your key is stored securely and only used for recipe suggestions.
              </p>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-medium gap-2"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>

          {/* Sign Out */}
          <Card className="border-0 shadow-sm border-destructive/20">
            <CardContent className="p-4">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="flex items-center gap-2 text-destructive text-sm font-medium w-full hover:opacity-80 transition-opacity"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
