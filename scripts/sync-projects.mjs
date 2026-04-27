import process from 'node:process'
import { writeProjectSnapshot } from './project-registry.mjs'

const watchMode = process.argv.includes('--watch')
const pollMs = 5000

async function syncProjects() {
  const payload = await writeProjectSnapshot()
  console.log(`[sync-projects] synced ${payload.total} projects`)
}

await syncProjects()

if (watchMode) {
  console.log(`[sync-projects] watching every ${pollMs}ms`)
  setInterval(async () => {
    try {
      await syncProjects()
    } catch (error) {
      console.error('[sync-projects] sync failed', error)
    }
  }, pollMs)
}
