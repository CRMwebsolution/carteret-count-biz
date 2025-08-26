import { Link, NavLink } from 'react-router-dom'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg">Carteret Local</Link>
        <nav className="hidden md:flex items-center gap-6">
          <NavLink to="/categories" className={({isActive}) => isActive ? 'text-brand font-medium' : 'text-gray-700'}>Categories</NavLink>
          <NavLink to="/add" className="rounded-full bg-brand text-white px-4 py-2 hover:bg-brand-dark transition">Add a Business</NavLink>
          <NavLink to="/account" className={({isActive}) => isActive ? 'text-brand font-medium' : 'text-gray-700'}>Account</NavLink>
        </nav>
      </div>
    </header>
  )
}
