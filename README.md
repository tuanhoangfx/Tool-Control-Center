# Tool Control Center

Web control plane for managing all in-progress tools, webapps, and extensions.

## Scope

- Central dashboard for project status, release readiness, and incident visibility.
- Daily operator flow: configure -> run -> monitor -> recover.
- UI follows shared standards from `D:\Dev\Tool\Design.md` and `D:\Dev\Tool\design-base.css`.

## Stack

- React + TypeScript + Vite
- Shared theme tokens via `../../design-base.css`

## Run

```powershell
cd D:\Dev\Tool\Tool-Control-Center
corepack pnpm install
corepack pnpm dev
```

## Build Check

```powershell
corepack pnpm build
```

## Next Steps

- Add project registry data model and persistence layer.
- Add connectors for GitHub repositories and release artifacts.
- Add desktop agent heartbeat channel for local tools.
