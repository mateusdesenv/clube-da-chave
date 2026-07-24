import { MongoClient, type Collection, type Db, type Document } from 'mongodb'

const databaseName = process.env.MONGODB_DATABASE || 'clube_da_chave'
let clientPromise: Promise<MongoClient> | undefined
let indexesPromise: Promise<unknown> | undefined

function getClient() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI não configurada')
  clientPromise ??= new MongoClient(uri).connect()
  return clientPromise
}

export async function getDatabase(): Promise<Db> {
  const client = await getClient()
  return client.db(databaseName)
}

export async function getCollection<T extends Document>(name: string): Promise<Collection<T>> {
  const database = await getDatabase()
  return database.collection<T>(name)
}

export async function ensureIndexes() {
  indexesPromise ??= getDatabase().then(async database => {
    const collections = ['users', 'players', 'tournaments', 'matches', 'tables', 'events']
    await Promise.all(collections.map(name => database.collection(name).createIndex({ updatedAt: -1 })))
    await Promise.all([
      database.collection('players').createIndex({ name: 1 }),
      database.collection('tournaments').createIndex({ status: 1, start: 1 }),
      database.collection('matches').createIndex({ tournamentId: 1, round: 1 }),
      database.collection('events').createIndex({ at: -1 }),
    ])
  })
  return indexesPromise
}

export async function checkDatabase() {
  const database = await getDatabase()
  await database.command({ ping: 1 })
}

export function configuredDatabaseName() {
  return databaseName
}
