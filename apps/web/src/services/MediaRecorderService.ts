/**
 * MediaRecorderService
 * 
 * This service handles local high-quality recording using the MediaRecorder API.
 * It runs in PARALLEL with the LiveKit video call.
 * 
 * Key responsibilities:
 * 1. Capture the highest quality local media stream (4K video, 48kHz audio)
 * 2. Record using MediaRecorder with timeslice (e.g., 10 seconds)
 * 3. Progressively upload chunks to the server as they're generated
 * 4. Handle errors gracefully (if upload fails, retry or queue)
 * 
 * Why separate from LiveKit?
 * - LiveKit stream is optimized for real-time (lower quality, adaptive bitrate)
 * - Local recording captures maximum quality for post-production
 * - If network fails, LiveKit disconnects but local recording continues
 * - Chunks are uploaded progressively, so if browser crashes, only last 10s is lost
 */

export class MediaRecorderService {
    private mediaRecorder: MediaRecorder | null = null
    private localStream: MediaStream | null = null
    private chunkIndex = 0
    private studioId: string
    private participantId: string
    private isRecording = false

    // Callbacks
    private onChunkUploaded?: (chunkIndex: number) => void
    private onError?: (error: Error) => void

    constructor(
        studioId: string,
        participantId: string,
        callbacks?: {
            onChunkUploaded?: (chunkIndex: number) => void
            onError?: (error: Error) => void
        }
    ) {
        this.studioId = studioId
        this.participantId = participantId
        this.onChunkUploaded = callbacks?.onChunkUploaded
        this.onError = callbacks?.onError
    }

    /**
     * Initialize the high-quality local media stream
     * This is separate from the LiveKit stream
     */
    async initializeStream(): Promise<MediaStream> {
        try {
            // Request the highest quality possible
            // Note: Actual quality depends on the device's capabilities
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 3840 }, // 4K
                    height: { ideal: 2160 },
                    frameRate: { ideal: 60 },
                },
                audio: {
                    sampleRate: { ideal: 48000 },
                    channelCount: { ideal: 2 },
                    echoCancellation: false, // We want raw audio for post-production
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            })

            this.localStream = stream
            return stream
        } catch (error) {
            const err = error as Error
            console.error('❌ Failed to initialize high-quality stream:', err)
            this.onError?.(err)
            throw err
        }
    }

    /**
     * Start recording
     * Creates a MediaRecorder with a timeslice (default 10s)
     * Each chunk is automatically uploaded when available
     */
    async startRecording(timeslice: number = 10000) {
        if (this.isRecording) {
            console.warn('⚠️ Recording already in progress')
            return
        }

        if (!this.localStream) {
            await this.initializeStream()
        }

        if (!this.localStream) {
            throw new Error('Failed to initialize media stream')
        }

        try {
            // Create MediaRecorder with the highest quality codec
            // WebM with VP9 is widely supported and produces high quality
            const options: MediaRecorderOptions = {
                mimeType: 'video/webm;codecs=vp9,opus',
                videoBitsPerSecond: 8000000, // 8 Mbps - very high quality
                audioBitsPerSecond: 256000,  // 256 kbps - studio quality
            }

            // Fallback to VP8 if VP9 is not supported
            if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
                options.mimeType = 'video/webm;codecs=vp8,opus'
            }

            this.mediaRecorder = new MediaRecorder(this.localStream, options)

            // This event fires every `timeslice` milliseconds with a new chunk
            this.mediaRecorder.ondataavailable = async (event) => {
                if (event.data && event.data.size > 0) {
                    console.log(`📦 Chunk ${this.chunkIndex} available (${(event.data.size / 1024 / 1024).toFixed(2)} MB)`)

                    try {
                        await this.uploadChunk(event.data, this.chunkIndex)
                        this.onChunkUploaded?.(this.chunkIndex)
                        this.chunkIndex++
                    } catch (error) {
                        const err = error as Error
                        console.error(`❌ Failed to upload chunk ${this.chunkIndex}:`, err)
                        this.onError?.(err)
                        // TODO: Implement retry logic or queue failed chunks
                    }
                }
            }

            this.mediaRecorder.onerror = (event) => {
                const err = new Error(`MediaRecorder error: ${(event as any).error}`)
                console.error('❌ MediaRecorder error:', err)
                this.onError?.(err)
            }

            this.mediaRecorder.onstop = () => {
                console.log('⏹️ MediaRecorder stopped')
                this.isRecording = false
            }

            // Start recording with timeslice
            this.mediaRecorder.start(timeslice)
            this.isRecording = true
            console.log(`🔴 Started recording with ${timeslice}ms timeslice`)
        } catch (error) {
            const err = error as Error
            console.error('❌ Failed to start recording:', err)
            this.onError?.(err)
            throw err
        }
    }

    /**
     * Stop recording
     * This will trigger one final `ondataavailable` event with the remaining data
     */
    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            console.warn('⚠️ No active recording to stop')
            return
        }

        this.mediaRecorder.stop()
        console.log('⏹️ Stopping recording...')
    }

    /**
     * Upload a single chunk to the server
     */
    private async uploadChunk(blob: Blob, chunkIndex: number): Promise<void> {
        const formData = new FormData()
        formData.append('chunk', blob)
        formData.append('studioId', this.studioId)
        formData.append('participantId', this.participantId)
        formData.append('chunkIndex', chunkIndex.toString())

        const response = await fetch('/api/upload-chunk', {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to upload chunk')
        }

        const result = await response.json()
        console.log(`✅ Chunk ${chunkIndex} uploaded successfully:`, result)
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop()
        }

        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => track.stop())
            this.localStream = null
        }

        this.mediaRecorder = null
        this.chunkIndex = 0
        this.isRecording = false
    }

    /**
     * Get the current recording state
     */
    getState() {
        return {
            isRecording: this.isRecording,
            chunkIndex: this.chunkIndex,
            hasStream: !!this.localStream,
        }
    }
}
