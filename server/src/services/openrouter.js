/**
 * Server-side OpenRouter streaming relay.
 * Fetches from OpenRouter API and yields SSE chunks to the client.
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * Sends a streaming chat request to OpenRouter and pipes SSE chunks
 * to the Express response.
 *
 * @param {object} options
 * @param {string} options.apiKey   - Decrypted OpenRouter API key
 * @param {string} options.model    - Model ID (e.g. "google/gemini-2.0-flash-001")
 * @param {Array}  options.messages - Chat messages array
 * @param {number} [options.temperature=0.8]
 * @param {number} [options.maxTokens=4096]
 * @param {import('express').Response} options.res - Express response to stream into
 * @param {AbortSignal} [options.signal] - Optional abort signal
 */
export async function streamChat({ apiKey, model, messages, temperature = 0.8, maxTokens = 4096, res, signal }) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  }

  const MAX_RETRIES = 3
  let upstream
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    upstream = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dungeons-daggers.app',
        'X-Title': 'Dungeons & Daggers - DungeonMaster',
      },
      body: JSON.stringify(body),
      signal,
    })

    if (upstream.status !== 429 || attempt === MAX_RETRIES) break
    // Wait before retry: 1s, 2s, 3s
    const text = await upstream.text().catch(() => '')
    console.warn(`[chat] 429 rate-limited (attempt ${attempt + 1}/${MAX_RETRIES}), retrying...`, text.slice(0, 120))
    await new Promise(r => setTimeout(r, (attempt + 1) * 1000))
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => 'Unknown error')
    const status = upstream.status
    throw Object.assign(new Error(`OpenRouter ${status}: ${text}`), { status })
  }

  // Set up SSE headers and flush immediately so chunks stream through
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders()
  if (res.socket) res.socket.setNoDelay(true)

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // Forward SSE lines directly
        res.write(trimmed + '\n\n')
      }
    }

    // Flush remaining buffer
    if (buffer.trim()) {
      res.write(buffer.trim() + '\n\n')
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    }
  }
}

/**
 * Non-streaming test call — sends a short prompt and returns the response.
 */
export async function testConnection(apiKey, model) {
  const body = {
    model,
    messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
    max_tokens: 10,
    stream: false,
  }

  const resp = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => 'Unknown error')
    throw Object.assign(new Error(`OpenRouter ${resp.status}: ${text}`), { status: resp.status })
  }

  const data = await resp.json()
  return data
}
