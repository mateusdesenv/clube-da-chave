import type { Collection, Document, Sort } from 'mongodb'
import { ensureIndexes, getCollection } from './database.js'

type Entity = { id: string; [key: string]: unknown }
type ApplicationState = {
  schemaVersion: number
  users: Entity[]
  players: Entity[]
  tournaments: Entity[]
  matches: Entity[]
  tables: Entity[]
  events: Entity[]
}

type StoredEntity = Document & {
  _id: string
  updatedAt: Date
}

const domains = ['users', 'players', 'tournaments', 'matches', 'tables', 'events'] as const
type Domain = (typeof domains)[number]

function isEntity(value: unknown): value is Entity {
  return Boolean(value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string')
}

function isApplicationState(value: unknown): value is ApplicationState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<ApplicationState>
  return typeof state.schemaVersion === 'number' && domains.every(domain =>
    Array.isArray(state[domain]) && state[domain]!.every(isEntity),
  )
}

function toDocument(entity: Entity, updatedAt: Date): StoredEntity {
  const { id, _id: _discardedMongoId, updatedAt: _discardedUpdatedAt, ...fields } = entity
  return { _id: id, ...fields, updatedAt }
}

function toEntity(document: StoredEntity): Entity {
  const { _id, updatedAt: _discardedUpdatedAt, ...fields } = document
  return { id: String(_id), ...fields }
}

async function syncCollection(collection: Collection<StoredEntity>, items: Entity[], updatedAt: Date) {
  if (!items.length) {
    await collection.deleteMany({})
    return
  }

  const documents = items.map(item => toDocument(item, updatedAt))
  await collection.bulkWrite(documents.map(document => ({
    replaceOne: {
      filter: { _id: document._id },
      replacement: document,
      upsert: true,
    },
  })), { ordered: false })
  await collection.deleteMany({ _id: { $nin: documents.map(document => document._id) } })
}

async function readDomain(domain: Domain) {
  const collection = await getCollection<StoredEntity>(domain)
  const sort:Sort = domain === 'events' ? { at: -1 } : domain === 'matches' ? { date: 1, time: 1 } : { updatedAt: -1 }
  return (await collection.find({}).sort(sort).toArray()).map(toEntity)
}

export async function readState(): Promise<ApplicationState | null> {
  await ensureIndexes()
  const values = await Promise.all(domains.map(readDomain))
  if (values.every(items => items.length === 0)) return null
  return {
    schemaVersion: 2,
    ...Object.fromEntries(domains.map((domain, index) => [domain, values[index]])),
  } as ApplicationState
}

export async function writeState(value: unknown) {
  if (!isApplicationState(value)) throw new Error('Dados inválidos')
  const updatedAt = new Date()
  await ensureIndexes()
  await Promise.all(domains.map(async domain => {
    const collection = await getCollection<StoredEntity>(domain)
    await syncCollection(collection, value[domain], updatedAt)
  }))
  return readState()
}
