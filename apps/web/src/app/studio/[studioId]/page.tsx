
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { useSession } from '@/lib/auth-client'
import { IconMicrophone, IconVideo, IconPlayerRecord, IconArrowRight, IconSettings, IconCopy, IconCheck, IconTrash } from '@tabler/icons-react'
import { useStudioStore } from '@/store/studio-store'

import { ThemeToggle } from '@/components/theme-toggle'

// Guest session helpers
function getGuestInfo(): { guestName: string; guestId: string } | null {
    if (typeof window === 'undefined') return null

    let guestName = sessionStorage.getItem('guestName')
    let guestId = sessionStorage.getItem('guestId')

    if (!guestName || !guestId) {
        try {
            const stored = localStorage.getItem('streamside_guest')
            if (stored) {
                const data = JSON.parse(stored)
                if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                    guestName = data.guestName
                    guestId = data.guestId
                    if (guestName && guestId) {
                        sessionStorage.setItem('guestName', guestName)
                        sessionStorage.setItem('guestId', guestId)
                    }
                }
            }
        } catch {
            // Ignore
        }
    }

    if (guestName && guestId) return { guestName, guestId }
    return null
}

export default function StudioPage() {
    const params = useParams()
    const router = useRouter()
    const { data: session, isPending } = useSession()
    const studioId = params?.studioId as string | undefined

    const [studio, setStudio] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [deviceError, setDeviceError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [guestInfo, setGuestInfo] = useState<{ guestName: string; guestId: string } | null>(null)

    // Device state from store
    const {
        cameras,
        microphones,
        selectedCamera,
        selectedMicrophone,
        setDevices,
        setSelectedCamera,
        setSelectedMicrophone
    } = useStudioStore()

    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const info = getGuestInfo()
        if (info) setGuestInfo(info)
    }, [])

    useEffect(() => {
        if (!isPending && !session && !guestInfo) {
            // Delay redirect slightly to ensure we've checked for guest info
            const timer = setTimeout(() => {
                 // Double check guest info
                 const info = getGuestInfo()
                 if (!info) router.push('/auth/signin')
            }, 200)
            return () => clearTimeout(timer)
        }
    }, [isPending, session, guestInfo, router])

    useEffect(() => {
        if (!studioId) return

        async function fetchStudio() {
            try {
                const res = await fetch(`/api/studios/${studioId}`)
                if (res.ok) {
                    const data = await res.json()
                    setStudio(data.studio)
                }
            } catch (error) {
                console.error('Failed to load studio', error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchStudio()
    }, [studioId])

    useEffect(() => {
        async function getDevices() {
            try {
                // Request permissions first
                await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                
                const devices = await navigator.mediaDevices.enumerateDevices()
                const cams = devices.filter(d => d.kind === 'videoinput')
                const mics = devices.filter(d => d.kind === 'audioinput')

                setDevices(cams, mics)
                
                if (cams.length > 0 && !selectedCamera) setSelectedCamera(cams[0].deviceId)
                if (mics.length > 0 && !selectedMicrophone) setSelectedMicrophone(mics[0].deviceId)
            } catch (err) {
                console.error('Device permission error:', err)
                setDeviceError('Camera and microphone access is required to join the studio.')
            }
        }
        getDevices()
    }, [setDevices, selectedCamera, selectedMicrophone, setSelectedCamera, setSelectedMicrophone])

    useEffect(() => {
        if (!selectedCamera || !videoRef.current) return

        let stream: MediaStream | null = null

        async function startPreview() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: selectedCamera || undefined }
                })
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                }
            } catch (err) {
                console.error('Preview error:', err)
            }
        }
        startPreview()

        return () => {
            stream?.getTracks().forEach(t => t.stop())
        }
    }, [selectedCamera])

    const copyInviteLink = () => {
        if (!studio) return
        const url = `${window.location.origin}/invite/${studio.inviteCode}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDeleteStudio = async () => {
        if (!confirm('Are you sure you want to delete this studio? This cannot be undone.')) return
        setIsDeleting(true)
        try {
            await fetch(`/api/studios/${studioId}`, { method: 'DELETE' })
            router.push('/dashboard')
        } catch (error) {
            console.error('Delete failed:', error)
            setIsDeleting(false)
        }
    }

    if (isLoading || isPending) {
         return (
            <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-app)' }}>
                <div className="w-5 h-5 border-2 border-[var(--color-text-muted)] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!studio) return null

    const isHost = session?.user?.id === studio.hostId

    return (
        <div className="min-h-screen p-4 flex items-center justify-center relative" style={{ backgroundColor: 'var(--color-bg-app)' }}>
            <div className="absolute top-4 right-4 z-10">
                <ThemeToggle />
            </div>
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Left: Preview */}
                <div className="space-y-4">
                    <div className="aspect-video rounded-xl overflow-hidden bg-black relative shadow-2xl ring-1 ring-[var(--color-border-subtle)]">
                        {deviceError ? (
                            <div className="absolute inset-0 flex items-center justify-center text-center p-6">
                                <p className="text-sm" style={{ color: 'var(--color-text-danger)' }}>{deviceError}</p>
                            </div>
                        ) : (
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className="w-full h-full object-cover transform scale-x-[-1]" 
                            />
                        )}
                        <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                            <div className="flex-1">
                                <select 
                                    value={selectedCamera || ''} 
                                    onChange={e => setSelectedCamera(e.target.value)}
                                    className="w-full h-9 rounded-lg px-3 text-xs bg-black/50 backdrop-blur text-white border-0 appearance-none"
                                >
                                    {cameras.map(c => <option key={c.deviceId} value={c.deviceId}>{c.label || 'Camera ' + c.deviceId.slice(0,5)}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <select 
                                    value={selectedMicrophone || ''} 
                                    onChange={e => setSelectedMicrophone(e.target.value)}
                                    className="w-full h-9 rounded-lg px-3 text-xs bg-black/50 backdrop-blur text-white border-0 appearance-none"
                                >
                                    {microphones.map(m => <option key={m.deviceId} value={m.deviceId}>{m.label || 'Mic ' + m.deviceId.slice(0,5)}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        <div className="flex items-center gap-1.5">
                            <IconVideo size={16} /> Check Video
                        </div>
                        <div className="flex items-center gap-1.5">
                            <IconMicrophone size={16} /> Check Audio
                        </div>
                    </div>
                </div>

                {/* Right: Info & Actions */}
                <div className="flex flex-col justify-center space-y-8">
                    <div>
                        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{studio.name}</h1>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Ready to join session?</p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => router.push(`/studio/${studioId}/call`)}
                            className="w-full h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: 'var(--color-accent-base)', color: '#fff' }}
                        >
                            Join Studio <IconArrowRight size={18} />
                        </button>
                        
                        <button
                            onClick={() => router.push(`/studio/${studioId}/recordings`)}
                            className="w-full h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                            style={{ backgroundColor: 'var(--color-bg-raised)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
                        >
                            <IconPlayerRecord size={18} stroke={1.5} /> View Recordings
                        </button>
                    </div>

                    {isHost && (
                        <div className="pt-8 border-t border-[var(--color-border-subtle)] space-y-4">
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>Invite Link</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={`${window.location.origin}/invite/${studio.inviteCode}`}
                                        className="flex-1 h-9 rounded-lg px-3 text-xs border-none outline-none"
                                        style={{ backgroundColor: 'var(--color-bg-sunken)', color: 'var(--color-text-secondary)' }}
                                    />
                                    <button 
                                        onClick={copyInviteLink}
                                        className="h-9 px-3 rounded-lg flex items-center justify-center transition-colors"
                                        style={{ backgroundColor: 'var(--color-bg-raised)', border: '1px solid var(--color-border-subtle)', color: copied ? 'var(--color-text-success)' : 'var(--color-text-secondary)' }}
                                    >
                                        {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                    </button>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleDeleteStudio}
                                disabled={isDeleting}
                                className="text-xs flex items-center gap-1.5 hover:underline"
                                style={{ color: 'var(--color-text-danger)' }}
                            >
                                <IconTrash size={14} /> Delete Studio
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
