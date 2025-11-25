'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/lib/auth-client'
import { useStudioStore } from '@/store/studio-store'

export default function StudioLobby() {
    const params = useParams()
    const router = useRouter()
    const { data: session, isPending } = useSession()
    const studioId = params?.studioId as string | undefined

    const { setSelectedCamera, setSelectedMicrophone, setDevices, selectedCamera, selectedMicrophone, cameras, microphones } =
        useStudioStore()

    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Redirect if not authenticated
    useEffect(() => {
        if (!isPending && !session) {
            router.push('/auth/signin')
        }
    }, [isPending, session, router])

    // Enumerate devices
    useEffect(() => {
        if (!session) return

        async function enumerateDevices() {
            try {
                // Request permissions first
                await navigator.mediaDevices.getUserMedia({ video: true, audio: true })

                const devices = await navigator.mediaDevices.enumerateDevices()
                const cameraDevices = devices.filter((d) => d.kind === 'videoinput')
                const micDevices = devices.filter((d) => d.kind === 'audioinput')

                setDevices(
                    cameraDevices.map((d) => ({ deviceId: d.deviceId, label: d.label, kind: d.kind })),
                    micDevices.map((d) => ({ deviceId: d.deviceId, label: d.label, kind: d.kind }))
                )

                // Set defaults
                if (cameraDevices.length > 0 && !selectedCamera) {
                    setSelectedCamera(cameraDevices[0].deviceId)
                }
                if (micDevices.length > 0 && !selectedMicrophone) {
                    setSelectedMicrophone(micDevices[0].deviceId)
                }

                setIsLoading(false)
            } catch (error) {
                console.error('Failed to enumerate devices:', error)
                setIsLoading(false)
            }
        }

        enumerateDevices()
    }, [session, selectedCamera, selectedMicrophone, setDevices, setSelectedCamera, setSelectedMicrophone])

    // Setup preview stream
    useEffect(() => {
        if (!session || !selectedCamera || !selectedMicrophone) return

        let currentStream: MediaStream | null = null

        async function setupPreview() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: selectedCamera ?? undefined },
                    audio: { deviceId: selectedMicrophone ?? undefined },
                })

                currentStream = stream
                setPreviewStream(stream)

                // Attach to video element
                const videoEl = document.getElementById('preview-video') as HTMLVideoElement
                if (videoEl) {
                    videoEl.srcObject = stream
                }
            } catch (error) {
                console.error('Failed to setup preview:', error)
            }
        }

        setupPreview()

        return () => {
            if (currentStream) {
                currentStream.getTracks().forEach((track) => track.stop())
            }
        }
    }, [session, selectedCamera, selectedMicrophone])

    const joinStudio = useCallback(() => {
        if (studioId) {
            router.push(`/studio/${studioId}/call`)
        }
    }, [router, studioId])

    // Early return after all hooks
    if (!session && !isPending) {
        return null
    }

    if (isPending) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <p className="text-white">Loading...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-gray-800 rounded-xl shadow-2xl p-8">
                <h1 className="text-3xl font-bold text-white mb-8 text-center">Studio Lobby</h1>

                {isLoading ? (
                    <p className="text-white text-center">Loading devices...</p>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Video Preview */}
                        <div>
                            <h2 className="text-white text-lg font-semibold mb-4">Camera Preview</h2>
                            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                                <video
                                    id="preview-video"
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>

                        {/* Device Settings */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">Camera</label>
                                <select
                                    value={selectedCamera || ''}
                                    onChange={(e) => setSelectedCamera(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                >
                                    {cameras.map((camera) => (
                                        <option key={camera.deviceId} value={camera.deviceId}>
                                            {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-white text-sm font-medium mb-2">Microphone</label>
                                <select
                                    value={selectedMicrophone || ''}
                                    onChange={(e) => setSelectedMicrophone(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                >
                                    {microphones.map((mic) => (
                                        <option key={mic.deviceId} value={mic.deviceId}>
                                            {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={joinStudio}
                                    disabled={!selectedCamera || !selectedMicrophone}
                                    className="w-full px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
                                >
                                    Join Studio
                                </button>
                            </div>

                            <div className="pt-4 border-t border-gray-700">
                                <p className="text-gray-400 text-sm">
                                    <strong>Note:</strong> Your video and audio will be recorded locally in high quality
                                    (up to 4K) and uploaded to the server for post-production.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
