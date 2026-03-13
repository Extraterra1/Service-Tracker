const SESSION_DIAGNOSTICS_STORAGE_KEY = 'service_tracker_session_diagnostics_v1'
const DEFAULT_MAX_EVENTS = 80

function getGlobalStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null
    }

    return window.localStorage
  } catch {
    return null
  }
}

function getNowIso() {
  return new Date().toISOString()
}

function createInstallId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `diag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function trimEvents(events, maxEvents) {
  if (events.length <= maxEvents) {
    return events
  }

  return events.slice(events.length - maxEvents)
}

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error ?? 'Unknown error')
}

function sanitizeUsageDetails(usageDetails) {
  if (!usageDetails || typeof usageDetails !== 'object') {
    return null
  }

  return Object.entries(usageDetails).reduce((nextValue, [key, value]) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      nextValue[key] = value
    }
    return nextValue
  }, {})
}

function safeJsonParse(value) {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function createDefaultState({ appVersion, buildId, buildTime }) {
  return {
    meta: {
      appVersion,
      buildId,
      buildTime,
      installId: createInstallId(),
      restoredFromStorage: false,
      bootCount: 0,
      platform: null,
      storage: null,
      serviceWorker: null
    },
    events: [],
    explicitSignOutPending: false,
    hasObservedAuthState: false,
    lastKnownUid: ''
  }
}

function sanitizeUserSnapshot(user) {
  if (!user?.uid) {
    return {
      uid: '',
      isSignedIn: false
    }
  }

  return {
    uid: String(user.uid),
    isAnonymous: Boolean(user.isAnonymous),
    providerCount: Array.isArray(user.providerData) ? user.providerData.length : 0,
    isSignedIn: true
  }
}

export function createSessionDiagnosticsStore({
  storage = getGlobalStorage(),
  now = getNowIso,
  maxEvents = DEFAULT_MAX_EVENTS,
  appVersion = String(import.meta.env.VITE_APP_VERSION ?? ''),
  buildId = String(import.meta.env.VITE_APP_BUILD_ID ?? ''),
  buildTime = String(import.meta.env.VITE_APP_BUILD_TIME ?? '')
} = {}) {
  let persistenceReadError = ''
  const savedState = (() => {
    if (!storage) {
      return null
    }

    try {
      return safeJsonParse(storage.getItem(SESSION_DIAGNOSTICS_STORAGE_KEY))
    } catch (error) {
      persistenceReadError = getErrorMessage(error)
      return null
    }
  })()

  const state =
    savedState && typeof savedState === 'object'
      ? {
          ...createDefaultState({ appVersion, buildId, buildTime }),
          ...savedState,
          meta: {
            ...createDefaultState({ appVersion, buildId, buildTime }).meta,
            ...savedState.meta,
            appVersion,
            buildId,
            buildTime,
            restoredFromStorage: true
          },
          events: Array.isArray(savedState.events) ? trimEvents(savedState.events, maxEvents) : []
        }
      : createDefaultState({ appVersion, buildId, buildTime })

  const appendEvent = (type, payload, { persist = true } = {}) => {
    state.events = trimEvents(
      [
        ...state.events,
        {
          timestamp: now(),
          type,
          payload
        }
      ],
      maxEvents
    )

    if (!persist) {
      return
    }

    if (!storage) {
      return
    }

    try {
      storage.setItem(
        SESSION_DIAGNOSTICS_STORAGE_KEY,
        JSON.stringify({
          meta: state.meta,
          events: state.events,
          explicitSignOutPending: state.explicitSignOutPending,
          hasObservedAuthState: state.hasObservedAuthState,
          lastKnownUid: state.lastKnownUid
        })
      )
    } catch (error) {
      state.events = trimEvents(
        [
          ...state.events,
          {
            timestamp: now(),
            type: 'diagnostics_storage_write_error',
            payload: {
              message: getErrorMessage(error)
            }
          }
        ],
        maxEvents
      )
    }
  }

  if (persistenceReadError) {
    appendEvent(
      'diagnostics_storage_read_error',
      {
        message: persistenceReadError
      },
      { persist: false }
    )
  }

  const persistMeta = () => {
    appendEvent('diagnostics_checkpoint', {}, { persist: true })
    state.events = state.events.filter((event) => event.type !== 'diagnostics_checkpoint')
  }

  return {
    clearExplicitSignOutStart(reason = 'cleared') {
      if (!state.explicitSignOutPending) {
        return
      }

      state.explicitSignOutPending = false
      appendEvent('explicit_sign_out_cleared', { reason })
    },

    getReport() {
      return {
        generatedAt: now(),
        appVersion: state.meta.appVersion,
        buildId: state.meta.buildId,
        buildTime: state.meta.buildTime,
        installId: state.meta.installId,
        bootCount: state.meta.bootCount,
        restoredFromStorage: state.meta.restoredFromStorage,
        platform: state.meta.platform,
        storage: state.meta.storage,
        serviceWorker: state.meta.serviceWorker,
        events: [...state.events]
      }
    },

    getClipboardText() {
      return `Service Tracker Session Diagnostics\n${JSON.stringify(this.getReport(), null, 2)}`
    },

    markExplicitSignOutStart() {
      state.explicitSignOutPending = true
      appendEvent('explicit_sign_out_requested', {})
    },

    recordAppBoot(payload) {
      state.meta.bootCount += 1
      state.meta.platform = {
        ...payload,
        restoredFromStorage: state.meta.restoredFromStorage
      }
      appendEvent('app_boot', state.meta.platform)
    },

    recordAuthState(user) {
      const hasPreviousUser = Boolean(state.lastKnownUid)
      const nextUid = String(user?.uid ?? '').trim()
      const isSignedIn = nextUid.length > 0
      let transition = 'initial'
      let logoutReason = 'none'

      if (state.hasObservedAuthState) {
        if (!hasPreviousUser && isSignedIn) {
          transition = 'signed_in'
        } else if (hasPreviousUser && !isSignedIn) {
          transition = 'signed_out'
          logoutReason = state.explicitSignOutPending ? 'explicit' : 'unexpected'
        } else if (hasPreviousUser && isSignedIn && state.lastKnownUid !== nextUid) {
          transition = 'switched_user'
        } else {
          transition = 'unchanged'
        }
      }

      const payload = {
        ...sanitizeUserSnapshot(user),
        transition,
        logoutReason: transition === 'signed_out' ? logoutReason : 'none'
      }

      state.hasObservedAuthState = true
      state.lastKnownUid = nextUid

      if (transition === 'signed_out') {
        state.explicitSignOutPending = false
      }

      appendEvent('auth_state_changed', payload)
    },

    recordError(type, error, metadata = {}) {
      appendEvent(type, {
        ...metadata,
        message: getErrorMessage(error)
      })
    },

    recordEvent(type, payload = {}) {
      appendEvent(type, payload)
    },

    recordIdTokenChange(user) {
      appendEvent('id_token_changed', sanitizeUserSnapshot(user))
    },

    recordIdTokenTiming({ authTime, issuedAtTime, expirationTime }) {
      appendEvent('id_token_timing', {
        authTime: String(authTime ?? ''),
        issuedAtTime: String(issuedAtTime ?? ''),
        expirationTime: String(expirationTime ?? '')
      })
    },

    recordServiceWorkerStatus(payload) {
      state.meta.serviceWorker = payload
      appendEvent('service_worker_status', payload)
    },

    recordStorageStatus(payload) {
      state.meta.storage = payload
      appendEvent('storage_status', payload)
    },

    replaceMeta(metadata) {
      state.meta = {
        ...state.meta,
        ...metadata
      }
      persistMeta()
    }
  }
}

export const sessionDiagnostics = createSessionDiagnosticsStore()

export function getDisplayModeSnapshot() {
  const standaloneMatch = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: standalone)').matches : false
  const fullscreenMatch = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: fullscreen)').matches : false
  const navigatorStandalone = typeof navigator !== 'undefined' ? Boolean(navigator.standalone) : false

  let displayMode = 'browser'
  if (fullscreenMatch) {
    displayMode = 'fullscreen'
  } else if (standaloneMatch || navigatorStandalone) {
    displayMode = 'standalone'
  }

  return {
    displayMode,
    isStandalone: displayMode !== 'browser',
    navigatorStandalone,
    visibilityState: typeof document !== 'undefined' ? String(document.visibilityState ?? 'unknown') : 'unknown',
    online: typeof navigator !== 'undefined' ? Boolean(navigator.onLine) : true
  }
}

export async function collectStorageDiagnostics({ isStandalone = false, allowPersistAttempt = true } = {}) {
  const result = {
    supported: typeof navigator !== 'undefined' && typeof navigator.storage !== 'undefined',
    persisted: null,
    persistAttempted: false,
    persistGranted: null,
    quota: null,
    usage: null,
    usageDetails: null
  }

  if (!result.supported) {
    return result
  }

  try {
    const estimate = typeof navigator.storage.estimate === 'function' ? await navigator.storage.estimate() : null
    if (estimate) {
      result.quota = typeof estimate.quota === 'number' ? estimate.quota : null
      result.usage = typeof estimate.usage === 'number' ? estimate.usage : null
      result.usageDetails = sanitizeUsageDetails(estimate.usageDetails)
    }
  } catch (error) {
    result.estimateError = getErrorMessage(error)
  }

  try {
    if (typeof navigator.storage.persisted === 'function') {
      result.persisted = await navigator.storage.persisted()
    }
  } catch (error) {
    result.persistedError = getErrorMessage(error)
  }

  if (isStandalone && allowPersistAttempt && result.persisted === false && typeof navigator.storage.persist === 'function') {
    result.persistAttempted = true
    try {
      result.persistGranted = await navigator.storage.persist()
    } catch (error) {
      result.persistError = getErrorMessage(error)
    }
  }

  return result
}

export async function collectServiceWorkerDiagnostics() {
  const result = {
    supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    controllerPresent: false,
    controllerScriptURL: '',
    activeScriptURL: '',
    scope: '',
    buildId: String(import.meta.env.VITE_APP_BUILD_ID ?? ''),
    appVersion: String(import.meta.env.VITE_APP_VERSION ?? '')
  }

  if (!result.supported) {
    return result
  }

  const controller = navigator.serviceWorker.controller
  result.controllerPresent = Boolean(controller)
  result.controllerScriptURL = String(controller?.scriptURL ?? '')

  try {
    const registration =
      typeof navigator.serviceWorker.getRegistration === 'function'
        ? await navigator.serviceWorker.getRegistration()
        : await navigator.serviceWorker.ready
    result.activeScriptURL = String(registration?.active?.scriptURL ?? '')
    result.scope = String(registration?.scope ?? '')
  } catch (error) {
    result.error = getErrorMessage(error)
  }

  return result
}

async function writeTextToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return 'clipboard'
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard API is unavailable.')
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'

  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, text.length)

  const copied = typeof document.execCommand === 'function' ? document.execCommand('copy') : false
  document.body.removeChild(textarea)

  if (!copied) {
    throw new Error('Clipboard copy command was rejected.')
  }

  return 'execCommand'
}

export async function copySessionDiagnosticsToClipboard() {
  sessionDiagnostics.recordEvent('diagnostics_copy_requested')
  const text = sessionDiagnostics.getClipboardText()
  const transport = await writeTextToClipboard(text)
  sessionDiagnostics.recordEvent('diagnostics_copy_succeeded', { transport })
  return text
}
