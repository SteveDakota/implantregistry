'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function PatientRegister() {
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/patient/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          patientId: data.patientId,
          message: data.message
        })
        setFormData({ name: '', dob: '', email: '' })
      } else {
        setResult({
          success: false,
          message: data.error || 'Registration failed'
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error. Please try again.'
      })
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

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white p-8 rounded-2xl shadow border border-slate-200">
          <h1 className="text-2xl font-bold text-center mb-8 text-emerald-700">
            Register as Patient
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="John Doe"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter your full legal name as it appears on your ID
              </p>
            </div>

            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                id="dob"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="john@email.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                This email will be used to access your implant records
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-300 transition"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {result.success ? (
                <div>
                  <div className="text-green-700">
                    <h3 className="font-semibold mb-2">✅ Registration Successful!</h3>
                    <p className="text-sm mb-3">{result.message}</p>
                  </div>
                  
                  <div className="bg-green-100 p-3 rounded border border-green-300">
                    <p className="text-green-800 font-medium text-sm mb-1">
                      Your Patient ID:
                    </p>
                    <p className="font-mono text-green-900 text-lg break-all">
                      {result.patientId}
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      💾 Save this ID safely - you&apos;ll need it to access your records
                    </p>
                  </div>

                  <div className="mt-4 text-center">
                    <Link
                      href="/patient"
                      className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm"
                    >
                      Access Your Records →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-red-700">
                  <h3 className="font-semibold mb-1">❌ Registration Failed</h3>
                  <p className="text-sm">{result.message}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Already have a Patient ID?
            </p>
            <Link
              href="/patient"
              className="text-emerald-600 hover:text-emerald-800 text-sm"
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

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-2">🔒 Privacy Notice</h3>
            <p className="text-xs text-yellow-700">
              Your personal information is hashed and stored securely. Only you and authorized dentists can access your implant records.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}