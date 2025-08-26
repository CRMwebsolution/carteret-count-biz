// src/pages/AddBusiness.tsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const MOCK = import.meta.env.VITE_MOCK_PAYMENTS === 'true'

export default function AddBusiness(){
  const { user } = useAuth()
  const [form, setForm] = useState<any>({ name: '', city: '', phone: '', website: '', description: '' })
  const [photo, setPhoto] = useState<File|null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string| null>(null)
  const [success, setSuccess] = useState<string| null>(null)

  async function handleSubmit(e: React.FormEvent){
    e.preventDefault()
    setLoading(true)
    setError(null); setSuccess(null)
    try{
      // 1) create listing (pending)
      const listingData = {
        name: form.name,
        city: form.city,
        phone: form.phone,
        website: form.website,
        description: form.description,
        status: 'pending',
        ...(user && { owner_id: user.id }),
      }

      const { data: listing, error: lerr } = await supabase
        .from('listings')
        .insert(listingData)
        .select()
        .single()
      if(lerr) throw lerr

      // 2) upload photo (optional) - path MUST start with the listing UUID
      if(photo){
        const path = `${listing.id}/${crypto.randomUUID()}-${photo.name}`
        const { error: perr } = await supabase.storage.from('listing-photos').upload(path, photo)
        if(perr) throw perr
        await supabase.from('photos').insert({ listing_id: listing.id, storage_path: path, is_primary: true })
      }

      if(MOCK){
        // Demo mode: activate immediately without real payments
        await supabase.from('listings').update({ status: 'active' }).eq('id', listing.id)
        setSuccess('Listing created and activated (demo mode).')
        setLoading(false)
        return
      }

      // 3) real server checkout (requires your own server)
      const res = await fetch(import.meta.env.VITE_API_BASE_URL + '/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          amountCents: 300,
          description: `Basic listing fee for ${form.name}`,
          redirectUrl: window.location.origin + '/account'
        })
      })
      if(!res.ok) throw new Error('Failed to create checkout link')
      const { url } = await res.json()
      window.location.href = url
    }catch(err:any){
      console.error(err)
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-12">
      <h1 className="text-xl md:text-2xl font-bold mb-6">Add a Business</h1>
      {MOCK && <div className="mb-4 rounded-xl border bg-yellow-50 text-yellow-800 p-3 text-sm">Demo mode is active (VITE_MOCK_PAYMENTS=true). Submissions are auto-activated with no payment.</div>}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          required
          placeholder="Business name"
          className="w-full rounded-xl border px-4 py-3 text-base"
          value={form.name}
          onChange={e=>setForm({...form, name:e.target.value})}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            placeholder="City"
            className="w-full rounded-xl border px-4 py-3 text-base"
            value={form.city}
            onChange={e=>setForm({...form, city:e.target.value})}
          />
          <input
            placeholder="Phone"
            className="w-full rounded-xl border px-4 py-3 text-base"
            value={form.phone}
            onChange={e=>setForm({...form, phone:e.target.value})}
          />
        </div>
        <input
          placeholder="Website (https://...)"
          className="w-full rounded-xl border px-4 py-3 text-base"
          value={form.website}
          onChange={e=>setForm({...form, website:e.target.value})}
        />
        <textarea
          placeholder="Short description"
          className="w-full rounded-xl border px-4 py-3 min-h-28 text-base resize-y"
          value={form.description}
          onChange={e=>setForm({...form, description:e.target.value})}
        />
        <div>
          <label className="text-sm text-gray-600 block mb-1">Primary photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            className="w-full text-base"
            onChange={e=>setPhoto(e.target.files?.[0] || null)}
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-700 text-sm">{success}</p>}
        <button
          disabled={loading}
          className="w-full sm:w-auto rounded-xl bg-brand text-white px-5 py-3 hover:bg-brand-dark disabled:opacity-50 text-base font-medium"
        >
          {loading ? 'Processing…' : (MOCK ? 'Create (Demo Mode)' : 'Continue to Payment')}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4">A small fee helps keep spam out. Your listing will go live after payment (or instantly in demo mode).</p>
    </div>
  )
}
