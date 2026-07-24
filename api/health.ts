import type { Request, Response } from 'express'

export default async function handler(request: Request, response: Response) {
  const { healthHandler } = await import('../apps/api/src/handlers.js')
  return healthHandler(request, response)
}
