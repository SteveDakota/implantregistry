'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { convertToDisplayNotation } from '@/lib/tooth-notation'

export default function PatientDashboard() {
  const router = useRouter()
  const [records, setRecords] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    try {
      const response = await fetch('/api/patient/records')
      const data = await response.json()

      if (response.ok) {
        setRecords(data)
      } else {
        setError(data.error || 'Failed to fetch records')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.push('/patient')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your records...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white p-8 rounded-2xl shadow border border-slate-200 text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-4">Unable to Load Records</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-2">
              <button
                onClick={fetchRecords}
                className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition"
              >
                Try Again
              </button>
              <button
                onClick={handleLogout}
                className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl shadow border border-slate-200 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-emerald-700">Your Implant Records</h1>
              <p className="text-gray-600">
                Patient ID: <span className="font-mono">{records?.patientId}</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow border border-slate-200">
            <div className="text-3xl mb-2">🦷</div>
            <div className="text-2xl font-bold text-gray-900">{records?.summary?.totalRecords || 0}</div>
            <div className="text-sm text-gray-600">Total Records</div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow border border-slate-200">
            <div className="text-3xl mb-2">➕</div>
            <div className="text-2xl font-bold text-emerald-600">{records?.summary?.placements || 0}</div>
            <div className="text-sm text-gray-600">Implant Placements</div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow border border-slate-200">
            <div className="text-3xl mb-2">➖</div>
            <div className="text-2xl font-bold text-red-600">{records?.summary?.removals || 0}</div>
            <div className="text-sm text-gray-600">Implant Removals</div>
          </div>
        </div>

        {/* Records List */}
        <div className="bg-white rounded-2xl shadow border border-slate-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Implant History</h2>
          </div>
          
          {records?.records?.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {records.records.map((record: any, index: number) => (
                <div key={index} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          record.recordType === 'PLACEMENT' 
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {record.recordType === 'PLACEMENT' ? '➕ Placement' : '➖ Removal'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-medium text-gray-900 mb-2">📍 Location</h3>
                          <p className="text-gray-600">{convertToDisplayNotation(record.location, 'universal')}</p>
                        </div>
                        
                        <div>
                          <h3 className="font-medium text-gray-900 mb-2">👩‍⚕️ Dentist</h3>
                          <p className="text-gray-600">{record.dentistName || 'Not specified'}</p>
                        </div>

                        {record.recordType === 'PLACEMENT' && (
                          <>
                            {record.details?.brand && (
                              <div>
                                <h3 className="font-medium text-gray-900 mb-2">🏷️ Brand & Model</h3>
                                <p className="text-gray-600">
                                  {record.details.brand} {record.details.model}
                                </p>
                              </div>
                            )}
                            
                            {(record.details?.diameter || record.details?.length) && (
                              <div>
                                <h3 className="font-medium text-gray-900 mb-2">📏 Dimensions</h3>
                                <p className="text-gray-600">
                                  {record.details.diameter} × {record.details.length}
                                </p>
                              </div>
                            )}
                            
                            {record.details?.lot && (
                              <div>
                                <h3 className="font-medium text-gray-900 mb-2">🏷️ Lot Number</h3>
                                <p className="text-gray-600 font-mono">{record.details.lot}</p>
                              </div>
                            )}
                            
                            {record.placementDate && (
                              <div>
                                <h3 className="font-medium text-gray-900 mb-2">📅 Placement Date</h3>
                                <p className="text-gray-600">
                                  {new Date(record.placementDate).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {record.recordType === 'REMOVAL' && (
                          <>
                            {record.removalDate && (
                              <div>
                                <h3 className="font-medium text-gray-900 mb-2">📅 Removal Date</h3>
                                <p className="text-gray-600">
                                  {new Date(record.removalDate).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                            
                            {record.details?.removalReason && (
                              <div>
                                <h3 className="font-medium text-gray-900 mb-2">📝 Reason</h3>
                                <p className="text-gray-600">{record.details.removalReason}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {record.txHash && (
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <h3 className="font-medium text-gray-900 mb-1">🔗 Blockchain Record</h3>
                          <p className="text-xs text-gray-500 font-mono break-all">
                            {record.txHash}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🦷</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Implant Records Found</h3>
              <p className="text-gray-600">
                When your dentist logs implant procedures, they will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Audit Trail */}
        {records?.auditTrail?.length > 0 && (
          <div className="bg-white rounded-2xl shadow border border-slate-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Recent Access Log</h2>
              <p className="text-sm text-gray-600">Who accessed your records and when</p>
            </div>
            
            <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
              {records.auditTrail.slice(0, 10).map((audit: any, index: number) => (
                <div key={index} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {audit.action.replace(/_/g, ' ')}
                      </p>
                      {audit.dentistName && (
                        <p className="text-xs text-gray-600">by {audit.dentistName}</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(audit.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Show blockchain audit tx hash for any blockchain-logged action */}
                  {(audit.action === 'RECORDS_ACCESS' || audit.action === 'PATIENT_RECORDS_VIEW' || audit.action === 'PATIENT_SEARCH' || audit.action.startsWith('IMPLANT_')) && audit.metadata?.auditTxHash && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-600 font-medium mb-1">
                        Blockchain audit transaction:
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {audit.metadata.auditTxHash.substring(0, 20)}...{audit.metadata.auditTxHash.substring(audit.metadata.auditTxHash.length - 10)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            🔒 Your data is secured with blockchain technology and privacy-first design
          </p>
        </div>
      </div>
    </main>
  )
}