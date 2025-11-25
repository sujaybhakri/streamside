/**
 * Re-export Prisma client from the shared database package
 * 
 * This provides a single import point for the web app while keeping
 * the actual database configuration in the shared package.
 */

export { prisma } from '@streamside/database'
export type { User, Studio, Recording, RecordingStatus } from '@streamside/database'

