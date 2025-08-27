'use client'
import { useState } from 'react'
import { NotationType, LocationMethod, getToothOptions, QUADRANTS, normalizeLocationToStandard } from '@/lib/tooth-notation'

interface ToothSelectorProps {
  notationType: NotationType
  value: string
  onChange: (location: string, standardLocation: string) => void
  className?: string
}

export default function ToothSelector({ notationType, value, onChange, className = '' }: ToothSelectorProps) {
  const [locationMethod, setLocationMethod] = useState<LocationMethod>('tooth')
  
  const toothOptions = getToothOptions(notationType)
  
  const handleLocationChange = (newLocation: string) => {
    const standardLocation = normalizeLocationToStandard(newLocation, locationMethod, notationType)
    onChange(newLocation, standardLocation)
  }
  
  const handleMethodChange = (method: LocationMethod) => {
    setLocationMethod(method)
    // Reset the value when switching methods
    onChange('', '')
  }
  
  return (
    <div className={className}>
      <div className="mb-3">
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="tooth"
              checked={locationMethod === 'tooth'}
              onChange={() => handleMethodChange('tooth')}
              className="form-radio text-indigo-600"
            />
            <span className="ml-2">Specific Tooth</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="quadrant"
              checked={locationMethod === 'quadrant'}
              onChange={() => handleMethodChange('quadrant')}
              className="form-radio text-indigo-600"
            />
            <span className="ml-2">Quadrant</span>
          </label>
        </div>
      </div>
      
      {locationMethod === 'tooth' ? (
        <select
          value={value}
          onChange={(e) => handleLocationChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          required
        >
          <option value="">Select a tooth...</option>
          {toothOptions.map((option) => (
            <option key={option.value} value={option.value} title={option.standardName}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <select
          value={value}
          onChange={(e) => handleLocationChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          required
        >
          <option value="">Select a quadrant...</option>
          {QUADRANTS.map((quadrant) => (
            <option key={quadrant.value} value={quadrant.value} title={quadrant.standardName}>
              {quadrant.label}
            </option>
          ))}
        </select>
      )}
      
      {value && (
        <p className="mt-1 text-xs text-gray-500">
          Standard: {normalizeLocationToStandard(value, locationMethod, notationType)}
        </p>
      )}
    </div>
  )
}