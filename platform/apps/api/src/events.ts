import type { Response } from 'express'

const clients = new Set<Response>()

export function registerEventsClient(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  res.write('event: hello\ndata: {}\n\n')

  clients.add(res)
  const ping = setInterval(() => {
    res.write(': ping\n\n')
  }, 20000)

  reqClose(res, () => {
    clearInterval(ping)
    clients.delete(res)
  })
}

function reqClose(res: Response, handler: () => void) {
  res.on('close', handler)
  res.on('end', handler)
}

export function emitEvent(type: 'products' | 'orders' | 'settings' | 'notifications', payload: Record<string, unknown> = {}) {
  const message = `event: ${type}\ndata: ${JSON.stringify({ ...payload, at: Date.now() })}\n\n`
  for (const res of clients) {
    try { res.write(message) } catch { clients.delete(res) }
  }
}
