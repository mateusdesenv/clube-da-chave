import type { Request, Response } from 'express'
import { authenticateRequest } from './auth.js'
import { checkDatabase, configuredDatabaseName } from './database.js'
import { readState, writeState } from './state.js'

export async function healthHandler(_request: Request, response: Response) {
  try {
    await checkDatabase()
    return response.status(200).json({
      status: 'ok',
      service: 'clube-da-chave-api',
      database: 'connected',
      databaseName: configuredDatabaseName(),
    })
  } catch (error) {
    console.error('Falha no health check', error instanceof Error ? error.message : error)
    return response.status(503).json({
      status: 'error',
      service: 'clube-da-chave-api',
      database: 'unavailable',
    })
  }
}

export async function dataHandler(request: Request, response: Response) {
  try {
    const user = await authenticateRequest(request)
    if (!user) return response.status(401).json({ error: 'Autenticação necessária' })
  } catch {
    return response.status(401).json({ error: 'Sessão inválida ou expirada' })
  }

  try {
    if (request.method === 'GET') return response.status(200).json({ data: await readState() })
    if (request.method === 'PUT') return response.status(200).json({ data: await writeState(request.body) })
    response.setHeader('Allow', 'GET, PUT')
    return response.status(405).json({ error: 'Método não permitido' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Falha na API de dados', message)
    if (message === 'Dados inválidos') return response.status(400).json({ error: message })
    return response.status(500).json({ error: 'Não foi possível acessar os dados' })
  }
}
