import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import ListingCard from '../components/ListingCard'

export default function Categories(){
  const [listings, setListings] = useState<any[]>([])
  const [q, setQ] = useState<string>('')
  const [cat, setCat] = useState<string>('')

  useEffect(()=>{
    const params = new URLSearchParams(window.location.search)
    const qp = params.get('q') || ''
    const cp = params.get('category') || ''
    setQ(qp)
    setCat(cp)
    ;(async ()=>{
      let query = supabase.from('listings').select('id,name,city,badge,status').eq('status','active')
      if(qp) query = query.ilike('name', `%${qp}%`)
      const { data } = await query.limit(24)
      setListings(data || [])
    })()
  },[])

  const filtered = useMemo(()=> listings, [listings])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <input 
          value={q} 
          onChange={(e)=>setQ(e.target.value)} 
          placeholder="Search businesses..." 
          className="flex-1 rounded-xl border px-4 py-3 shadow-sm text-base"
        />
        <select 
          value={cat} 
          onChange={(e)=>setCat(e.target.value)} 
          className="rounded-xl border px-4 py-3 shadow-sm min-w-0 sm:min-w-[200px]"
        >
          <option value="">All categories</option>
          <option value="restaurants">Restaurants & Food</option>
          <option value="home-services">Home Services</option>
          <option value="auto-marine">Auto & Marine</option>
          <option value="health-wellness">Health & Wellness</option>
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filtered.map((l)=>(<ListingCard key={l.id} id={l.id} name={l.name} city={l.city} badge={l.badge} />))}
      </div>
    </div>
  )
}
