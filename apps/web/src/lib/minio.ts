import * as Minio from 'minio'

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
})

export const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'recordings'

/**
 * Initialize MinIO bucket if it doesn't exist
 */
export async function initializeBucket() {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME)
        if (!exists) {
            await minioClient.makeBucket(BUCKET_NAME, 'us-east-1')
            console.log(`✅ Created MinIO bucket: ${BUCKET_NAME}`)

            // Set bucket policy to allow public read access (optional, for development)
            const policy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: { AWS: ['*'] },
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
                    },
                ],
            }
            await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy))
        }
    } catch (error) {
        console.error('❌ Error initializing MinIO bucket:', error)
        throw error
    }
}

/**
 * Upload a chunk to MinIO
 * @param studioId - Studio ID
 * @param participantId - Participant ID
 * @param chunkIndex - Index of the chunk
 * @param buffer - File buffer
 * @returns Object URL of the uploaded file
 */
export async function uploadChunk(
    studioId: string,
    participantId: string,
    chunkIndex: number,
    buffer: Buffer
): Promise<string> {
    const objectName = `${studioId}/${participantId}/chunk-${chunkIndex.toString().padStart(5, '0')}.webm`

    try {
        await minioClient.putObject(BUCKET_NAME, objectName, buffer, buffer.length, {
            'Content-Type': 'video/webm',
        })

        return objectName
    } catch (error) {
        console.error('❌ Error uploading chunk to MinIO:', error)
        throw error
    }
}

/**
 * Get a presigned URL for downloading a file
 * @param objectName - Object name in MinIO
 * @param expirySeconds - Expiry time in seconds (default: 24 hours)
 * @returns Presigned URL
 */
export async function getPresignedUrl(objectName: string, expirySeconds: number = 86400): Promise<string> {
    try {
        const url = await minioClient.presignedGetObject(BUCKET_NAME, objectName, expirySeconds)
        return url
    } catch (error) {
        console.error('❌ Error generating presigned URL:', error)
        throw error
    }
}

/**
 * List all chunks for a participant
 * @param studioId - Studio ID
 * @param participantId - Participant ID
 * @returns Array of object names
 */
export async function listChunks(studioId: string, participantId: string): Promise<string[]> {
    const prefix = `${studioId}/${participantId}/`
    const chunks: string[] = []

    return new Promise((resolve, reject) => {
        const stream = minioClient.listObjectsV2(BUCKET_NAME, prefix, true)

        stream.on('data', (obj) => {
            if (obj.name) {
                chunks.push(obj.name)
            }
        })

        stream.on('end', () => {
            resolve(chunks.sort())
        })

        stream.on('error', (err) => {
            console.error('❌ Error listing chunks:', err)
            reject(err)
        })
    })
}

/**
 * Delete all chunks for a participant
 * @param studioId - Studio ID
 * @param participantId - Participant ID
 */
export async function deleteParticipantChunks(studioId: string, participantId: string): Promise<void> {
    try {
        const chunks = await listChunks(studioId, participantId)

        if (chunks.length > 0) {
            await minioClient.removeObjects(BUCKET_NAME, chunks)
            console.log(`✅ Deleted ${chunks.length} chunks for participant ${participantId}`)
        }
    } catch (error) {
        console.error('❌ Error deleting participant chunks:', error)
        throw error
    }
}

export { minioClient }
