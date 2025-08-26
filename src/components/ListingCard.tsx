import { Link } from 'react-router-dom'

type Props = {
  id: string
  name: string
  city?: string
  photoUrl?: string
  badge?: 'unverified' | 'verified' | 'sponsor'
}

export default function ListingCard({ id, name, city, photoUrl, badge='unverified'}: Props){
  return (
    <Link to={`/listing/${id}`} className="group rounded-2xl border bg-white hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="aspect-[16/9] bg-gray-100">
        {photoUrl ? (
          <img 
            src={photoUrl} 
            alt={name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-3 md:p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold group-hover:text-brand transition-colors text-sm md:text-base line-clamp-2">{name}</h3>
          {city ? <p className="text-xs md:text-sm text-gray-500 mt-1">{city}</p> : null}
        </div>
        {badge === 'verified' && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap ml-2">
            Verified
          </span>
        )}
      </div>
    </Link>
  )
}
