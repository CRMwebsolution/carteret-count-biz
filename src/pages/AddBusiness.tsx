import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const MOCK = import.meta.env.VITE_MOCK_PAYMENTS === 'true'

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
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function updateHours(day: string, field: keyof HoursDay, value: any) {
    setForm((f: any) => ({
      ...f,
      hours: { ...f.hours, [day]: { ...f.hours[day], [field]: value } },
    }))
  }

  // Small helper
  function normalizeWebsite(input: string) {
    if (!input) return ''
    const trimmed = input.trim()
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // ---- AUTH REQUIRED (matches production RLS) ----
      const { data: userData, error: getUserErr } = await supabase.auth.getUser()
      if (getUserErr || !userData?.user) {
        throw new Error('Please sign in to add a business.')
      }

      // Optional: sanity check our hook vs Supabase
      if (user && user.id !== userData.user.id) {
        throw new Error('Your session is stale. Please sign in again.')
      }

      // ---- 1) CREATE LISTING (DB trigger fills owner_id + status='pending') ----
      const listingInsert = {
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
        // DO NOT send owner_id or status; trigger handles these
      }

      const { data: listing, error: lerr } = await supabase
        .from('listings')
        .insert(listingInsert)
        .select('*')
        .single()

      if (lerr) {
        // Common RLS codes
        if (lerr.code === '42501') {
          throw new Error('Permission denied by security policy. Please sign in and try again.')
        }
        // FK protection (shouldn’t happen with our trigger)
        if (lerr.code === '23503') {
          throw new Error('Your session may have expired. Please sign in again.')
        }
        throw lerr
      }

      // ---- 2) UPLOAD PHOTO (optional) ----
      if (photo) {
        const path = `${listing.id}/${crypto.randomUUID()}-${photo.name}`
        const { error: perr } = await supabase
          .storage
          .from('listing-photos')
          .upload(path, photo, {
            upsert: false,
            cacheControl: '3600',
            contentType: photo.type || 'image/jpeg',
          })
        if (perr) {
          // If filename collision (rare), try once more with a new UUID
          if ((perr as any)?.statusCode === '409') {
            const retryPath = `${listing.id}/${crypto.randomUUID()}-${photo.name}`
            const { error: perr2 } = await supabase
              .storage
              .from('listing-photos')
              .upload(retryPath, photo, {
                upsert: false,
                cacheControl: '3600',
                contentType: photo.type || 'image/jpeg',
              })
            if (perr2) throw perr2
            await supabase.from('photos').insert({
              listing_id: listing.id,
              storage_path: retryPath,
              is_primary: true,
            })
          } else {
            throw perr
          }
        } else {
          await supabase.from('photos').insert({
            listing_id: listing.id,
            storage_path: path,
            is_primary: true,
          })
        }
      }

      // ---- 3) PAYMENT (mock or real) ----
      if (MOCK) {
        await supabase.from('listings').update({ status: 'active' }).eq('id', listing.id)
        setSuccess('Listing created and activated (demo mode).')
        setLoading(false)
        return
      } else {
        const api = import.meta.env.VITE_API_BASE_URL
        if (!api) {
          setSuccess('Listing created. Awaiting payment configuration.')
          setLoading(false)
          return
        }
        const res = await fetch(`${api}/api/create-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingId: listing.id,
            amountCents: 300,
            description: `Basic listing fee for ${form.name}`,
            redirectUrl: window.location.origin + '/account',
          }),
        })
        if (!res.ok) throw new Error('Failed to create checkout link')
        const { url } = await res.json()
        window.location.href = url
        return
      }
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

      {MOCK && (
        <div className="mb-4 rounded-xl border bg-yellow-50 text-yellow-800 p-3 text-sm">
          Demo mode is active (VITE_MOCK_PAYMENTS=true). Submissions activate without payment.
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
              <optio
