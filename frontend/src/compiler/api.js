/**
 * API client for the NPC Behavior Compiler backend.
 * Respects VITE_API_URL environment variable if set (for separate frontend/backend deployments on Render),
 * or defaults to relative paths (for unified single-service deployments and local Vite dev proxy).
 */

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

/**
 * Checks backend health and uptime.
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    // Backend offline or unreachable
  }
  return null
}

/**
 * Compiles NPC behavior DSL code via backend compiler API.
 */
export async function compileOnBackend(source) {
  const res = await fetch(`${API_BASE}/api/compile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ source }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Compiler API error (${res.status}): ${text}`)
  }
  return await res.json()
}

/**
 * Fetches compiler preset scripts from the backend.
 */
export async function fetchPresets() {
  const res = await fetch(`${API_BASE}/api/presets`, {
    headers: { 'Accept': 'application/json' },
  })
  if (!res.ok) throw new Error(`Failed to load presets: ${res.statusText}`)
  return await res.json()
}
