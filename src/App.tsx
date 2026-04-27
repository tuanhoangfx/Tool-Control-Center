import { useEffect, useMemo, useState } from 'react'
import './App.css'

type GitInfo = {
  isRepo: boolean
  branch: string | null
  summary: string | null
  remote: string | null
  lastCommit: string | null
}

type Project = {
  id: string
  name: string
  source: string
  localPath: string
  type: string
  status: string
  version: string
  tech: string
  github: string | null
  git: GitInfo
  features: string[]
}

type Snapshot = {
  generatedAt: string
  total: number
  projects: Project[]
}

const REFRESH_MS = 10000

function statusClass(status: string) {
  if (status === 'repo') return 'success'
  if (status === 'detected') return 'warning'
  return 'error'
}

function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [actionOutput, setActionOutput] = useState('')

  const loadProjects = async (rescan = false) => {
    if (rescan) setBusy(true)
    try {
      const response = await fetch(rescan ? '/api/projects/rescan' : '/api/projects', {
        method: rescan ? 'POST' : 'GET',
      })
      if (!response.ok) throw new Error('Khong tai duoc du lieu project')
      const payload = (await response.json()) as Snapshot
      setSnapshot(payload)
      if (!selectedId && payload.projects[0]) {
        setSelectedId(payload.projects[0].id)
      }
      if (selectedId && !payload.projects.some((p) => p.id === selectedId)) {
        setSelectedId(payload.projects[0]?.id ?? null)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setActionOutput(message)
    } finally {
      setLoading(false)
      setBusy(false)
    }
  }

  useEffect(() => {
    void loadProjects()
    const timer = window.setInterval(() => {
      void loadProjects()
    }, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [])

  const filteredProjects = useMemo(() => {
    const items = snapshot?.projects ?? []
    const keyword = search.trim().toLowerCase()
    if (!keyword) return items
    return items.filter((project) => {
      return (
        project.name.toLowerCase().includes(keyword) ||
        project.source.toLowerCase().includes(keyword) ||
        project.tech.toLowerCase().includes(keyword) ||
        project.version.toLowerCase().includes(keyword)
      )
    })
  }, [search, snapshot?.projects])

  const selectedProject =
    filteredProjects.find((project) => project.id === selectedId) ??
    filteredProjects[0] ??
    null

  const runGitAction = async (action: 'fetch' | 'status' | 'pull') => {
    if (!selectedProject) return
    setBusy(true)
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/git/${action}`, {
        method: 'POST',
      })
      const payload = (await response.json()) as { ok: boolean; message?: string; output?: string }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? 'Git action failed')
      }
      setActionOutput(payload.output ?? 'Done')
      await loadProjects()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setActionOutput(message)
    } finally {
      setBusy(false)
    }
  }

  const totalProjects = snapshot?.total ?? 0
  const repoProjects = snapshot?.projects.filter((project) => project.git.isRepo).length ?? 0
  const githubLinked = snapshot?.projects.filter((project) => Boolean(project.github)).length ?? 0

  return (
    <div className="shell theme-dark app-shell">
      <aside className="sidebar card">
        <button className="icon-nav active" type="button" title="Dashboard">
          DB
        </button>
        <button className="icon-nav" type="button" title="Projects">
          PR
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar card">
          <div className="stack-8">
            <h1>Tool Control Center</h1>
            <p className="muted">
              Quan tri profile theo folder local, github, version, feature, va git sync.
            </p>
          </div>
          <div className="row-10">
            <span className="api-pill connected">API Ready</span>
            <button className="primary" type="button" onClick={() => void loadProjects(true)} disabled={busy}>
              Rescan Now
            </button>
          </div>
        </header>

        <section className="overview-grid">
          <article className="card metric">
            <p className="muted">Total Profiles</p>
            <strong>{totalProjects}</strong>
          </article>
          <article className="card metric">
            <p className="muted">Git Repositories</p>
            <strong>{repoProjects}</strong>
          </article>
          <article className="card metric">
            <p className="muted">GitHub Linked</p>
            <strong>{githubLinked}</strong>
          </article>
          <article className="card metric">
            <p className="muted">Last Sync</p>
            <strong className="sync-text">
              {snapshot?.generatedAt ? new Date(snapshot.generatedAt).toLocaleTimeString() : '--:--'}
            </strong>
          </article>
        </section>

        <section className="main-grid">
          <section className="card projects-panel stack-12">
            <div className="panel-header">
              <h2>Profiles</h2>
              <input
                type="text"
                placeholder="Search profile..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <table className="project-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Version</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="empty-row muted">
                      Dang tai profiles...
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-row muted">
                      Khong co profile nao.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project) => (
                    <tr
                      key={project.id}
                      className={selectedProject?.id === project.id ? 'row-active' : ''}
                      onClick={() => setSelectedId(project.id)}
                    >
                      <td>{project.name}</td>
                      <td>{project.source}</td>
                      <td>{project.type}</td>
                      <td>{project.version}</td>
                      <td>
                        <span className={`status-pill ${statusClass(project.status)}`}>{project.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="card detail-panel stack-12">
            <h2>Profile Detail</h2>
            {selectedProject ? (
              <>
                <div className="detail-grid">
                  <p className="muted">Local Folder</p>
                  <p className="mono-cell">{selectedProject.localPath}</p>
                  <p className="muted">GitHub</p>
                  <p className="mono-cell">{selectedProject.github ?? 'Not linked'}</p>
                  <p className="muted">Branch</p>
                  <p>{selectedProject.git.branch ?? 'n/a'}</p>
                  <p className="muted">Last Commit</p>
                  <p>{selectedProject.git.lastCommit ?? 'n/a'}</p>
                  <p className="muted">Tech Stack</p>
                  <p>{selectedProject.tech}</p>
                </div>

                <div className="row-8">
                  <button className="ghost" type="button" disabled={busy} onClick={() => void runGitAction('status')}>
                    Git Status
                  </button>
                  <button className="ghost" type="button" disabled={busy} onClick={() => void runGitAction('fetch')}>
                    Git Fetch
                  </button>
                  <button className="primary" type="button" disabled={busy} onClick={() => void runGitAction('pull')}>
                    Git Pull
                  </button>
                </div>

                <div className="stack-8">
                  <p className="muted">Features</p>
                  {selectedProject.features.length > 0 ? (
                    <ul className="feature-list">
                      {selectedProject.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Chua co feature docs, da tao PROJECT_INFO.md de bo sung.</p>
                  )}
                </div>

                <div className="console-box">
                  <p className="muted">Action Output</p>
                  <pre>{actionOutput || 'No output yet.'}</pre>
                </div>
              </>
            ) : (
              <p className="muted">Chon mot profile de xem thong tin chi tiet.</p>
            )}
          </section>
        </section>
      </main>
    </div>
  )
}

export default App
