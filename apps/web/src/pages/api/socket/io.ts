import { Server as HTTPServer } from 'http'
import type { NextApiRequest } from 'next'
import type { NextApiResponseServerIO } from '@streamside/types'
import { initializeSocketServer } from '@/lib/socket'

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseServerIO) {
    if (res.socket.server.io) {
        console.log('Socket.io already initialized')
        res.end()
        return
    }

    console.log('Initializing Socket.io...')
    const httpServer: HTTPServer = res.socket.server as unknown as HTTPServer
    const io = initializeSocketServer(httpServer)

    res.socket.server.io = io
    res.end()
}
