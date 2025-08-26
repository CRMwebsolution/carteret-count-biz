import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SearchBar() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  return (
    <form className="w-full max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 sm:gap-2 px-4 sm:px-0" onSubmit={(e)=>{
      e.preventDefault()
      navigate(`/categories?q=${encodeURIComponent(q)}`)
    }}>
      <input
        value={q}
        onChange={(e)=>setQ(e.target.value)}
        placeholder="What do you need? e.g., plumber, tacos, detailing"
        className="flex-1 rounded-xl border px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand text-base"
      />
      <button className="rounded-xl bg-brand text-white px-5 py-3 hover:bg-brand-dark whitespace-nowrap">Search</button>
    </form>
  )
}
