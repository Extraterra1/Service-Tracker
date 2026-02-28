import { initializeApp } from 'firebase-admin/app'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { defineSecret } from 'firebase-functions/params'
import { logger, setGlobalOptions } from 'firebase-functions/v2'
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https'

initializeApp()

const db = getFirestore()

setGlobalOptions({
  region: 'europe-west9',
  maxInstances: 10,
})

const TELEGRAM_BOT_TOKEN = defineSecret('TELEGRAM_BOT_TOKEN')
const TELEGRAM_ADMIN_CHAT_ID = defineSecret('TELEGRAM_ADMIN_CHAT_ID')
const TELEGRAM_WEBHOOK_SECRET = defineSecret('TELEGRAM_WEBHOOK_SECRET')

const TELEGRAM_NOTIFICATION_COOLDOWN_MS = 15 * 60 * 1000
const CALLBACK_PREFIX = 'apr'
const CALLBACK_ACTIONS = {
  a: 'approve',
  d: 'deny',
  b: 'block',
}
const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DENIED: 'denied',
  BLOCKED: 'blocked',
}

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

function normalizeStatus(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (
    normalized === REQUEST_STATUS.PENDING ||
    normalized === REQUEST_STATUS.APPROVED ||
    normalized === REQUEST_STATUS.DENIED ||
    normalized === REQUEST_STATUS.BLOCKED
  ) {
    return normalized
  }
  return 'unknown'
}

function timestampToMs(value) {
  if (value instanceof Timestamp) {
    return value.toMillis()
  }

  if (value?.toMillis instanceof Function) {
    return value.toMillis()
  }

  return 0
}

function shouldSendNotification(lastNotificationAt, nowTimestamp) {
  if (!lastNotificationAt) {
    return true
  }

  const nowMs = timestampToMs(nowTimestamp)
  const lastMs = timestampToMs(lastNotificationAt)
  if (!lastMs || !nowMs) {
    return true
  }

  return nowMs - lastMs >= TELEGRAM_NOTIFICATION_COOLDOWN_MS
}

function formatUserLabel({ displayName, email, uid }) {
  if (displayName) {
    return displayName
  }

  if (email) {
    return email
  }

  return uid
}

function formatRequestMessage(requestData) {
  const label = formatUserLabel(requestData)
  const lines = [
    'Novo pedido de acesso',
    '',
    `Nome: ${label}`,
    `Email: ${requestData.email || '-'}`,
    `UID: ${requestData.uid}`,
    `Tentativas: ${requestData.requestCount}`,
  ]

  return lines.join('\n')
}

function formatResolvedMessage({ status, requestData }) {
  const label = formatUserLabel(requestData)

  let headline = 'Pedido atualizado'
  if (status === REQUEST_STATUS.APPROVED) {
    headline = 'Pedido aprovado'
  }
  if (status === REQUEST_STATUS.DENIED) {
    headline = 'Pedido negado'
  }
  if (status === REQUEST_STATUS.BLOCKED) {
    headline = 'Pedido bloqueado'
  }

  return [
    headline,
    '',
    `Nome: ${label}`,
    `Email: ${requestData.email || '-'}`,
    `UID: ${requestData.uid}`,
  ].join('\n')
}

function buildKeyboard(uid) {
  return {
    inline_keyboard: [
      [
        { text: 'Aprovar', callback_data: `${CALLBACK_PREFIX}|a|${uid}` },
        { text: 'Negar', callback_data: `${CALLBACK_PREFIX}|d|${uid}` },
        { text: 'Bloquear', callback_data: `${CALLBACK_PREFIX}|b|${uid}` },
      ],
    ],
  }
}

async function callTelegramApi(botToken, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const parsed = await response.json().catch(() => ({}))
  if (!response.ok || !parsed?.ok) {
    const description = parsed?.description ? ` ${parsed.description}` : ''
    throw new Error(`Telegram ${method} failed (${response.status}).${description}`)
  }

  return parsed.result
}

async function sendApprovalTelegramMessage({ botToken, chatId, requestData }) {
  const result = await callTelegramApi(botToken, 'sendMessage', {
    chat_id: chatId,
    text: formatRequestMessage(requestData),
    reply_markup: buildKeyboard(requestData.uid),
    disable_web_page_preview: true,
  })

  return {
    messageId: Number(result?.message_id ?? 0) || null,
    chatId: String(result?.chat?.id ?? chatId),
  }
}

async function editApprovalTelegramMessage({ botToken, chatId, messageId, requestData, status }) {
  if (!chatId || !messageId) {
    return
  }

  await callTelegramApi(botToken, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: formatResolvedMessage({ status, requestData }),
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [],
    },
  })
}

async function answerCallback({ botToken, callbackId, text }) {
  if (!callbackId) {
    return
  }

  try {
    await callTelegramApi(botToken, 'answerCallbackQuery', {
      callback_query_id: callbackId,
      text,
      show_alert: false,
    })
  } catch (error) {
    logger.warn('Failed to answer callback query', { error: error.message })
  }
}

function parseCallbackData(raw) {
  const value = String(raw ?? '')
  const parts = value.split('|')
  if (parts.length !== 3 || parts[0] !== CALLBACK_PREFIX) {
    return null
  }

  const actionCode = parts[1]
  const uid = parts[2]
  if (!CALLBACK_ACTIONS[actionCode] || !uid) {
    return null
  }

  return {
    actionCode,
    action: CALLBACK_ACTIONS[actionCode],
    uid,
  }
}

function mapRequestState(status) {
  if (status === REQUEST_STATUS.APPROVED) {
    return 'allowed'
  }

  if (status === REQUEST_STATUS.BLOCKED) {
    return 'blocked'
  }

  if (status === REQUEST_STATUS.DENIED) {
    return 'denied'
  }

  return 'pending'
}

async function markRequestBlockedByList({ requestRef, requestSnap, identity, now }) {
  const requestCount = requestSnap.exists ? Number(requestSnap.get('requestCount') ?? 0) + 1 : 1
  const createdAt = requestSnap.exists ? requestSnap.get('createdAt') ?? now : now

  await requestRef.set(
    {
      uid: identity.uid,
      email: identity.email,
      emailNormalized: identity.emailNormalized,
      displayName: identity.displayName,
      photoURL: identity.photoURL,
      status: REQUEST_STATUS.BLOCKED,
      createdAt,
      updatedAt: now,
      lastRequestedAt: now,
      requestCount,
      notificationState: 'skipped',
      notificationError: '',
      decisionType: 'block',
      decisionAt: now,
      decisionByChatId: 'system:blocklist',
    },
    { merge: true }
  )
}

export const requestAccessApproval = onCall(
  {
    secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required.')
    }

    const uid = request.auth.uid
    const identity = {
      uid,
      email: String(request.auth.token?.email ?? '').trim(),
      emailNormalized: normalizeEmail(request.auth.token?.email),
      displayName: String(request.auth.token?.name ?? '').trim(),
      photoURL: String(request.auth.token?.picture ?? '').trim(),
    }

    const now = Timestamp.now()
    const allowlistRef = db.doc(`staff_allowlist/${uid}`)
    const requestRef = db.doc(`access_requests/${uid}`)
    const blockUidRef = db.doc(`access_blocks_uid/${uid}`)
    const blockEmailRef = identity.emailNormalized
      ? db.doc(`access_blocks_email/${identity.emailNormalized}`)
      : null

    const [allowlistSnap, requestSnap, blockedUidSnap, blockedEmailSnap] = await Promise.all([
      allowlistRef.get(),
      requestRef.get(),
      blockUidRef.get(),
      blockEmailRef ? blockEmailRef.get() : Promise.resolve(null),
    ])

    if (allowlistSnap.exists && allowlistSnap.get('active') === true) {
      return {
        state: 'allowed',
        requestStatus: REQUEST_STATUS.APPROVED,
        message: 'Acesso autorizado.',
      }
    }

    const blockedByList = blockedUidSnap.exists || Boolean(blockedEmailSnap?.exists)
    if (blockedByList) {
      await markRequestBlockedByList({ requestRef, requestSnap, identity, now })
      return {
        state: 'blocked',
        requestStatus: REQUEST_STATUS.BLOCKED,
        message: 'A tua conta está bloqueada. Contacta o administrador.',
      }
    }

    const existingStatus = requestSnap.exists ? normalizeStatus(requestSnap.get('status')) : 'unknown'
    if (existingStatus === REQUEST_STATUS.DENIED) {
      return {
        state: 'denied',
        requestStatus: REQUEST_STATUS.DENIED,
        message: 'Pedido recusado. Contacta o administrador para reabrir.',
      }
    }

    if (existingStatus === REQUEST_STATUS.BLOCKED) {
      return {
        state: 'blocked',
        requestStatus: REQUEST_STATUS.BLOCKED,
        message: 'A tua conta está bloqueada. Contacta o administrador.',
      }
    }

    const existingData = requestSnap.exists ? requestSnap.data() : {}
    const requestCount = Number(existingData?.requestCount ?? 0) + 1
    const createdAt = existingData?.createdAt instanceof Timestamp ? existingData.createdAt : now
    const shouldNotify =
      existingStatus !== REQUEST_STATUS.PENDING ||
      shouldSendNotification(existingData?.lastNotificationAt ?? null, now)

    const pendingRequestData = {
      uid: identity.uid,
      email: identity.email,
      emailNormalized: identity.emailNormalized,
      displayName: identity.displayName,
      photoURL: identity.photoURL,
      status: REQUEST_STATUS.PENDING,
      createdAt,
      updatedAt: now,
      lastRequestedAt: now,
      requestCount,
      notificationState: shouldNotify ? 'pending' : 'skipped',
      notificationError: '',
      decisionType: '',
      decisionAt: null,
      decisionByChatId: '',
    }

    await requestRef.set(pendingRequestData, { merge: true })

    if (!shouldNotify) {
      return {
        state: 'pending',
        requestStatus: REQUEST_STATUS.PENDING,
        message: 'Pedido já enviado. Aguarda aprovação no Telegram.',
      }
    }

    const botToken = TELEGRAM_BOT_TOKEN.value()
    const adminChatId = TELEGRAM_ADMIN_CHAT_ID.value()

    try {
      const notification = await sendApprovalTelegramMessage({
        botToken,
        chatId: adminChatId,
        requestData: pendingRequestData,
      })

      await requestRef.set(
        {
          lastNotificationAt: now,
          notificationState: 'sent',
          notificationError: '',
          telegramMessageId: notification.messageId,
          telegramChatId: notification.chatId,
          updatedAt: now,
        },
        { merge: true }
      )

      return {
        state: 'pending',
        requestStatus: REQUEST_STATUS.PENDING,
        message: 'Pedido enviado. Aguarda aprovação no Telegram.',
      }
    } catch (error) {
      logger.error('Failed to send Telegram approval message', {
        uid,
        error: error.message,
      })

      await requestRef.set(
        {
          notificationState: 'failed',
          notificationError: String(error.message ?? 'unknown_error').slice(0, 500),
          updatedAt: now,
        },
        { merge: true }
      )

      return {
        state: 'pending',
        requestStatus: REQUEST_STATUS.PENDING,
        message: 'Pedido registado, mas falhou o envio no Telegram. Contacta o administrador.',
      }
    }
  }
)

export const telegramWebhook = onRequest(
  {
    secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, TELEGRAM_WEBHOOK_SECRET],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'method_not_allowed' })
      return
    }

    const headerSecret = String(req.get('x-telegram-bot-api-secret-token') ?? '')
    const expectedSecret = TELEGRAM_WEBHOOK_SECRET.value()
    if (!headerSecret || headerSecret !== expectedSecret) {
      res.status(401).json({ ok: false, error: 'invalid_secret' })
      return
    }

    const update = req.body ?? {}
    const callbackQuery = update?.callback_query
    if (!callbackQuery) {
      res.status(200).json({ ok: true, ignored: true })
      return
    }

    const botToken = TELEGRAM_BOT_TOKEN.value()
    const adminChatId = String(TELEGRAM_ADMIN_CHAT_ID.value())
    const callbackId = String(callbackQuery?.id ?? '')
    const callbackData = parseCallbackData(callbackQuery?.data)
    const callbackChatId = String(callbackQuery?.message?.chat?.id ?? '')

    if (callbackChatId !== adminChatId) {
      await answerCallback({
        botToken,
        callbackId,
        text: 'Chat não autorizado.',
      })
      res.status(200).json({ ok: true, ignored: 'unauthorized_chat' })
      return
    }

    if (!callbackData) {
      await answerCallback({
        botToken,
        callbackId,
        text: 'Ação inválida.',
      })
      res.status(200).json({ ok: true, ignored: 'invalid_callback' })
      return
    }

    const { uid, action } = callbackData
    const requestRef = db.doc(`access_requests/${uid}`)
    const allowlistRef = db.doc(`staff_allowlist/${uid}`)

    try {
      const result = await db.runTransaction(async (transaction) => {
        const requestSnap = await transaction.get(requestRef)
        if (!requestSnap.exists) {
          return {
            state: 'missing',
            status: 'missing',
            requestData: {
              uid,
              email: '',
              displayName: '',
            },
          }
        }

        const requestData = requestSnap.data()
        const currentStatus = normalizeStatus(requestData.status)
        if (currentStatus !== REQUEST_STATUS.PENDING) {
          return {
            state: 'already_resolved',
            status: currentStatus,
            requestData,
          }
        }

        const now = Timestamp.now()
        const email = String(requestData.email ?? '').trim()
        const emailNormalized = normalizeEmail(requestData.emailNormalized || email)
        const displayName = String(requestData.displayName ?? '').trim()
        const patch = {
          updatedAt: now,
          decisionAt: now,
          decisionByChatId: callbackChatId,
          notificationError: '',
        }

        if (action === 'approve') {
          transaction.set(
            allowlistRef,
            {
              active: true,
              role: 'staff',
              uid,
              email,
              displayName,
              approvedAt: now,
              approvedBy: 'telegram',
              approvedByChatId: callbackChatId,
            },
            { merge: true }
          )

          transaction.update(requestRef, {
            ...patch,
            status: REQUEST_STATUS.APPROVED,
            decisionType: 'approve',
          })

          return {
            state: 'updated',
            status: REQUEST_STATUS.APPROVED,
            requestData,
          }
        }

        if (action === 'deny') {
          transaction.update(requestRef, {
            ...patch,
            status: REQUEST_STATUS.DENIED,
            decisionType: 'deny',
          })

          return {
            state: 'updated',
            status: REQUEST_STATUS.DENIED,
            requestData,
          }
        }

        const blockUidRef = db.doc(`access_blocks_uid/${uid}`)
        const blockEmailRef = emailNormalized
          ? db.doc(`access_blocks_email/${emailNormalized}`)
          : null

        transaction.set(
          blockUidRef,
          {
            uid,
            emailNormalized,
            blockedAt: now,
            blockedByChatId: callbackChatId,
            reason: 'telegram_block',
          },
          { merge: true }
        )

        if (blockEmailRef) {
          transaction.set(
            blockEmailRef,
            {
              emailNormalized,
              lastUid: uid,
              blockedAt: now,
              blockedByChatId: callbackChatId,
              reason: 'telegram_block',
            },
            { merge: true }
          )
        }

        transaction.update(requestRef, {
          ...patch,
          status: REQUEST_STATUS.BLOCKED,
          decisionType: 'block',
        })

        return {
          state: 'updated',
          status: REQUEST_STATUS.BLOCKED,
          requestData,
        }
      })

      const callbackText =
        result.state === 'updated'
          ? `Pedido ${result.status}.`
          : result.state === 'already_resolved'
            ? `Já resolvido: ${result.status}.`
            : 'Pedido não encontrado.'

      await answerCallback({
        botToken,
        callbackId,
        text: callbackText,
      })

      const messageId = Number(callbackQuery?.message?.message_id ?? 0) || null
      if (messageId && result.requestData) {
        await editApprovalTelegramMessage({
          botToken,
          chatId: callbackChatId,
          messageId,
          requestData: {
            uid,
            email: String(result.requestData.email ?? ''),
            displayName: String(result.requestData.displayName ?? ''),
          },
          status: result.status,
        })
      }

      res.status(200).json({
        ok: true,
        state: result.state,
        status: result.status,
        mappedState: mapRequestState(result.status),
      })
    } catch (error) {
      logger.error('telegramWebhook failed', {
        uid,
        action,
        error: error.message,
      })

      await answerCallback({
        botToken,
        callbackId,
        text: 'Erro interno ao processar. Tenta novamente.',
      })

      res.status(500).json({ ok: false, error: 'internal_error' })
    }
  }
)
