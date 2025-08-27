// src/pages/AddBusiness.tsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { getCurrentUser } from '../lib/auth'

const MOCK = import.meta.env.VITE_MOCK_PAYMENTS === 'true'

export default function AddBusiness(){
  const { user } = useAuth()
  const [form, setForm] = useState<any>({ 
    name: '', 
    city: '', 
    phone: '', 
    website: '', 
    description: '',
    email: '',
    address_line1: '',
    address_line2: '',
    state: 'NC',
    postal_code: '',
    price_level: 1,
    is_veteran_owned: false,
    is_family_owned: false,
    accepts_cards: true,
    offers_delivery: false,
    hours: {
      monday: { open: '09:00', close: '17:00', is_closed: false },
      tuesday: { open: '09:00', close: '17:00', is_closed: false },
      wednesday: { open: '09:00', close: '17:00', is_closed: false },
      thursday: { open: '09:00', close: '17:00', is_closed: false },
      friday: { open: '09:00', close: '17:00', is_closed: false },
      saturday: { open: '09:00', close: '17:00', is_closed: false },
      sunday: { open: '09:00', close: '17:00', is_closed: true }
    }
  })
  const [photo, setPhoto] = useState<File|null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string| null>(null)
  const [success, setSuccess] = useState<string| null>(null)

  function updateHours(day: string, field: string, value: any) {
    setForm({
      ...form,
      hours: {
        ...form.hours,
        [day]: {
          ...form.hours[day],
          [field]: value
        }
      }
    })
  }

  async function handleSubmit(e: React.FormEvent){
    e.preventDefault()
    setLoading(true)
    setError(null); setSuccess(null)
    try{
      // Proactively validate user session if user is logged in
      let validUserId = null
      if (user) {
        console.log('User from useAuth:', user)
        
        try {
          const { data, error: getUserError } = await supabase.auth.getUser()
          console.log('Supabase getUser data:', data)
          console.log('Supabase getUser error:', getUserError)
          
          const freshUser = data?.user ? {
            id: data.user.id,
            email: data.user.email ?? undefined,
            phone: data.user.phone ?? undefined,
            ...data.user.user_metadata,
          } : null
          
          console.log('Fresh user after processing:', freshUser)
          
          if (!freshUser || freshUser.id !== user.id) {
            console.log('Session validation failed - freshUser:', freshUser, 'user.id:', user.id)
            setError('Your session has expired. Please sign in again.')
            setLoading(false)
            return
          }
          validUserId = freshUser.id
        } catch (sessionError) {
          console.error('Error during session validation:', sessionError)
          setError('Your session has expired. Please sign in again.')
          setLoading(false)
          return
        }
      }

      // 1) create listing (pending)
      const listingData = {
        name: form.name,
        city: form.city,
        phone: form.phone,
        website: form.website,
        description: form.description,
        email: form.email,
        address_line1: form.address_line1,
        address_line2: form.address_line2,
        state: form.state,
        postal_code: form.postal_code,
        price_level: form.price_level,
        is_veteran_owned: form.is_veteran_owned,
        is_family_owned: form.is_family_owned,
        accepts_cards: form.accepts_cards,
        offers_delivery: form.offers_delivery,
        hours: form.hours,
        status: 'pending',
        ...(validUserId && { owner_id: validUserId }),
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
      console.error('Submission error:', err)
      console.error(err)
      
      // Check for foreign key constraint violation (stale user session)
      if (err.code === '23503' && err.message?.includes('listings_owner_id_fkey')) {
        setError('Your session has expired. Please sign in again.')
      } else {
        setError(err.message || 'Something went wrong')
      }
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border px-4 py-3 text-base"
            value={form.email}
            onChange={e=>setForm({...form, email:e.target.value})}
          />
          <input
            placeholder="Website (https://...)"
            className="w-full rounded-xl border px-4 py-3 text-base"
            value={form.website}
            onChange={e=>setForm({...form, website:e.target.value})}
          />
        </div>
        
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Address</h3>
          <input
            placeholder="Street Address"
            className="w-full rounded-xl border px-4 py-3 text-base"
            value={form.address_line1}
            onChange={e=>setForm({...form, address_line1:e.target.value})}
          />
          <input
            placeholder="Address Line 2 (optional)"
            className="w-full rounded-xl border px-4 py-3 text-base"
            value={form.address_line2}
            onChange={e=>setForm({...form, address_line2:e.target.value})}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              className="w-full rounded-xl border px-4 py-3 text-base"
              value={form.state}
              onChange={e=>setForm({...form, state:e.target.value})}
            >
              <option value="NC">North Carolina</option>
              <option value="SC">South Carolina</option>
              <option value="VA">Virginia</option>
            </select>
            <input
              placeholder="ZIP Code"
              className="w-full rounded-xl border px-4 py-3 text-base"
              value={form.postal_code}
              onChange={e=>setForm({...form, postal_code:e.target.value})}
            />
            <select
              className="w-full rounded-xl border px-4 py-3 text-base"
              value={form.price_level}
              onChange={e=>setForm({...form, price_level:parseInt(e.target.value)})}
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
            {Object.entries(form.hours).map(([day, dayHours]: [string, any]) => (
              <div key={day} className="flex items-center gap-3 p-3 border rounded-xl">
                <div className="w-20 text-sm font-medium capitalize">{day}</div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={dayHours.is_closed}
                    onChange={e => updateHours(day, 'is_closed', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Closed</span>
                </label>
                {!dayHours.is_closed && (
                  <>
                    <input
                      type="time"
                      value={dayHours.open}
                      onChange={e => updateHours(day, 'open', e.target.value)}
                      className="rounded border px-2 py-1 text-sm"
                    />
                    <span className="text-sm text-gray-500">to</span>
                    <input
                      type="time"
                      value={dayHours.close}
                      onChange={e => updateHours(day, 'close', e.target.value)}
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
                onChange={e=>setForm({...form, is_veteran_owned:e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">Veteran Owned</span>
            </label>
            <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={form.is_family_owned}
                onChange={e=>setForm({...form, is_family_owned:e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">Family Owned</span>
            </label>
            <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={form.accepts_cards}
                onChange={e=>setForm({...form, accepts_cards:e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">Accepts Cards</span>
            </label>
            <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={form.offers_delivery}
                onChange={e=>setForm({...form, offers_delivery:e.target.checked})}
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
