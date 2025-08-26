export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 text-sm text-gray-600 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>&copy; {new Date().getFullYear()} Carteret Local</p>
        <div className="flex gap-4 sm:gap-6">
          <a className="hover:underline" href="#">Privacy</a>
          <a className="hover:underline" href="#">Terms</a>
        </div>
      </div>
    </footer>
  )
}
