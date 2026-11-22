import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import type { Readable } from 'node:stream'
import { config } from './config.js'

export interface StoredFile {
  id: string
  key: string
  fileName: string
  mimeType: string
  size: number
}

export interface StorageDriver {
  put(input: { buffer: Buffer; folder: string; fileName: string; mimeType: string }): Promise<StoredFile>
  readStream(key: string): Readable
  delete(key: string): Promise<void>
}

export function safePath(key: string): string {
  const root = path.resolve(config.storageDir)
  const target = path.resolve(root, key)
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error('Noto\'g\'ri fayl yo\'li')
  }
  return target
}

class LocalStorageDriver implements StorageDriver {
  async put({ buffer, folder, fileName, mimeType }: { buffer: Buffer; folder: string; fileName: string; mimeType: string }): Promise<StoredFile> {
    const id = crypto.randomUUID()
    const ext = path.extname(fileName).toLowerCase().slice(0, 10)
    const key = `${folder}/${id}${ext}`
    const target = safePath(key)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, buffer)
    return { id, key, fileName, mimeType, size: buffer.length }
  }

  readStream(key: string): Readable {
    return fs.createReadStream(safePath(key))
  }

  async delete(key: string): Promise<void> {
    const target = safePath(key)
    if (fs.existsSync(target)) fs.unlinkSync(target)
  }
}

/** S3/MinIO uchun interfeys. Provider credentials berilganda shu yerda amalga oshiriladi. */
class S3StorageDriver implements StorageDriver {
  async put(): Promise<StoredFile> {
    throw new Error('S3 storage hali sozlanmagan: STORAGE_DRIVER=local qoldiring yoki S3 credentials bering')
  }
  readStream(): Readable {
    throw new Error('S3 storage hali sozlanmagan')
  }
  async delete(): Promise<void> {
    throw new Error('S3 storage hali sozlanmagan')
  }
}

export const storage: StorageDriver = config.storageDriver === 's3'
  ? new S3StorageDriver()
  : new LocalStorageDriver()

fs.mkdirSync(path.resolve(config.storageDir), { recursive: true })
for (const folder of ['receipts', 'products', 'images']) {
  fs.mkdirSync(path.resolve(config.storageDir, folder), { recursive: true })
}
