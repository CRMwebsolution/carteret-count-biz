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
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-16 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">Find local businesses in Carteret County</h1>
          <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8 px-2">Simple categories, real businesses, no pay-to-win.</p>
          <SearchBar />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-semibold">New this week</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {latest.map((l)=>(
            <ListingCard key={l.id} id={l.id} name={l.name} city={l.city} badge={l.badge} />
          ))}
        </div>
      </section>
    </div>
  )
}
