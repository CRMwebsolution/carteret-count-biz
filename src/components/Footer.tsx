import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 text-sm text-gray-600 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>&copy; {new Date().getFullYear()} Carteret Local</p>
        <div className="flex items-center gap-4 sm:gap-6">
          <a className="hover:underline" href="#">Privacy</a>
          <a className="hover:underline" href="#">Terms</a>
          <Link 
            to="/admin" 
            className="text-gray-400 hover:text-brand transition-colors p-1"
            title="Admin Dashboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-6 6c-2 0-3-1-3-3s1-3 3-3a6 6 0 016-6zM3 19a2 2 0 01-2-2s0-6 6-6 6 4 6 6a2 2 0 01-2 2H3z" />
            </svg>
          </Link>
        </div>
      </div>
    </footer>
  )
}
