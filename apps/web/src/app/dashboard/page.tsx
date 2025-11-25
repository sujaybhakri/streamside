'use client'

import { useSession, authClient } from '@/lib/auth-client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Studio {
    id: string
    name: string
    description: string | null
    inviteCode: string
    createdAt: string
    recordings: Array<{
        id: string
        participantName: string | null
        status: string
        size: string
        createdAt: string
    }>
}

export default function Dashboard() {
    const { data: session, isPending } = useSession()
    const router = useRouter()
    const [newStudioName, setNewStudioName] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [isSigningOut, setIsSigningOut] = useState(false)

    // Redirect to sign in if not authenticated
    useEffect(() => {
        if (!isPending && !session) {
            router.push('/auth/signin')
        }
    }, [isPending, session, router])

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['studios'],
        queryFn: async () => {
            const res = await fetch('/api/studios')
            if (!res.ok) throw new Error('Failed to fetch studios')
            return res.json()
        },
        enabled: !!session && !isPending,
    })

    const createStudio = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newStudioName.trim()) return

        setIsCreating(true)
        try {
            const res = await fetch('/api/studios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newStudioName }),
            })

            if (res.ok) {
                setNewStudioName('')
                refetch()
            }
        } catch (error) {
            console.error('Failed to create studio:', error)
        } finally {
            setIsCreating(false)
        }
    }

    const handleSignOut = async () => {
        try {
            setIsSigningOut(true)
            await authClient.signOut()
            router.push('/auth/signin')
        } catch (error) {
            console.error('Failed to sign out:', error)
        } finally {
            setIsSigningOut(false)
        }
    }

    const studios: Studio[] = data?.studios || []

    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-600">Loading session...</p>
            </div>
        )
    }

    if (!session) {
        return null
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-gray-900">Streamside</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">{session?.user?.email}</span>
                            <button
                                onClick={handleSignOut}
                                disabled={isSigningOut}
                                className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                            >
                                {isSigningOut ? 'Signing out...' : 'Sign out'}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Create Studio Form */}
                <div className="bg-white shadow rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Create New Studio</h2>
                    <form onSubmit={createStudio} className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Studio name"
                            value={newStudioName}
                            onChange={(e) => setNewStudioName(e.target.value)}
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2 border"
                        />
                        <button
                            type="submit"
                            disabled={isCreating || !newStudioName.trim()}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isCreating ? 'Creating...' : 'Create Studio'}
                        </button>
                    </form>
                </div>

                {/* Studios List */}
                <div>
                    <h2 className="text-2xl font-bold mb-4">Your Studios</h2>

                    {isLoading ? (
                        <p className="text-gray-600">Loading studios...</p>
                    ) : studios.length === 0 ? (
                        <div className="bg-white shadow rounded-lg p-8 text-center">
                            <p className="text-gray-500">No studios yet. Create one to get started!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {studios.map((studio) => (
                                <div
                                    key={studio.id}
                                    className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                                    onClick={() => router.push(`/studio/${studio.id}`)}
                                >
                                    <h3 className="text-lg font-semibold mb-2">{studio.name}</h3>
                                    {studio.description && (
                                        <p className="text-sm text-gray-600 mb-4">{studio.description}</p>
                                    )}

                                    <div className="mb-4">
                                        <p className="text-xs text-gray-500 mb-1">Invite Code:</p>
                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                            {studio.inviteCode}
                                        </code>
                                    </div>

                                    <div className="border-t pt-4">
                                        <p className="text-sm text-gray-600">
                                            {studio.recordings.length} recording{studio.recordings.length !== 1 ? 's' : ''}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Created {new Date(studio.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <button className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                                        Enter Studio
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
