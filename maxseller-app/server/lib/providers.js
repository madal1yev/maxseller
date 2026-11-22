// Real SMS/email delivery adapters. Hech qanday mock yoki "soxta yuborildi" yo'q:
// credentials bo'lmaganda aniq xatolik qaytariladi va OTP yozuvi yaratilmaydi.
import nodemailer from 'nodemailer'
import { config } from './core.js'

export class ProviderError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ProviderError'
    this.code = code
  }
}

function shortError(err) {
  const raw = err instanceof Error ? err.message : String(err)
  const secrets = [
    config.providers.sms.twilioToken,
    config.providers.sms.eskizPassword,
    config.providers.email.resendKey,
    config.providers.email.smtpPass,
    config.providers.email.gmailAppPassword,
  ].filter(Boolean)
  let safe = raw.slice(0, 240)
  for (const secret of secrets) safe = safe.split(secret).join('[hidden]')
  return safe
}

async function http(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    const text = await response.text()
    let data = {}
    try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text.slice(0, 200) } }
    if (!response.ok) throw new Error(data?.message || data?.detail || data?.error || `HTTP ${response.status}`)
    return data
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('Provayder javob bermadi (timeout)')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

function smtpOptions() {
  const email = config.providers.email
  if (email.name === 'gmail') {
    const user = email.gmailUser || email.smtpUser
    const pass = email.gmailAppPassword || email.smtpPass
    if (!user || !pass) return null
    return {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      from: email.from || user,
    }
  }
  if (email.name === 'smtp') {
    if (!email.smtpHost || !email.smtpUser || !email.smtpPass || !email.from) return null
    return {
      host: email.smtpHost,
      port: email.smtpPort,
      secure: email.smtpSecure,
      auth: { user: email.smtpUser, pass: email.smtpPass },
      from: email.from,
    }
  }
  return null
}

export function providerStatus() {
  const smsName = config.providers.sms.name
  const emailName = config.providers.email.name
  const smsReady = (smsName === 'twilio'
    && Boolean(config.providers.sms.twilioSid && config.providers.sms.twilioToken && config.providers.sms.twilioFrom))
    || (smsName === 'eskiz'
      && Boolean(config.providers.sms.eskizEmail && config.providers.sms.eskizPassword && config.providers.sms.eskizFrom))
  const emailReady = (emailName === 'resend'
    && Boolean(config.providers.email.resendKey && config.providers.email.from))
    || Boolean(smtpOptions())
  return {
    // SMS kanali o'chirilgan: mijoz faqat email orqali tasdiqlanadi.
    sms: { configured: Boolean(smsReady), enabled: false, provider: smsName || 'none' },
    email: { configured: Boolean(emailReady), provider: emailName || 'none' },
  }
}

async function sendTwilioSms(phone, message) {
  const { twilioSid: sid, twilioToken: token, twilioFrom: from } = config.providers.sms
  const body = new URLSearchParams({ To: phone, From: from, Body: message })
  await http(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })
}

async function sendEskizSms(phone, message) {
  const { eskizEmail, eskizPassword, eskizFrom, eskizUrl } = config.providers.sms
  const base = eskizUrl.replace(/\/$/, '')
  const auth = await http(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: eskizEmail, password: eskizPassword }),
  })
  const accessToken = auth?.data?.token || auth?.token
  if (!accessToken) throw new Error('SMS provayderi token qaytarmadi')
  const digits = String(phone).replace(/\D/g, '')
  await http(`${base}/message/sms/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mobile_phone: digits, message, from: eskizFrom }),
  })
}

async function sendResendEmail(email, message) {
  const { resendKey, from } = config.providers.email
  await http(`${config.providers.email.resendUrl.replace(/\/$/, '')}/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'MaxSeller tasdiqlash kodi',
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>MaxSeller</h2><p>Tasdiqlash kodingiz:</p><div style="font-size:28px;font-weight:700;letter-spacing:6px">${message}</div><p>Kod 5 daqiqa amal qiladi. Agar bu siz bo'lmasangiz, bu xabarga e'tibor bermang.</p></div>`,
    }),
  })
}

async function sendSmtpEmail(email, code) {
  const options = smtpOptions()
  if (!options) throw new ProviderError('EMAIL_PROVIDER_NOT_CONFIGURED', 'Email provayderi sozlanmagan.')
  const transporter = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: options.auth,
    tls: { rejectUnauthorized: config.providers.email.smtpTlsRejectUnauthorized },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  })
  try {
    await transporter.sendMail({
      from: options.from,
      to: email,
      subject: 'MaxSeller tasdiqlash kodi',
      text: `MaxSeller tasdiqlash kodi: ${code}. Ushbu kodni hech kimga bermang. Kod 5 daqiqa amal qiladi.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>MaxSeller</h2><p>Tasdiqlash kodingiz:</p><div style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</div><p>Kod 5 daqiqa amal qiladi. Agar bu siz bo'lmasangiz, bu xabarga e'tibor bermang.</p></div>`,
    })
  } finally {
    transporter.close()
  }
}

// code faqat real provayderga yuboriladi; konsolga/loglarga chiqarilmaydi.
export async function deliverOtp(channel, destination, code) {
  const message = `MaxSeller tasdiqlash kodi: ${code}. Ushbu kodni hech kimga bermang.`
  try {
    if (channel === 'phone') {
      const { name } = config.providers.sms
      if (!providerStatus().sms.configured) {
        throw new ProviderError('SMS_PROVIDER_NOT_CONFIGURED', 'SMS provayderi sozlanmagan. Administrator bilan bog\'laning.')
      }
      if (name === 'twilio') await sendTwilioSms(destination, message)
      else if (name === 'eskiz') await sendEskizSms(destination, message)
      else throw new ProviderError('SMS_PROVIDER_NOT_CONFIGURED', 'Bunday SMS provayderi qo\'llab-quvvatlanmaydi.')
      return { provider: name }
    }
    if (channel === 'email') {
      const { name } = config.providers.email
      if (!providerStatus().email.configured) {
        throw new ProviderError('EMAIL_PROVIDER_NOT_CONFIGURED', 'Email provayderi sozlanmagan. Administrator bilan bog\'laning.')
      }
      if (name === 'resend') await sendResendEmail(destination, code)
      else if (name === 'gmail' || name === 'smtp') await sendSmtpEmail(destination, code)
      else throw new ProviderError('EMAIL_PROVIDER_NOT_CONFIGURED', 'Bunday email provayderi qo\'llab-quvvatlanmaydi.')
      return { provider: name }
    }
    throw new ProviderError('INVALID_CHANNEL', 'Noto\'g\'ri tasdiqlash usuli')
  } catch (err) {
    if (err instanceof ProviderError) throw err
    const codeName = channel === 'phone' ? 'SMS_DELIVERY_FAILED' : 'EMAIL_DELIVERY_FAILED'
    throw new ProviderError(codeName, `${channel === 'phone' ? 'SMS' : 'Email'} yuborilmadi: ${shortError(err)}`)
  }
}
