// src/pages/AddBusiness.tsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../providers/AuthProvider' // ← use the global provider

type HoursDay = { open: string; close: string; is_closed: boolean }
type Hours = Record<string, HoursDay>

const defaultHours: Hours = {
  monday: { open: '09:00', close: '17:00', is_closed: false },
  tuesday: { open: '09:00', close: '17:00', is_closed: false },
  wednesday: { open: '09:00', close: '17:00', is_closed: false },
  thursday: { open: '09:00', close: '17:00', is_closed: false },
  friday: { open: '09:00', close: '17:00', is_closed: false },
  saturday: { open: '09:00', close: '17:00', is_closed: false },
  sunday: { open: '09:00', close: '17:00', is_closed: true },
}

/** Make filenames safe for URLs & storage (kept if you later add image uploads) */
function safeFilename(name: string) {
  const idx = name.lastIndexOf('.')
  const baseRaw = idx === -1 ? name : name.slice(0, idx)
  const ext = idx === -1 ? '' : name.slice(idx)
  const cleanedBase = baseRaw
    .normalize('NFKD')
    .replace(/[^\w\-]+/g, '-') // non-word to dash
    .replace(/-+/g, '-')       // collapse dashes
    .replace(/^-|-$/g, '')     // trim leading/trailing dashes
  return `${cleanedBase || 'file'}${ext}`
}

export default function AddBusiness() {
  const { user } = useAuth()

  const [form, setForm] = useState<any>({
    name: '',
    city: '',
    phone: '',
    website: '',
    email: '',
    description: '',
    address_line1: '',
    address_line2: '',
    state: 'NC',
    postal_code: '',
    price_level: 1,
    is_veteran_owned: false,
    is_family_owned: false,
    accepts_cards: true,
    offers_delivery: false,
    hours: defaultHours,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateHours(day: string, field: keyof HoursDay, value: any) {
    setForm((f: any) => ({
      ...f,
      hours: { ...f.hours, [day]: { ...f.hours[day], [field]: value } },
    }))
  }

  function normalizeWebsite(input: string) {
    if (!input) return ''
    const trimmed = input.trim()
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // ---- AUTH REQUIRED (RLS enforces this too) ----
      const { data: userData, error: getUserErr } = await supabase.auth.getUser()
      if (getUserErr || !userData?.user) {
        throw new Error('Please sign in to add a business.')
      }
      if (user && user.id !== userData.user.id) {
        throw new Error('Your session is stale. Please sign in again.')
      }

      // ---- 1) CREATE LISTING (explicitly set user_id to satisfy RLS) ----
      const listingInsert = {
        owner_id: userData.user.id, // ← important for RLS with_check
        name: form.name.trim(),
        city: form.city.trim() || null,
        phone: form.phone.trim() || null,
        website: normalizeWebsite(form.website) || null,
        email: form.email.trim() || null,
        description: form.description.trim() || null,
        address_line1: form.address_line1.trim() || null,
        address_line2: form.address_line2.trim() || null,
        state: form.state || 'NC',
        postal_code: form.postal_code.trim() || null,
        price_level: Number(form.price_level) || 1,
        is_veteran_owned: !!form.is_veteran_owned,
        is_family_owned: !!form.is_family_owned,
        accepts_cards: !!form.accepts_cards,
        offers_delivery: !!form.offers_delivery,
        hours: form.hours as Hours,
        // status defaults to 'pending' in DB; admin/payment will activate
      }

      const { data: listing, error: lerr } = await supabase
        .from('listings')
        .insert(listingInsert)
        .select('*')
        .single()

      if (lerr) {
        if (lerr.code === '42501') throw new Error('Permission denied by security policy. Please sign in and try again.')
        if (lerr.code === '23503') throw new Error('Your session may have expired. Please sign in again.')
        throw lerr
      }

      // ---- 2) CREATE CHECKOUT (PRODUCTION) ----
      const api = import.meta.env.VITE_API_BASE_URL
      if (!api) {
        throw new Error('Payment is not configured. Set VITE_API_BASE_URL in your environment.')
      }

      const res = await fetch(`${api}/api/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          amountCents: 300, // TODO: adjust pricing as needed
          description: `Basic listing fee for ${form.name}`,
          redirectUrl: window.location.origin + '/account',
        }),
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Failed to create checkout link. ${txt || ''}`.trim())
      }

      const { url } = await res.json()
      if (!url) throw new Error('Payment provider did not return a checkout URL.')
      window.location.href = url
    } catch (err: any) {
      console.error('Submission error:', err)
      if (err?.message?.includes('Please sign in')) {
        setError('Please sign in to add a business.')
      } else if (err?.code === '42501') {
        setError('Permission denied by security policy (RLS). Check that you are signed in.')
      } else if (err?.code === '23503') {
        setError('Session mismatch. Please sign in again and retry.')
      } else {
        setError(err?.message || 'Something went wrong. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-12">
      <h1 className="text-xl md:text-2xl font-bold mb-6">Add a Business</h1>

      {!user && (
        <div className="mb-4 rounded-xl border bg-amber-50 text-amber-800 p-3 text-sm">
          You must be signed in to add a listing.
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          required
          placeholder="Business name"
          className="w-full rounded-xl border px-4 py-3 text-base"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            placeholder="City"
            className="w-full rounded-xl border px-4 py-3 text-base"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <input
            placeholder="Phone"
            className="w-full rounded-xl border px-4 py-3 text-base"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border px-4 py-3 text-base"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            placeholder="Website (https://...)"
            className="w-full rounded-xl border px-4 py-3 text-base"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-medium">Address</h3>
          <input
            placeholder="Street Address"
            className="w-full rounded-xl border px-4 py-3 text-base"
            value={form.address_line1}
            onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
          />
          <input
            placeholder="Address Line 2 (optional)"
            className="w-full rounded-xl border px-4 py-3 text-base"
            value={form.address_line2}
            onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              className="w-full rounded-xl border px-4 py-3 text-base"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            >
              <option value="NC">North Carolina</option>
              <option value="SC">South Carolina</option>
              <option value="VA">Virginia</option>
            </select>
            <input
              placeholder="ZIP Code"
              className="w-full rounded-xl border px-4 py-3 text-base"
              value={form.postal_code}
              onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
            />
            <select
              className="w-full rounded-xl border px-4 py-3 text-base"
              value={form.price_level}
              onChange={(e) => setForm({ ...form, price_level: parseInt(e.target.value) })}
            >
              <option value={1}>$ - Budget</option>
              <option value={2}>$$ - Moderate</option>
              <option value={3}>$$$ - Expensive</option>
              <option value={4}>$$$$ - Very Expensive</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-medium">Hours of Operation</h3>
          <div className="space-y-2">
            {Object.entries(form.hours as Hours).map(([day, dayHours]) => (
              <div key={day} className="flex items-center gap-3 p-3 border rounded-xl">
                <div className="w-20 text-sm font-medium capitalize">{day}</div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={dayHours.is_closed}
                    onChange={(e) => updateHours(day, 'is_closed', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Closed</span>
                </label>
                {!dayHours.is_closed && (
                  <>
                    <input
                      type="time"
                      value={dayHours.open}
                      onChange={(e) => updateHours(day, 'open', e.target.value)}
                      className="rounded border px-2 py-1 text-sm"
                    />
                    <span className="text-sm text-gray-500">to</span>
                    <input
                      type="time"
                      value={dayHours.close}
                      onChange={(e) => updateHours(day, 'close', e.target.value)}
                      className="rounded border px-2 py-1 text-sm"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-medium">Business Attributes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={form.is_veteran_owned}
                onChange={(e) => setForm({ ...form, is_veteran_owned: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Veteran Owned</span>
            </label>
            <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={form.is_family_owned}
                onChange={(e) => setForm({ ...form, is_family_owned: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Family Owned</span>
            </label>
            <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={form.accepts_cards}
                onChange={(e) => setForm({ ...form, accepts_cards: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Accepts Cards</span>
            </label>
            <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={form.offers_delivery}
                onChange={(e) => setForm({ ...form, offers_delivery: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Offers Delivery</span>
            </label>
          </div>
        </div>

        <textarea
          placeholder="Short description"
          className="w-full rounded-xl border px-4 py-3 min-h-28 text-base resize-y"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          disabled={loading || !user}
          className="w-full sm:w-auto rounded-xl bg-brand text-white px-5 py-3 hover:bg-brand-dark disabled:opacity-50 text-base font-medium"
        >
          {loading ? 'Processing…' : 'Continue to Payment'}
        </button>
      </form>

      <p className="text-sm text-gray-500 mt-4">
        A small fee helps keep spam out. Your listing will go live after payment is confirmed.
      </p>
    </div>
  )
}
