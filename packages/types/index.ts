/**
 * @streamside/types
 * 
 * Shared TypeScript types for the Streamside monorepo.
 * Note: Prisma-generated types are exported from @streamside/database
 */

import { Server as SocketIOServer } from 'socket.io'
import type { NextApiResponse } from 'next'

// ==========================================
// Socket.io Types
// ==========================================

export type NextApiResponseServerIO = NextApiResponse & {
    socket: {
        server: {
            io: SocketIOServer
        } & Record<string, unknown>
    }
}

export interface SocketClientToServerEvents {
    'join-studio': (studioId: string) => void
    'leave-studio': (studioId: string) => void
    'recording-state': (data: { studioId: string; isRecording: boolean }) => void
    'chunk-uploaded': (data: { studioId: string; participantId: string; chunkIndex: number }) => void
}

export interface SocketServerToClientEvents {
    'recording-state': (data: { isRecording: boolean }) => void
    'participant-joined': (data: { socketId: string; timestamp: string }) => void
    'participant-left': (data: { socketId: string; timestamp: string }) => void
    'chunk-uploaded': (data: { participantId: string; chunkIndex: number }) => void
}

export interface SocketInterServerEvents {
    ping: () => void
}

export interface SocketData {
    studioId?: string
    participantId?: string
}

// ==========================================
// Media Device Types
// ==========================================

export interface MediaDevice {
    deviceId: string
    label: string
    kind: MediaDeviceKind
}

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
}

export interface ChunkUploadResponse {
    success: boolean
    chunkIndex: number
    objectName: string
    recordingId: string
    totalSize: string
}

export interface LiveKitTokenResponse {
    token: string
}

export interface StudioCreateResponse {
    id: string
    name: string
}

// ==========================================
// LiveKit Types
// ==========================================

export interface LiveKitTokenRequest {
    roomName: string
    participantIdentity: string
    participantName: string
}

