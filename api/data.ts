import type { Request, Response } from 'express'

export default async function handler(request: Request, response: Response) {
  const { dataHandler } = await import('../apps/api/src/handlers.js')
  return dataHandler(request, response)
}
