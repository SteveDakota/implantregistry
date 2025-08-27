'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function DentistRegister() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    licenseId: '',
    officeAddress: '',
    password: '',
    toothNotationPreference: 'universal'
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/dentist/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message || 'Registration successful! Please check your email and click the verification link to activate your account.')
        setFormData({ name: '', email: '', licenseId: '', officeAddress: '', password: '', toothNotationPreference: 'universal' })
      } else {
        setMessage(data.error || 'Registration failed')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white p-8 rounded-2xl shadow border border-slate-200">
          <h1 className="text-2xl font-bold text-center mb-8">
            Register as Dentist
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Dr. Jane Smith"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="jane@dentalpractice.com"
              />
            </div>

            <div>
              <label htmlFor="licenseId" className="block text-sm font-medium text-gray-700 mb-1">
                License ID
              </label>
              <input
                id="licenseId"
                name="licenseId"
                type="text"
                value={formData.licenseId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="DDS123456"
              />
            </div>

            <div>
              <label htmlFor="officeAddress" className="block text-sm font-medium text-gray-700 mb-1">
                Office Address
              </label>
              <textarea
                id="officeAddress"
                name="officeAddress"
                value={formData.officeAddress}
                onChange={handleChange}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="123 Main St, City, State 12345"
              />
            </div>

            <div>
              <label htmlFor="toothNotationPreference" className="block text-sm font-medium text-gray-700 mb-1">
                Tooth Notation Preference
              </label>
              <select
                id="toothNotationPreference"
                name="toothNotationPreference"
                value={formData.toothNotationPreference}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="universal">Universal (American) - #1-32</option>
                <option value="iso">ISO (International) - 1.1-4.8</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                This determines how tooth positions are displayed and entered throughout the system
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Choose a secure password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
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

          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Already have an account?
            </p>
            <Link
              href="/dentist"
              className="text-indigo-600 hover:text-indigo-800 text-sm"
            >
              Sign in here
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}