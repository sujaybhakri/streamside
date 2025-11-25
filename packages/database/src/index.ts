/**
 * @streamside/database
 * 
 * Shared database package for the Streamside monorepo.
 * Exports the Prisma client and all generated types.
 */

// Re-export the Prisma client singleton
export { prisma } from './client'

// Re-export all Prisma types for use in other packages
export type {
    User,
    Account,
    Session,
    Verification,
    Studio,
    Recording,
    RecordingStatus,
    Prisma,
} from '@prisma/client'

// Re-export PrismaClient type for typing purposes
export { PrismaClient } from '@prisma/client'
