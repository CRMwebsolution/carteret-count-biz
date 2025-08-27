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
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2">
          <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden">
            {photos[0] && (
              <img 
                src={storageUrl('listing-photos', photos[0].storage_path)} 
                className="w-full h-full object-cover" 
                alt={data.name}
              />
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {photos.slice(1).map(p => (
              <img 
                key={p.id} 
                src={storageUrl('listing-photos', p.storage_path)} 
                className="rounded-lg aspect-video object-cover" 
                alt={`${data.name} photo`}
              />
            ))}
          </div>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <h1 className="text-xl md:text-2xl font-bold">{data.name}</h1>
          {data.badge === 'verified' && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Verified</span>}
          {data.description && (
            <p className="text-gray-700 text-sm md:text-base leading-relaxed">{data.description}</p>
          )}
          
          {/* Address Information */}
          {(data.address_line1 || data.city) && (
            <div className="text-gray-700 text-sm md:text-base">
              {data.address_line1 && <div>{data.address_line1}</div>}
              {data.city && <div>{data.city}</div>}
            </div>
          )}
          
          {/* Email */}
          {data.email && (
            <a 
              className="text-brand hover:underline text-sm md:text-base" 
              href={`mailto:${data.email}`}
            >
              {data.email}
            </a>
          )}
          
          {/* Hours */}
          {data.hours && (
            <div className="text-gray-700 text-sm md:text-base">
              <div className="font-medium mb-1">Hours:</div>
              <div className="text-sm">{JSON.stringify(data.hours)}</div>
            </div>
          )}
          
          {/* Price Level */}
          {data.price_level && (
            <div className="text-gray-700 text-sm md:text-base">
              <span className="font-medium">Price Level: </span>
              {'$'.repeat(data.price_level)}
            </div>
          )}
          
          {/* Business Attributes */}
          <div className="flex flex-wrap gap-2">
            {data.is_veteran_owned && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                Veteran Owned
              </span>
            )}
            {data.is_family_owned && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                Family Owned
              </span>
            )}
            {data.accepts_cards && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                Accepts Cards
              </span>
            )}
            {data.offers_delivery && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                Offers Delivery
              </span>
            )}
          </div>
          
          {data.phone && (
            <a 
              className="block rounded-xl border px-4 py-3 hover:bg-gray-50 text-center sm:text-left transition-colors" 
              href={`tel:${data.phone}`}
            >
              Call {data.phone}
            </a>
          )}
          {data.website && (
            <a 
              className="block rounded-xl border px-4 py-3 hover:bg-gray-50 text-center sm:text-left transition-colors" 
              target="_blank" 
              rel="noopener noreferrer"
              href={data.website}
            >
              Visit Website
            </a>
          )}
          <Link 
            to={`/verify/${data.id}`} 
            className="block rounded-xl bg-brand text-white px-4 py-3 text-center hover:bg-brand-dark transition-colors font-medium"
          >
            Claim or Verify
          </Link>
        </aside>
      </div>
    </div>
  )
}
