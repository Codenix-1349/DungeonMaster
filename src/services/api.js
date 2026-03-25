/**
 * API service layer — all backend calls go through here.
 * Handles JWT token management and provides typed fetch wrappers.
 */

const API_BASE = '/api'

// ── Token management ────────────────────────────────────────────────────────

let token = localStorage.getItem('dm_token') || null

export function getToken() { return token }

export function setToken(t) {
  token = t
  if (t) {
    localStorage.setItem('dm_token', t)
  } else {
    localStorage.removeItem('dm_token')
  }
}

// ── Generic fetch wrapper ───────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    setToken(null)
    throw Object.assign(new Error('Sitzung abgelaufen. Bitte erneut einloggen.'), { status: 401 })
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body.error || `API Fehler: ${res.status}`), { status: res.status })
  }

  return res.json()
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function register(email, username, password) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password }),
  })
  setToken(data.token)
  return data.user
}

export async function login(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(data.token)
  return data.user
}

export async function fetchMe() {
  const data = await apiFetch('/auth/me')
  return data.user
}

export function logout() {
  setToken(null)
}

// ── Characters ──────────────────────────────────────────────────────────────

export async function fetchCharacters() {
  return apiFetch('/characters')
}

export async function createCharacter(character) {
  const data = await apiFetch('/characters', {
    method: 'POST',
    body: JSON.stringify({ character }),
  })
  return data.character
}

export async function updateCharacter(id, character) {
  const data = await apiFetch(`/characters/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ character }),
  })
  return data.character
}

export async function deleteCharacterApi(id) {
  return apiFetch(`/characters/${id}`, { method: 'DELETE' })
}

export async function activateCharacter(id) {
  const data = await apiFetch(`/characters/${id}/activate`, { method: 'PUT' })
  return data.activeCharacterId
}

// ── Adventures ──────────────────────────────────────────────────────────────

export async function fetchAdventures() {
  return apiFetch('/adventures')
}

export async function createAdventure(adventure) {
  const data = await apiFetch('/adventures', {
    method: 'POST',
    body: JSON.stringify({ adventure }),
  })
  return data.adventure
}

export async function deleteAdventureApi(id) {
  return apiFetch(`/adventures/${id}`, { method: 'DELETE' })
}

// ── Sessions ────────────────────────────────────────────────────────────────

export async function fetchSessions() {
  return apiFetch('/sessions')
}

export async function createSession(session) {
  const data = await apiFetch('/sessions', {
    method: 'POST',
    body: JSON.stringify({ session }),
  })
  return data.session
}

export async function updateSession(id, patch) {
  const data = await apiFetch(`/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ patch }),
  })
  return data.session
}

export async function deleteSessionApi(id) {
  return apiFetch(`/sessions/${id}`, { method: 'DELETE' })
}

export async function activateSession(id) {
  const data = await apiFetch(`/sessions/${id}/activate`, { method: 'PUT' })
  return data.activeSessionId
}

export async function unloadSession(id) {
  return apiFetch(`/sessions/${id}/unload`, { method: 'POST' })
}

// ── API Config ──────────────────────────────────────────────────────────────

export async function fetchApiConfig() {
  return apiFetch('/api-config')
}

export async function updateApiConfig({ apiKey, modelId }) {
  return apiFetch('/api-config', {
    method: 'PUT',
    body: JSON.stringify({ apiKey, modelId }),
  })
}

// ── Chat (SSE streaming) ────────────────────────────────────────────────────

export async function streamChatProxy({ messages, model, temperature, maxTokens, onChunk }) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}/chat/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages, model, temperature, maxTokens }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Chat Fehler: ${res.status}`)
  }

  if (!res.body) throw new Error('Keine Streaming-Antwort vom Server erhalten.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (!data || data === '[DONE]') continue

      try {
        const json = JSON.parse(data)
        if (json?.error?.message) throw new Error(json.error.message)
        const delta = json?.choices?.[0]?.delta?.content
        if (delta) fullText += delta
      } catch (e) {
        if (e instanceof Error && e.message) throw e
      }
    }
  }

  if (fullText.trim() && onChunk) onChunk(fullText.trim())
  return fullText.trim()
}

export async function testChatConnection(model) {
  const data = await apiFetch('/chat/test', {
    method: 'POST',
    body: JSON.stringify({ model }),
  })
  return data
}
