import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase, storageUrl } from '../lib/supabase'

export default function Listing(){
  const { id } = useParams()
  const [data, setData] = useState<any|null>(null)
  const [photos, setPhotos] = useState<any[]>([])

  useEffect(()=>{
    if(!id) return
    ;(async ()=>{
      const { data } = await supabase.from('listings').select('*').eq('id', id).single()
      setData(data)
      const { data: ph } = await supabase.from('photos').select('*').eq('listing_id', id).limit(10)
      setPhotos(ph || [])
    })()
  },[id])

  if(!data) return <div className="max-w-6xl mx-auto px-4 py-12">Loading...</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden">
            {photos[0] && <img src={storageUrl('listing-photos', photos[0].storage_path)} className="w-full h-full object-cover" />}
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {photos.slice(1).map(p => (
              <img key={p.id} src={storageUrl('listing-photos', p.storage_path)} className="rounded-lg aspect-video object-cover" />
            ))}
          </div>
        </div>
        <aside className="space-y-4">
          <h1 className="text-2xl font-bold">{data.name}</h1>
          {data.badge === 'verified' && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Verified</span>}
          {data.phone && <a className="block rounded-xl border px-4 py-3 hover:bg-gray-50" href={`tel:${data.phone}`}>Call {data.phone}</a>}
          {data.website && <a className="block rounded-xl border px-4 py-3 hover:bg-gray-50" target="_blank" href={data.website}>Visit Website</a>}
          <Link to={`/verify/${data.id}`} className="block rounded-xl bg-brand text-white px-4 py-3 text-center hover:bg-brand-dark">Claim or Verify</Link>
        </aside>
      </div>
    </div>
  )
}
