import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base px-4 text-center">
      <ShieldAlert size={40} className="text-brand-primary mb-4" />
      <h1 className="text-xl font-bold text-ink mb-1">404 — Page Not Found</h1>
      <p className="text-[13px] text-ink-faint mb-6 max-w-sm">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link
        to="/dashboard"
        className="bg-brand-primary hover:bg-brand-primary/90 text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
