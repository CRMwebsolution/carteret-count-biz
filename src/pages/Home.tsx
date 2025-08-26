import SearchBar from '../components/SearchBar'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ListingCard from '../components/ListingCard'

export default function Home(){
  const [latest, setLatest] = useState<any[]>([])

  useEffect(()=>{
    (async ()=>{
      const { data } = await supabase
        .from('listings')
        .select('id,name,city,badge')
        .eq('status','active')
        .order('updated_at', { ascending: false })
        .limit(8)
      setLatest(data || [])
    })()
  },[])

  return (
    <div>
      <section className="bg-gradient-to-br from-sky-100 to-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Find local businesses in Carteret County</h1>
          <p className="text-lg text-gray-600 mb-8">Simple categories, real businesses, no pay-to-win.</p>
          <SearchBar />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">New this week</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {latest.map((l)=>(
            <ListingCard key={l.id} id={l.id} name={l.name} city={l.city} badge={l.badge} />
          ))}
        </div>
      </section>
    </div>
  )
}
