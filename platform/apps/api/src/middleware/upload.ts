import multer from 'multer'
import path from 'node:path'

export interface UploadRules {
  maxBytes: number
  mimes: readonly string[]
  extensions: readonly string[]
}

export function uploadSingle(field: string, rules: UploadRules) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: rules.maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      const mimeOk = rules.mimes.includes(file.mimetype as never)
      const extOk = rules.extensions.includes(ext as never)
      if (!mimeOk || !extOk) {
        return cb(new Error('Fayl formati noto\'g\'ri. Ruxsat etilgan: ' + rules.extensions.join(', ')))
      }
      cb(null, true)
    },
  })
  return upload.single(field)
}
