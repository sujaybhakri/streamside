import { create } from 'zustand'
import { Room, RemoteParticipant } from 'livekit-client'

interface MediaDevice {
    deviceId: string
    label: string
    kind: MediaDeviceKind
}

interface StudioState {
    // Recording state
    isRecording: boolean
    setIsRecording: (isRecording: boolean) => void

    // LiveKit room
    livekitRoom: Room | null
    setLivekitRoom: (room: Room | null) => void

    // Participants
    participants: RemoteParticipant[]
    setParticipants: (participants: RemoteParticipant[]) => void

    // Media devices
    selectedCamera: string | null
    selectedMicrophone: string | null
    setSelectedCamera: (deviceId: string) => void
    setSelectedMicrophone: (deviceId: string) => void

    // Available devices
    cameras: MediaDevice[]
    microphones: MediaDevice[]
    setDevices: (cameras: MediaDevice[], microphones: MediaDevice[]) => void

    // Local recording chunks uploaded
    chunksUploaded: number
    incrementChunksUploaded: () => void
    resetChunksUploaded: () => void

    // Studio metadata
    studioId: string | null
    participantId: string | null
    setStudioMetadata: (studioId: string, participantId: string) => void

    // Reset all state
    reset: () => void
}

export const useStudioStore = create<StudioState>((set) => ({
    // Recording
    isRecording: false,
    setIsRecording: (isRecording) => set({ isRecording }),

    // LiveKit
    livekitRoom: null,
    setLivekitRoom: (livekitRoom) => set({ livekitRoom }),

    // Participants
    participants: [],
    setParticipants: (participants) => set({ participants }),

    // Media devices
    selectedCamera: null,
    selectedMicrophone: null,
    setSelectedCamera: (selectedCamera) => set({ selectedCamera }),
    setSelectedMicrophone: (selectedMicrophone) => set({ selectedMicrophone }),

    cameras: [],
    microphones: [],
    setDevices: (cameras, microphones) => set({ cameras, microphones }),

    // Upload tracking
    chunksUploaded: 0,
    incrementChunksUploaded: () => set((state) => ({ chunksUploaded: state.chunksUploaded + 1 })),
    resetChunksUploaded: () => set({ chunksUploaded: 0 }),

    // Studio metadata
    studioId: null,
    participantId: null,
    setStudioMetadata: (studioId, participantId) => set({ studioId, participantId }),

    // Reset
    reset: () =>
        set({
            isRecording: false,
            livekitRoom: null,
            participants: [],
            selectedCamera: null,
            selectedMicrophone: null,
            cameras: [],
            microphones: [],
            chunksUploaded: 0,
            studioId: null,
            participantId: null,
        }),
}))
