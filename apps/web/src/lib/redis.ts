import Redis from 'ioredis'

const getRedisUrl = () => {
    if (process.env.REDIS_URL) {
        return process.env.REDIS_URL
    }
    return 'redis://localhost:6379'
}

export const redis = new Redis(getRedisUrl(), {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
})

redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err)
})

redis.on('connect', () => {
    console.log('✅ Redis connected')
})

export default redis
