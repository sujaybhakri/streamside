import { NextRequest, NextResponse } from 'next/server'
import { uploadChunk } from '@/lib/minio'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

/**
 * POST /api/upload-chunk
 * Upload a video/audio chunk to MinIO
 * 
 * This endpoint handles progressive uploads from the MediaRecorder.
 * Each participant uploads their own high-quality recording in chunks.
 * 
 * Body (multipart/form-data):
 *  - chunk: Blob (the media chunk)
 *  - studioId: string
 *  - participantId: string
 *  - chunkIndex: number
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: req.headers,
        })

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const formData = await req.formData()
        const chunk = formData.get('chunk') as Blob
        const studioId = formData.get('studioId') as string
        const participantId = formData.get('participantId') as string
        const chunkIndex = parseInt(formData.get('chunkIndex') as string)

        if (!chunk || !studioId || !participantId || isNaN(chunkIndex)) {
            return NextResponse.json(
                { error: 'Missing required fields: chunk, studioId, participantId, chunkIndex' },
                { status: 400 }
            )
        }

        // Verify the studio exists
        const studio = await prisma.studio.findUnique({
            where: { id: studioId },
        })

        if (!studio) {
            return NextResponse.json(
                { error: 'Studio not found' },
                { status: 404 }
            )
        }

        // Convert blob to buffer
        const arrayBuffer = await chunk.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to MinIO
        const objectName = await uploadChunk(studioId, participantId, chunkIndex, buffer)

        // Update or create recording record
        const recording = await prisma.recording.upsert({
            where: {
                studioId_participantId: {
                    studioId,
                    participantId,
                },
            },
            update: {
                size: {
                    increment: BigInt(buffer.length),
                },
                updatedAt: new Date(),
            },
            create: {
                studioId,
                participantId,
                participantName: session.user.name || 'Anonymous',
                fileUrl: objectName,
                size: BigInt(buffer.length),
                status: 'uploading',
            },
        })

        return NextResponse.json({
            success: true,
            chunkIndex,
            objectName,
            recordingId: recording.id,
            totalSize: recording.size.toString(),
        })
    } catch (error) {
        console.error('❌ Error uploading chunk:', error)
        return NextResponse.json(
            { error: 'Failed to upload chunk' },
            { status: 500 }
        )
    }
}
