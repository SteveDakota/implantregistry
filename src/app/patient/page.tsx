'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function PatientPortal() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userType: 'patient' })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`Magic link sent! Check your email to access your records.${data.patientId ? `\\n\\nYour Patient ID: ${data.patientId}` : ''}`)
      } else {
        setMessage(data.error || 'Failed to send magic link')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white p-8 rounded-2xl shadow border border-slate-200">
          <h1 className="text-2xl font-bold text-center mb-8 text-emerald-700">
            Patient Portal
          </h1>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="your@email.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use the email address registered with your dentist
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-300 transition"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm whitespace-pre-line ${
              message.includes('sent') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Don&apos;t have a Patient ID yet?
              </p>
              <Link
                href="/patient/register"
                className="inline-block bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-200 transition text-sm"
              >
                Register as New Patient
              </Link>
            </div>

            <div className="text-center">
              <Link
                href="/"
                className="text-sm text-emerald-600 hover:text-emerald-800"
              >
                ← Back to Home
              </Link>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">📱 QR Code Access</h3>
            <p className="text-sm text-blue-700">
              Your dentist may provide a QR code for quick access to your records.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}