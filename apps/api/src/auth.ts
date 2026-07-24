import type { Request } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'clube-da-chave'
const firebaseKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

export async function authenticateRequest(request: Request) {
  const authorization = request.headers.authorization
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice('Bearer '.length).trim()
  if (!token) return null
  const { payload } = await jwtVerify(token, firebaseKeys, {
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  })
  return payload
}
