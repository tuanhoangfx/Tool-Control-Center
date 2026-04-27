import http from 'node:http'
import process from 'node:process'
import { collectProjects, runGitAction, writeProjectSnapshot } from './project-registry.mjs'

const host = '127.0.0.1'
const port = 3037

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(`${JSON.stringify(payload)}\n`)
}

function normalizePath(pathname) {
  return pathname.replace(/\/+$/, '') || '/'
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${host}:${port}`)
  const pathname = normalizePath(url.pathname)

  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true })
    return
  }

  try {
    if (req.method === 'GET' && pathname === '/api/health') {
      sendJson(res, 200, { ok: true, service: 'tool-control-center-api' })
      return
    }

    if (req.method === 'GET' && pathname === '/api/projects') {
      const payload = await writeProjectSnapshot()
      sendJson(res, 200, payload)
      return
    }

    if (req.method === 'POST' && pathname === '/api/projects/rescan') {
      const payload = await writeProjectSnapshot()
      sendJson(res, 200, payload)
      return
    }

    if (req.method === 'POST' && pathname.startsWith('/api/projects/')) {
      const match = pathname.match(/^\/api\/projects\/([^/]+)\/git\/(fetch|status|pull)$/)
      if (match) {
        const [, projectId, action] = match
        const projects = await collectProjects()
        const project = projects.find((item) => item.id === projectId)
        if (!project) {
          sendJson(res, 404, { ok: false, message: 'Project not found' })
          return
        }
        if (!project.git?.isRepo) {
          sendJson(res, 400, { ok: false, message: 'Project is not a git repository' })
          return
        }

        const output = await runGitAction(project.localPath, action)
        sendJson(res, 200, { ok: true, action, output })
        return
      }
    }

    sendJson(res, 404, { ok: false, message: 'Not found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    sendJson(res, 500, { ok: false, message })
  }
})

server.listen(port, host, () => {
  console.log(`[control-api] listening on http://${host}:${port}`)
})

process.on('SIGINT', () => {
  server.close(() => process.exit(0))
})
