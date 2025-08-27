import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}

export function generateSearchHash(name: string, dob: string, email: string): string {
  const combined = `${name.toLowerCase().trim()}|${dob.trim()}|${email.toLowerCase().trim()}`
  return createHash('sha256').update(combined).digest('hex')
}

export function generateVerificationHash(patientId: string, emailHash: string): string {
  return createHash('sha256').update(`${patientId}${emailHash}`).digest('hex')
}

export function generatePatientId(): string {
  // Generate UUID v4
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  const b = Array.from(bytes).map(toHex).join('')
  return `${b.slice(0,8)}-${b.slice(8,12)}-${b.slice(12,16)}-${b.slice(16,20)}-${b.slice(20)}`
}