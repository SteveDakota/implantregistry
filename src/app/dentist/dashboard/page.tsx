'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ToothSelector from '@/components/ToothSelector'
import { convertToDisplayNotation } from '@/lib/tooth-notation'

export default function DentistDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('search')

  // Load profile on component mount
  useEffect(() => {
    loadProfile()
  }, [])

  // Patient Search State
  const [searchMethod, setSearchMethod] = useState<'personal_info' | 'patient_id'>('personal_info')
  const [searchData, setSearchData] = useState({
    name: '',
    dob: '',
    email: '',
    patientId: ''
  })
  const [patientVerification, setPatientVerification] = useState({
    patientId: '',
    email: ''
  })
  const [searchResult, setSearchResult] = useState<any>(null)
  const [verifiedPatient, setVerifiedPatient] = useState<any>(null)
  const [patientRecords, setPatientRecords] = useState<any>(null)
  const [providerHistory, setProviderHistory] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    licenseId: '',
    officeAddress: '',
    toothNotationPreference: 'universal'
  })
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Implant Logging State
  const [implantData, setImplantData] = useState({
    recordType: 'PLACEMENT',
    brand: '',
    model: '',
    lot: '',
    diameter: '',
    length: '',
    location: '',
    standardLocation: '', // This will be stored in blockchain
    placementDate: '',
    removalDate: '',
    removalReason: ''
  })

  const handleLogout = () => {
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.push('/dentist')
  }

  const handleBlockchainSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/blockchain/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      
      if (response.ok) {
        alert(`Blockchain sync completed!\nSynced ${data.syncedRecords} records for ${data.patientCount} patients`)
      } else {
        alert(`Sync failed: ${data.error}`)
      }
    } catch (error) {
      alert('Network error during sync. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  const handlePatientSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSearchResult(null)

    try {
      const payload = searchMethod === 'personal_info' 
        ? { searchMethod, name: searchData.name, dob: searchData.dob, email: searchData.email }
        : { searchMethod, patientId: searchData.patientId, email: searchData.email }

      const response = await fetch('/api/dentist/search-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      setSearchResult(data)

      // If direct patient_id search was successful, patient is automatically verified
      if (searchMethod === 'patient_id' && data.found && data.verified) {
        setVerifiedPatient(data)
        // Don't auto-load records here - let user click View History
      }
    } catch (error) {
      setSearchResult({ found: false, message: 'Search failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handlePatientVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/dentist/verify-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patientVerification.patientId,
          email: searchData.email // Use email from search, not separate input
        })
      })

      const data = await response.json()
      
      if (data.verified) {
        setVerifiedPatient(data)
        setSearchResult({ found: true, message: data.message })
        // Don't auto-load records here - let user click View History
      } else {
        setSearchResult({ found: false, message: data.message })
      }
    } catch (error) {
      setSearchResult({ found: false, message: 'Verification failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const loadPatientRecords = async (patientId: string) => {
    try {
      const response = await fetch(`/api/dentist/patient-records?patientId=${patientId}`)
      const data = await response.json()
      
      if (response.ok) {
        setPatientRecords(data)
      } else {
        console.error('Failed to load patient records:', data.error)
        setPatientRecords(null)
      }
    } catch (error) {
      console.error('Error loading patient records:', error)
      setPatientRecords(null)
    }
  }

  const loadProviderHistory = async () => {
    try {
      const response = await fetch('/api/dentist/provider-history')
      const data = await response.json()
      
      if (response.ok) {
        setProviderHistory(data)
      } else {
        console.error('Failed to load provider history:', data.error)
        setProviderHistory(null)
      }
    } catch (error) {
      console.error('Error loading provider history:', error)
      setProviderHistory(null)
    }
  }

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/dentist/profile')
      const data = await response.json()
      
      if (response.ok) {
        setProfile(data)
        setProfileForm({
          name: data.name,
          licenseId: data.licenseId,
          officeAddress: data.officeAddress,
          toothNotationPreference: data.toothNotationPreference
        })
      } else {
        console.error('Failed to load profile:', data.error)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/dentist/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm)
      })

      const data = await response.json()
      
      if (response.ok) {
        alert('Profile updated successfully!')
        await loadProfile()
        setEditingProfile(false)
      } else {
        alert(`Failed to update profile: ${data.error}`)
      }
    } catch (error) {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogImplant = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        patientId: verifiedPatient.patientId,
        ...implantData
      }

      const response = await fetch('/api/dentist/log-implant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      
      if (response.ok) {
        alert(`Implant ${implantData.recordType.toLowerCase()} logged successfully!\\nTransaction Hash: ${data.txHash}`)
        
        // Add new record optimistically to existing records
        if (patientRecords) {
          const newRecord = {
            txHash: data.txHash,
            recordType: implantData.recordType,
            location: implantData.standardLocation, // Store normalized location on blockchain
            placementDate: implantData.recordType === 'PLACEMENT' && implantData.placementDate ? implantData.placementDate + 'T00:00:00.000Z' : null,
            removalDate: implantData.recordType === 'REMOVAL' && implantData.removalDate ? implantData.removalDate + 'T00:00:00.000Z' : null,
            dentistName: 'Pending...', // Shows pending until blockchain sync
            createdAt: new Date().toISOString(),
            pending: true, // Mark as optimistic update
            details: {
              ...(implantData.recordType === 'PLACEMENT' && {
                brand: implantData.brand,
                model: implantData.model,
                lot: implantData.lot,
                diameter: implantData.diameter,
                length: implantData.length
              }),
              ...(implantData.recordType === 'REMOVAL' && {
                removalReason: implantData.removalReason
              })
            }
          }
          
          setPatientRecords({
            ...patientRecords,
            records: [newRecord, ...patientRecords.records],
            summary: {
              totalRecords: patientRecords.summary.totalRecords + 1,
              placements: patientRecords.summary.placements + (implantData.recordType === 'PLACEMENT' ? 1 : 0),
              removals: patientRecords.summary.removals + (implantData.recordType === 'REMOVAL' ? 1 : 0)
            }
          })
        }
        
        setImplantData({
          recordType: 'PLACEMENT',
          brand: '',
          model: '',
          lot: '',
          diameter: '',
          length: '',
          location: '',
          standardLocation: '',
          placementDate: '',
          removalDate: '',
          removalReason: ''
        })
        setActiveTab('history')
      } else {
        alert(`Failed to log implant: ${data.error}`)
      }
    } catch (error) {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with Profile */}
        <div className="bg-white p-6 rounded-2xl shadow border border-slate-200 mb-8">
          {profile && !editingProfile && (
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold">Dentist Dashboard</h1>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="bg-gray-500 text-white px-3 py-1 text-sm rounded-lg hover:bg-gray-600 transition"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={handleBlockchainSync}
                      disabled={syncing}
                      className="bg-blue-600 text-white px-3 py-1 text-sm rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition"
                    >
                      {syncing ? 'Syncing...' : 'Sync'}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="bg-red-600 text-white px-3 py-1 text-sm rounded-lg hover:bg-red-700 transition"
                    >
                      Logout
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Provider Name</p>
                    <p className="font-semibold">{profile.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">License ID</p>
                    <p className="font-semibold">{profile.licenseId}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-semibold">{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Provider ID</p>
                    <p className="font-mono text-xs">{profile.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tooth Notation</p>
                    <p className="font-semibold">
                      {profile.toothNotationPreference === 'universal' ? 'Universal (#1-32)' : 'ISO (1.1-4.8)'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-gray-600">Office Address</p>
                    <p className="font-semibold">{profile.officeAddress}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {profile && editingProfile && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Edit Profile</h1>
                <button
                  onClick={() => setEditingProfile(false)}
                  className="bg-gray-500 text-white px-3 py-1 text-sm rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
              </div>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License ID</label>
                    <input
                      type="text"
                      value={profileForm.licenseId}
                      onChange={(e) => setProfileForm({...profileForm, licenseId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Office Address</label>
                  <textarea
                    value={profileForm.officeAddress}
                    onChange={(e) => setProfileForm({...profileForm, officeAddress: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tooth Notation Preference</label>
                  <select
                    value={profileForm.toothNotationPreference}
                    onChange={(e) => setProfileForm({...profileForm, toothNotationPreference: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="universal">Universal (American) - #1-32</option>
                    <option value="iso">ISO (International) - 1.1-4.8</option>
                  </select>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition"
                  >
                    {loading ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {!profile && (
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Dentist Dashboard</h1>
              <div className="flex space-x-3">
                <button
                  onClick={handleBlockchainSync}
                  disabled={syncing}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition"
                >
                  {syncing ? 'Syncing...' : 'Sync Blockchain'}
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Provider History Section */}
        <div className="bg-white rounded-2xl shadow border border-slate-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Your Provider History</h2>
                <p className="text-sm text-gray-600">All implants you have placed or removed</p>
              </div>
              <button
                onClick={loadProviderHistory}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Load History
              </button>
            </div>
          </div>
          
          {providerHistory && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{providerHistory.summary.totalProcedures}</div>
                  <div className="text-sm text-gray-600">Total Procedures</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{providerHistory.summary.placements}</div>
                  <div className="text-sm text-gray-600">Placements</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{providerHistory.summary.removals}</div>
                  <div className="text-sm text-gray-600">Removals</div>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Procedure</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Patient</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Location</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {providerHistory.providerHistory.map((record: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.recordType === 'PLACEMENT' 
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.recordType === 'PLACEMENT' ? 'Placement' : 'Removal'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {record.patientId.substring(0, 4)}...{record.patientId.substring(record.patientId.length - 4)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {profile ? convertToDisplayNotation(record.location, profile.toothNotationPreference) : record.location}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {record.placementDate 
                            ? new Date(record.placementDate).toLocaleDateString()
                            : record.removalDate 
                            ? new Date(record.removalDate).toLocaleDateString()
                            : new Date(record.createdAt).toLocaleDateString()
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-2xl shadow border border-slate-200 mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'search' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Patient Search
            </button>
            <button
              onClick={() => setActiveTab('log')}
              disabled={!verifiedPatient}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'log' && verifiedPatient
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              Log Implant
            </button>
            <button
              onClick={() => {
                if (verifiedPatient) {
                  setActiveTab('history')
                  loadPatientRecords(verifiedPatient.patientId)
                }
              }}
              disabled={!verifiedPatient}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'history' && verifiedPatient
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              Patient History
            </button>
          </div>

          {/* Patient Search Tab */}
          {activeTab === 'search' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-6">Find Patient</h2>
              
              {/* Search Method Selection */}
              <div className="mb-6">
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="personal_info"
                      checked={searchMethod === 'personal_info'}
                      onChange={(e) => setSearchMethod(e.target.value as 'personal_info')}
                      className="mr-2"
                    />
                    Search by Name + DOB + Email
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="patient_id"
                      checked={searchMethod === 'patient_id'}
                      onChange={(e) => setSearchMethod(e.target.value as 'patient_id')}
                      className="mr-2"
                    />
                    Search by Patient ID + Email
                  </label>
                </div>
              </div>

              {/* Search Form */}
              <form onSubmit={handlePatientSearch} className="space-y-4 mb-6">
                {searchMethod === 'personal_info' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={searchData.name}
                          onChange={(e) => setSearchData(prev => ({ ...prev, name: e.target.value }))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={searchData.dob}
                          onChange={(e) => setSearchData(prev => ({ ...prev, dob: e.target.value }))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={searchData.email}
                          onChange={(e) => setSearchData(prev => ({ ...prev, email: e.target.value }))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="john@email.com"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
                        <input
                          type="text"
                          value={searchData.patientId}
                          onChange={(e) => setSearchData(prev => ({ ...prev, patientId: e.target.value }))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="patient-id-123"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={searchData.email}
                          onChange={(e) => setSearchData(prev => ({ ...prev, email: e.target.value }))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="john@email.com"
                        />
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition"
                >
                  {loading ? 'Searching...' : 'Search Patient'}
                </button>
              </form>

              {/* Search Result */}
              {searchResult && (
                <div className={`p-4 rounded-lg border ${
                  searchResult.found 
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : searchResult.canCreate 
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                      : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <p className="font-medium">{searchResult.message}</p>
                  {searchResult.registeredDate && (
                    <p className="text-sm mt-1">
                      Patient registered: {new Date(searchResult.registeredDate).toLocaleDateString()}
                    </p>
                  )}
                  {searchResult.canCreate && (
                    <div className="mt-4">
                      <button
                        onClick={async () => {
                          setLoading(true)
                          try {
                            const response = await fetch('/api/dentist/create-patient', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                searchHash: searchResult.searchHash,
                                ...searchResult.patientData
                              })
                            })
                            const data = await response.json()
                            if (response.ok) {
                              // Show success message and allow dentist to proceed with implant logging
                              setSearchResult({
                                found: true,
                                message: `Patient account created successfully! Patient ID: ${data.patientId}. An email has been sent to the patient to complete their account setup.`,
                                patientId: data.patientId,
                                verified: true,
                                registeredDate: data.createdAt
                              })
                              // Set verified patient so dentist can immediately log implants
                              setVerifiedPatient({
                                patientId: data.patientId,
                                registeredDate: data.createdAt
                              })
                            } else {
                              setSearchResult({ 
                                found: false, 
                                message: data.error || 'Failed to create patient account' 
                              })
                            }
                          } catch (error) {
                            setSearchResult({ 
                              found: false, 
                              message: 'Network error. Please try again.' 
                            })
                          } finally {
                            setLoading(false)
                          }
                        }}
                        disabled={loading}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:bg-yellow-300 transition"
                      >
                        {loading ? 'Creating Account...' : 'Create Patient Account'}
                      </button>
                      <p className="text-sm mt-2 text-yellow-600">
                        This will send an email to {searchResult.patientData.email} to complete their account setup.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Patient Verification (for personal_info search) */}
              {searchResult?.found && searchResult?.patientFound && searchMethod === 'personal_info' && !verifiedPatient && (
                <div className="mt-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-4">Verify Patient Identity</h3>
                  <form onSubmit={handlePatientVerification} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-yellow-800 mb-1">
                          Enter Patient ID
                        </label>
                        <input
                          type="text"
                          value={patientVerification.patientId}
                          onChange={(e) => setPatientVerification(prev => ({ ...prev, patientId: e.target.value, email: searchData.email }))}
                          required
                          className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          placeholder="patient-id-123"
                        />
                        <p className="text-sm text-yellow-600 mt-1">
                          Using email: {searchData.email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 disabled:bg-yellow-300 transition"
                    >
                      {loading ? 'Verifying...' : 'Verify Patient'}
                    </button>
                  </form>
                </div>
              )}

              {/* Verified Patient */}
              {verifiedPatient && (
                <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">✅ Patient Ready</h3>
                  <p className="text-blue-700 text-lg font-mono bg-white px-3 py-2 rounded inline-block">
                    Patient ID: {verifiedPatient.patientId}
                  </p>
                  <p className="text-blue-700 text-sm mt-2">
                    Registered: {new Date(verifiedPatient.registeredDate).toLocaleDateString()}
                  </p>
                  <div className="mt-4 space-x-4">
                    <button
                      onClick={() => setActiveTab('log')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      Log Implant →
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('history')
                        loadPatientRecords(verifiedPatient.patientId)
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      View History →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Log Implant Tab */}
          {activeTab === 'log' && verifiedPatient && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                Log Implant for Patient: <span className="font-mono text-indigo-600">{verifiedPatient.patientId}</span>
              </h2>

              <form onSubmit={handleLogImplant} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Record Type</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="PLACEMENT"
                        checked={implantData.recordType === 'PLACEMENT'}
                        onChange={(e) => setImplantData(prev => ({ ...prev, recordType: e.target.value }))}
                        className="mr-2"
                      />
                      Implant Placement
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="REMOVAL"
                        checked={implantData.recordType === 'REMOVAL'}
                        onChange={(e) => setImplantData(prev => ({ ...prev, recordType: e.target.value }))}
                        className="mr-2"
                      />
                      Implant Removal
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    {profile && (
                      <ToothSelector
                        notationType={profile.toothNotationPreference}
                        value={implantData.location}
                        onChange={(location, standardLocation) => 
                          setImplantData(prev => ({ ...prev, location, standardLocation }))
                        }
                      />
                    )}
                  </div>
                  
                  {implantData.recordType === 'PLACEMENT' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Placement Date</label>
                      <input
                        type="date"
                        value={implantData.placementDate}
                        onChange={(e) => setImplantData(prev => ({ ...prev, placementDate: e.target.value }))}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Removal Date</label>
                        <input
                          type="date"
                          value={implantData.removalDate}
                          onChange={(e) => setImplantData(prev => ({ ...prev, removalDate: e.target.value }))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                {implantData.recordType === 'PLACEMENT' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                      <input
                        type="text"
                        value={implantData.brand}
                        onChange={(e) => setImplantData(prev => ({ ...prev, brand: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Straumann"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                      <input
                        type="text"
                        value={implantData.model}
                        onChange={(e) => setImplantData(prev => ({ ...prev, model: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="BLT RC"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lot Number</label>
                      <input
                        type="text"
                        value={implantData.lot}
                        onChange={(e) => setImplantData(prev => ({ ...prev, lot: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="LOT123456"
                      />
                    </div>
                  </div>
                )}

                {implantData.recordType === 'PLACEMENT' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Diameter</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={implantData.diameter}
                          onChange={(e) => setImplantData(prev => ({ ...prev, diameter: e.target.value }))}
                          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="4.1"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">mm</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Length</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={implantData.length}
                          onChange={(e) => setImplantData(prev => ({ ...prev, length: e.target.value }))}
                          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="10"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">mm</span>
                      </div>
                    </div>
                  </div>
                )}

                {implantData.recordType === 'REMOVAL' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Removal Reason</label>
                    <input
                      type="text"
                      value={implantData.removalReason}
                      onChange={(e) => setImplantData(prev => ({ ...prev, removalReason: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Implant failure, infection, etc."
                    />
                  </div>
                )}

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-300 transition"
                  >
                    {loading ? 'Logging...' : `Log ${implantData.recordType}`}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setVerifiedPatient(null)
                      setSearchResult(null)
                      setActiveTab('search')
                    }}
                    className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Patient History Tab */}
          {activeTab === 'history' && (verifiedPatient || patientRecords) && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                Implant History for Patient: <span className="font-mono text-indigo-600">{verifiedPatient?.patientId || patientRecords?.patientId}</span>
              </h2>

              {patientRecords ? (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-800">{patientRecords.summary.totalRecords}</div>
                      <div className="text-sm text-blue-600">Total Records</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-800">{patientRecords.summary.placements}</div>
                      <div className="text-sm text-green-600">Placements</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-red-800">{patientRecords.summary.removals}</div>
                      <div className="text-sm text-red-600">Removals</div>
                    </div>
                  </div>

                  {/* Records List */}
                  <div className="space-y-4">
                    <h3 className="text-md font-semibold text-gray-900">Implant Records</h3>
                    {patientRecords.records.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No implant records found for this patient.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {patientRecords.records.map((record: any, index: number) => (
                          <div key={record.txHash} className={`border rounded-lg p-4 ${
                            record.recordType === 'PLACEMENT' 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-red-50 border-red-200'
                          }`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs rounded font-medium ${
                                  record.recordType === 'PLACEMENT'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {record.recordType}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {profile ? convertToDisplayNotation(record.location, profile.toothNotationPreference) : record.location}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="space-y-1">
                                  {record.recordType === 'PLACEMENT' && record.placementDate && (
                                    <p><span className="font-medium">Date:</span> {new Date(record.placementDate).toLocaleDateString()}</p>
                                  )}
                                  {record.recordType === 'REMOVAL' && record.removalDate && (
                                    <p><span className="font-medium">Removal Date:</span> {new Date(record.removalDate).toLocaleDateString()}</p>
                                  )}
                                  {record.dentistName && (
                                    <p><span className="font-medium">Dentist:</span> 
                                      {record.pending ? (
                                        <span className="text-orange-600 ml-1">{record.dentistName} ⏳</span>
                                      ) : (
                                        <span className="ml-1">{record.dentistName}</span>
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                {record.recordType === 'PLACEMENT' && record.details && (
                                  <div className="space-y-1 text-xs">
                                    {record.details.brand && (
                                      <p><span className="font-medium">Brand:</span> {record.details.brand}</p>
                                    )}
                                    {record.details.model && (
                                      <p><span className="font-medium">Model:</span> {record.details.model}</p>
                                    )}
                                    {record.details.diameter && record.details.length && (
                                      <p><span className="font-medium">Size:</span> {record.details.diameter} × {record.details.length}</p>
                                    )}
                                    {record.details.lot && (
                                      <p><span className="font-medium">Lot:</span> {record.details.lot}</p>
                                    )}
                                  </div>
                                )}
                                {record.recordType === 'REMOVAL' && record.details && record.details.removalReason && (
                                  <p className="text-xs"><span className="font-medium">Reason:</span> {record.details.removalReason}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-500 font-mono">
                                Tx: {record.txHash.substring(0, 20)}...
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading patient records...</p>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setVerifiedPatient(null)
                    setPatientRecords(null)
                    setSearchResult(null)
                    setActiveTab('search')
                  }}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition"
                >
                  ← Back to Search
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}