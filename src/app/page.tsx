import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-8">
            Implant Registry MVP
          </h1>
          <p className="text-lg text-gray-600 mb-12">
            Secure dental implant tracking system with blockchain verification
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow border border-slate-200">
              <h2 className="text-xl font-semibold mb-4">For Dentists</h2>
              <p className="text-gray-600 mb-6">Register, log implants, and search patient records securely</p>
              <Link 
                href="/dentist"
                className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition"
              >
                Dentist Portal
              </Link>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow border border-slate-200">
              <h2 className="text-xl font-semibold mb-4">For Patients</h2>
              <p className="text-gray-600 mb-6">View your implant history and medical records</p>
              <Link 
                href="/patient"
                className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition"
              >
                Patient Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}