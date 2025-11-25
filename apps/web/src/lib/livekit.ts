import { AccessToken } from 'livekit-server-sdk'

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey'
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret'

/**
 * Generate a LiveKit access token for a participant
 * @param roomName - Name of the room (studio ID)
 * @param participantIdentity - Unique identifier for the participant
 * @param participantName - Display name for the participant
 * @returns JWT token string
 */
export async function generateLiveKitToken(
    roomName: string,
    participantIdentity: string,
    participantName?: string
): Promise<string> {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: participantIdentity,
        name: participantName,
    })

    at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
    })

    return at.toJwt()
}

/**
 * Validate LiveKit configuration
 */
export function validateLiveKitConfig(): boolean {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        console.error('❌ LiveKit API key or secret not configured')
        return false
    }
    return true
}
