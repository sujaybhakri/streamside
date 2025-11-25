// Prisma 7+ configuration for Supabase PostgreSQL
// Uses DIRECT_URL for migrations (bypasses pooler) and DATABASE_URL for queries
import path from 'node:path'
import { defineConfig } from '@prisma/config'
import dotenv from 'dotenv'

// Load environment variables from apps/web/.env where the DB credentials are
const envPath = path.resolve(__dirname, '../../apps/web/.env')
dotenv.config({ path: envPath })

// Also try loading from root .env as fallback
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const databaseUrl = process.env.DATABASE_URL
const directUrl = process.env.DIRECT_URL

if (!databaseUrl) {
    console.error('DATABASE_URL is not set in environment')
}

export default defineConfig({
    schema: path.join(__dirname, 'prisma/schema.prisma'),
    datasource: {
        // Use DIRECT_URL for migrations if available (bypasses connection pooler)
        url: directUrl || databaseUrl || '',
    },
})

