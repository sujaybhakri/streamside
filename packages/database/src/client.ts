/**
 * Prisma Client singleton for Streamside
 * 
 * Uses @prisma/adapter-pg with a native pg Pool for Supabase PostgreSQL.
 * This is the recommended approach for Prisma 7+ with serverless/edge environments.
 */

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Create a singleton Pool instance
// The pool will be reused across hot reloads in development
const globalForPrisma = globalThis as unknown as {
    pool: Pool | undefined
    prisma: PrismaClient | undefined
}

function createPool(): Pool {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
        // During build time, DATABASE_URL might not be available
        // Return a pool that will fail at runtime if used
        console.warn('DATABASE_URL is not set - database operations will fail at runtime')
        return new Pool({ connectionString: 'postgresql://build:build@localhost/build' })
    }

    return new Pool({
        connectionString,
        max: 10, // Maximum number of connections
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    })
}

function createPrismaClient(): PrismaClient {
    const pool = globalForPrisma.pool ?? createPool()

    if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.pool = pool
    }

    const adapter = new PrismaPg(pool)

    const prisma = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
    })

    return prisma
}

// Export the singleton Prisma client
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}
