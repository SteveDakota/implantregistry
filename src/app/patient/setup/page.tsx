'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PatientSetup() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [token, setToken] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const urlToken = searchParams.get('token')
    if (!urlToken) {
      setMessage('Invalid or missing setup link. Please use the link from your email.')
    } else {
      setToken(urlToken)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/patient/complete-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...formData
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect to patient dashboard
        router.push('/patient/dashboard')
      } else {
        setMessage(data.error || 'Setup failed. Please check your information.')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-green-50">
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="bg-white p-8 rounded-2xl shadow border border-green-200">
            <h1 className="text-2xl font-bold text-center mb-4 text-red-600">
              Invalid Setup Link
            </h1>
            <p className="text-center text-gray-600 mb-6">
              {message}
            </p>
            <div className="text-center">
              <Link
                href="/"
                className="text-green-600 hover:text-green-800"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-green-50">
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white p-8 rounded-2xl shadow border border-green-200">
          <h1 className="text-2xl font-bold text-center mb-2">
            Complete Your Account Setup
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Please confirm your information to access your implant records
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                id="dob"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="john@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-300 transition"
            >
              {loading ? 'Verifying...' : 'Complete Setup & View Records'}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              message.includes('successfully') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Your information must match what your dentist has on file.</p>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm text-green-600 hover:text-green-800"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}