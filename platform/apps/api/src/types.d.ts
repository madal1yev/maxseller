declare global {
  namespace Express {
    interface Request {
      auth?: {
        sub: string
        role: string
        kind: 'USER' | 'ADMIN'
      }
    }
  }
}

export {}
