// Tooth notation translation system
// Converts between Universal (#1-32), ISO (1.1-4.8), and standard anatomical names

export type NotationType = 'universal' | 'iso'
export type LocationMethod = 'tooth' | 'quadrant'

export interface ToothTranslation {
  universal: string
  iso: string
  standardName: string
  quadrant: 'upper-right' | 'upper-left' | 'lower-left' | 'lower-right'
  position: string
}

// Complete tooth translation table
export const TOOTH_TRANSLATIONS: ToothTranslation[] = [
  // Upper Right Quadrant (Quadrant 1)
  { universal: '#1', iso: '1.8', standardName: 'Upper Right Third Molar (Wisdom Tooth)', quadrant: 'upper-right', position: 'third molar' },
  { universal: '#2', iso: '1.7', standardName: 'Upper Right Second Molar', quadrant: 'upper-right', position: 'second molar' },
  { universal: '#3', iso: '1.6', standardName: 'Upper Right First Molar', quadrant: 'upper-right', position: 'first molar' },
  { universal: '#4', iso: '1.5', standardName: 'Upper Right Second Premolar', quadrant: 'upper-right', position: 'second premolar' },
  { universal: '#5', iso: '1.4', standardName: 'Upper Right First Premolar', quadrant: 'upper-right', position: 'first premolar' },
  { universal: '#6', iso: '1.3', standardName: 'Upper Right Canine', quadrant: 'upper-right', position: 'canine' },
  { universal: '#7', iso: '1.2', standardName: 'Upper Right Lateral Incisor', quadrant: 'upper-right', position: 'lateral incisor' },
  { universal: '#8', iso: '1.1', standardName: 'Upper Right Central Incisor', quadrant: 'upper-right', position: 'central incisor' },

  // Upper Left Quadrant (Quadrant 2)
  { universal: '#9', iso: '2.1', standardName: 'Upper Left Central Incisor', quadrant: 'upper-left', position: 'central incisor' },
  { universal: '#10', iso: '2.2', standardName: 'Upper Left Lateral Incisor', quadrant: 'upper-left', position: 'lateral incisor' },
  { universal: '#11', iso: '2.3', standardName: 'Upper Left Canine', quadrant: 'upper-left', position: 'canine' },
  { universal: '#12', iso: '2.4', standardName: 'Upper Left First Premolar', quadrant: 'upper-left', position: 'first premolar' },
  { universal: '#13', iso: '2.5', standardName: 'Upper Left Second Premolar', quadrant: 'upper-left', position: 'second premolar' },
  { universal: '#14', iso: '2.6', standardName: 'Upper Left First Molar', quadrant: 'upper-left', position: 'first molar' },
  { universal: '#15', iso: '2.7', standardName: 'Upper Left Second Molar', quadrant: 'upper-left', position: 'second molar' },
  { universal: '#16', iso: '2.8', standardName: 'Upper Left Third Molar (Wisdom Tooth)', quadrant: 'upper-left', position: 'third molar' },

  // Lower Left Quadrant (Quadrant 3)
  { universal: '#17', iso: '3.8', standardName: 'Lower Left Third Molar (Wisdom Tooth)', quadrant: 'lower-left', position: 'third molar' },
  { universal: '#18', iso: '3.7', standardName: 'Lower Left Second Molar', quadrant: 'lower-left', position: 'second molar' },
  { universal: '#19', iso: '3.6', standardName: 'Lower Left First Molar', quadrant: 'lower-left', position: 'first molar' },
  { universal: '#20', iso: '3.5', standardName: 'Lower Left Second Premolar', quadrant: 'lower-left', position: 'second premolar' },
  { universal: '#21', iso: '3.4', standardName: 'Lower Left First Premolar', quadrant: 'lower-left', position: 'first premolar' },
  { universal: '#22', iso: '3.3', standardName: 'Lower Left Canine', quadrant: 'lower-left', position: 'canine' },
  { universal: '#23', iso: '3.2', standardName: 'Lower Left Lateral Incisor', quadrant: 'lower-left', position: 'lateral incisor' },
  { universal: '#24', iso: '3.1', standardName: 'Lower Left Central Incisor', quadrant: 'lower-left', position: 'central incisor' },

  // Lower Right Quadrant (Quadrant 4)
  { universal: '#25', iso: '4.1', standardName: 'Lower Right Central Incisor', quadrant: 'lower-right', position: 'central incisor' },
  { universal: '#26', iso: '4.2', standardName: 'Lower Right Lateral Incisor', quadrant: 'lower-right', position: 'lateral incisor' },
  { universal: '#27', iso: '4.3', standardName: 'Lower Right Canine', quadrant: 'lower-right', position: 'canine' },
  { universal: '#28', iso: '4.4', standardName: 'Lower Right First Premolar', quadrant: 'lower-right', position: 'first premolar' },
  { universal: '#29', iso: '4.5', standardName: 'Lower Right Second Premolar', quadrant: 'lower-right', position: 'second premolar' },
  { universal: '#30', iso: '4.6', standardName: 'Lower Right First Molar', quadrant: 'lower-right', position: 'first molar' },
  { universal: '#31', iso: '4.7', standardName: 'Lower Right Second Molar', quadrant: 'lower-right', position: 'second molar' },
  { universal: '#32', iso: '4.8', standardName: 'Lower Right Third Molar (Wisdom Tooth)', quadrant: 'lower-right', position: 'third molar' },
]

// Utility functions for tooth notation conversion
export function getToothByUniversal(universal: string): ToothTranslation | undefined {
  return TOOTH_TRANSLATIONS.find(tooth => tooth.universal === universal)
}

export function getToothByISO(iso: string): ToothTranslation | undefined {
  return TOOTH_TRANSLATIONS.find(tooth => tooth.iso === iso)
}

export function convertToStandardName(notation: string, notationType: NotationType): string {
  if (notationType === 'universal') {
    const tooth = getToothByUniversal(notation)
    return tooth ? tooth.standardName : notation
  } else {
    const tooth = getToothByISO(notation)
    return tooth ? tooth.standardName : notation
  }
}

export function getToothOptions(notationType: NotationType): Array<{value: string, label: string, standardName: string}> {
  return TOOTH_TRANSLATIONS.map(tooth => ({
    value: notationType === 'universal' ? tooth.universal : tooth.iso,
    label: notationType === 'universal' ? tooth.universal : tooth.iso,
    standardName: tooth.standardName
  }))
}

export function normalizeToothToStandard(notation: string, notationType: NotationType): string {
  const tooth = notationType === 'universal' 
    ? getToothByUniversal(notation)
    : getToothByISO(notation)
  
  return tooth ? tooth.standardName : notation
}

// Quadrant definitions
export const QUADRANTS = [
  { value: 'UR', label: 'UR - Upper Right', standardName: 'Upper Right Quadrant' },
  { value: 'UL', label: 'UL - Upper Left', standardName: 'Upper Left Quadrant' },
  { value: 'LL', label: 'LL - Lower Left', standardName: 'Lower Left Quadrant' },
  { value: 'LR', label: 'LR - Lower Right', standardName: 'Lower Right Quadrant' },
]

export function normalizeLocationToStandard(location: string, locationMethod: LocationMethod, notationType?: NotationType): string {
  if (locationMethod === 'quadrant') {
    const quadrant = QUADRANTS.find(q => q.value === location)
    return quadrant ? quadrant.standardName : location
  } else if (locationMethod === 'tooth' && notationType) {
    return normalizeToothToStandard(location, notationType)
  }
  return location
}

export function convertToDisplayNotation(location: string, targetNotationType: NotationType): string {
  // If it's a quadrant, return as-is
  if (QUADRANTS.some(q => q.value === location || q.standardName === location)) {
    const quadrant = QUADRANTS.find(q => q.value === location || q.standardName === location)
    return quadrant ? quadrant.value : location
  }
  
  // Try to detect the current notation type and convert
  // Check if it's Universal format (#1-32)
  if (location.startsWith('#')) {
    const tooth = getToothByUniversal(location)
    if (tooth) {
      return targetNotationType === 'universal' ? tooth.universal : tooth.iso
    }
  }
  
  // Check if it's ISO format (digits with dot)
  if (/^\d\.\d$/.test(location)) {
    const tooth = getToothByISO(location)
    if (tooth) {
      return targetNotationType === 'universal' ? tooth.universal : tooth.iso
    }
  }
  
  // Check if it's a standard anatomical name
  const tooth = TOOTH_TRANSLATIONS.find(t => t.standardName === location)
  if (tooth) {
    return targetNotationType === 'universal' ? tooth.universal : tooth.iso
  }
  
  return location
}

// Keep the old function for backward compatibility but make it use the new logic
export function convertStandardToDisplay(standardLocation: string, notationType: NotationType): string {
  return convertToDisplayNotation(standardLocation, notationType)
}