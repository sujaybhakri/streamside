import { NextRequest, NextResponse } from 'next/server'
import { generateLiveKitToken } from '@/lib/livekit'
import { auth } from '@/lib/auth'

/**
 * POST /api/livekit-token
 * Generate a LiveKit access token for joining a studio
 * 
 * Body:
 *  - roomName: string (studio ID)
 *  - participantIdentity: string (user ID)
 *  - participantName: string (optional display name)
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

        const body = await req.json()
        const { roomName, participantIdentity, participantName } = body

        if (!roomName || !participantIdentity) {
            return NextResponse.json(
                { error: 'roomName and participantIdentity are required' },
                { status: 400 }
            )
        }

        const token = await generateLiveKitToken(
            roomName,
            participantIdentity,
            participantName || session.user.name || 'Anonymous'
        )

        return NextResponse.json({
            token,
            wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL || 'ws://localhost:7880',
        })
    } catch (error) {
        console.error('❌ Error generating LiveKit token:', error)
        return NextResponse.json(
            { error: 'Failed to generate token' },
            { status: 500 }
        )
    }
}
