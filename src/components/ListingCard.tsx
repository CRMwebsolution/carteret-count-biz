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
    <Link to={`/listing/${id}`} className="group rounded-2xl border bg-white hover:shadow-md transition overflow-hidden">
      <div className="aspect-[16/9] bg-gray-100">
        {photoUrl ? <img src={photoUrl} alt={name} className="w-full h-full object-cover" /> : null}
      </div>
      <div className="p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold group-hover:text-brand">{name}</h3>
          {city ? <p className="text-sm text-gray-500">{city}</p> : null}
        </div>
        {badge === 'verified' && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Verified</span>}
      </div>
    </Link>
  )
}
