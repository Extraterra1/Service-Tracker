import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebaseDb'
import { toTimestampMs } from './timestamp'

const ACCESS_REQUEST_COLLECTION = 'access_requests'

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

function getActorName(user) {
  const displayName = normalizeText(user?.displayName)
  if (displayName) {
    return displayName
  }

  return normalizeText(user?.email)
}

function getRequestRef(uid) {
  return doc(db, ACCESS_REQUEST_COLLECTION, uid)
}

function getAllowlistRef(uid) {
  return doc(db, 'staff_allowlist', uid)
}

function normalizeAccessRequest(id, data = {}) {
  const uid = normalizeText(data.uid) || id

  return {
    uid,
    email: normalizeText(data.email),
    emailNormalized: normalizeEmail(data.emailNormalized || data.email),
    displayName: normalizeText(data.displayName),
    photoURL: normalizeText(data.photoURL),
    status: normalizeText(data.status || 'unknown').toLowerCase(),
    requestCount: Number(data.requestCount ?? 0) || 0,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    lastRequestedAt: data.lastRequestedAt ?? null,
    decisionType: normalizeText(data.decisionType),
    decisionAt: data.decisionAt ?? null,
    decisionByUid: normalizeText(data.decisionByUid),
    decisionByName: normalizeText(data.decisionByName),
    decisionByEmail: normalizeText(data.decisionByEmail),
  }
}

function normalizeStaffRole(role) {
  const normalized = normalizeText(role).toLowerCase()
  return normalized === 'admin' ? 'admin' : 'staff'
}

function normalizeManagedAccessUser(id, data = {}) {
  const uid = normalizeText(data.uid) || id

  return {
    uid,
    email: normalizeText(data.email),
    displayName: normalizeText(data.displayName),
    role: normalizeStaffRole(data.role),
    active: data.active === true,
    approvedAt: data.approvedAt ?? null,
    approvedByUid: normalizeText(data.approvedByUid),
    approvedByName: normalizeText(data.approvedByName),
    approvedByEmail: normalizeText(data.approvedByEmail),
    revokedAt: data.revokedAt ?? null,
    revokedByUid: normalizeText(data.revokedByUid),
    revokedByName: normalizeText(data.revokedByName),
    revokedByEmail: normalizeText(data.revokedByEmail),
  }
}

function buildPendingRequestPayload(user, existingData = null) {
  const uid = normalizeText(user?.uid)
  const email = normalizeText(user?.email)
  const existingRequestCount = Number(existingData?.requestCount ?? 0) || 0

  return {
    uid,
    email,
    emailNormalized: normalizeEmail(email),
    displayName: normalizeText(user?.displayName),
    photoURL: normalizeText(user?.photoURL),
    status: 'pending',
    requestCount: existingRequestCount + 1,
    createdAt: existingData?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastRequestedAt: serverTimestamp(),
    decisionType: '',
    decisionAt: null,
    decisionByUid: '',
    decisionByName: '',
    decisionByEmail: '',
  }
}

function buildDecisionRequestPayload({ request, user, status, decisionType }) {
  return {
    uid: request.uid,
    email: request.email,
    emailNormalized: request.emailNormalized,
    displayName: request.displayName,
    photoURL: request.photoURL,
    status,
    requestCount: Number(request.requestCount ?? 0) || 1,
    createdAt: request.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastRequestedAt: request.lastRequestedAt ?? null,
    decisionType,
    decisionAt: serverTimestamp(),
    decisionByUid: normalizeText(user?.uid),
    decisionByName: getActorName(user),
    decisionByEmail: normalizeText(user?.email),
  }
}

function buildAllowlistPayload({ request, user }) {
  return {
    active: true,
    role: 'staff',
    uid: request.uid,
    email: request.email,
    displayName: request.displayName,
    approvedAt: serverTimestamp(),
    approvedByUid: normalizeText(user?.uid),
    approvedByName: getActorName(user),
    approvedByEmail: normalizeText(user?.email),
  }
}

function buildRevokedAllowlistPayload({ target, user }) {
  return {
    active: false,
    role: normalizeStaffRole(target.role),
    uid: target.uid,
    email: normalizeText(target.email),
    displayName: normalizeText(target.displayName),
    approvedAt: target.approvedAt ?? null,
    approvedByUid: normalizeText(target.approvedByUid),
    approvedByName: normalizeText(target.approvedByName),
    approvedByEmail: normalizeText(target.approvedByEmail),
    revokedAt: serverTimestamp(),
    revokedByUid: normalizeText(user?.uid),
    revokedByName: getActorName(user),
    revokedByEmail: normalizeText(user?.email),
  }
}

function buildBlockedRequestPayload({ target, user }) {
  return {
    uid: target.uid,
    email: normalizeText(target.email),
    emailNormalized: normalizeEmail(target.email),
    displayName: normalizeText(target.displayName),
    photoURL: normalizeText(target.photoURL),
    status: 'blocked',
    requestCount: Number(target.requestCount ?? 1) || 1,
    createdAt: target.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastRequestedAt: target.lastRequestedAt ?? null,
    decisionType: 'revoke',
    decisionAt: serverTimestamp(),
    decisionByUid: normalizeText(user?.uid),
    decisionByName: getActorName(user),
    decisionByEmail: normalizeText(user?.email),
  }
}

function assertConfigured() {
  if (!db) {
    throw new Error('Firestore is not configured.')
  }
}

function assertUid(uid, message) {
  if (!uid) {
    throw new Error(message)
  }
}

export async function createOwnAccessRequest(user) {
  assertConfigured()

  const uid = normalizeText(user?.uid)
  assertUid(uid, 'Authentication required.')

  const requestRef = getRequestRef(uid)
  const snapshot = await getDoc(requestRef)
  const existingData = snapshot.exists() ? snapshot.data() : null

  await setDoc(requestRef, buildPendingRequestPayload(user, existingData))

  return {
    state: 'pending',
    requestStatus: 'pending',
    message: 'Pedido de acesso enviado. Aguarda aprovação.',
  }
}

export function subscribeToPendingAccessRequests(callback, errorCallback) {
  if (!db) {
    callback([])
    return () => {}
  }

  const pendingQuery = query(collection(db, ACCESS_REQUEST_COLLECTION), where('status', '==', 'pending'))

  return onSnapshot(
    pendingQuery,
    (snapshot) => {
      const requests = snapshot.docs
        .map((requestDoc) => normalizeAccessRequest(requestDoc.id, requestDoc.data()))
        .filter((request) => request.status === 'pending')
        .sort((left, right) => {
          const leftMs = toTimestampMs(left.createdAt) || toTimestampMs(left.lastRequestedAt)
          const rightMs = toTimestampMs(right.createdAt) || toTimestampMs(right.lastRequestedAt)
          return leftMs - rightMs
        })

      callback(requests)
    },
    (error) => {
      if (typeof errorCallback === 'function') {
        errorCallback(error)
      }
    }
  )
}

export function subscribeToManagedAccessUsers(callback, errorCallback) {
  if (!db) {
    callback([])
    return () => {}
  }

  return onSnapshot(
    collection(db, 'staff_allowlist'),
    (snapshot) => {
      const users = snapshot.docs
        .map((staffDoc) => normalizeManagedAccessUser(staffDoc.id, staffDoc.data()))
        .sort((left, right) => {
          if (left.active !== right.active) {
            return left.active ? -1 : 1
          }

          const leftLabel = getActorName(left) || left.uid
          const rightLabel = getActorName(right) || right.uid
          return leftLabel.localeCompare(rightLabel, 'pt', { sensitivity: 'base' })
        })

      callback(users)
    },
    (error) => {
      if (typeof errorCallback === 'function') {
        errorCallback(error)
      }
    }
  )
}

export async function approveAccessRequest({ request, user }) {
  assertConfigured()

  const uid = normalizeText(request?.uid)
  assertUid(uid, 'Access request uid is required.')

  const normalizedRequest = normalizeAccessRequest(uid, request)
  const batch = writeBatch(db)

  batch.set(getAllowlistRef(uid), buildAllowlistPayload({ request: normalizedRequest, user }))
  batch.set(
    getRequestRef(uid),
    buildDecisionRequestPayload({
      request: normalizedRequest,
      user,
      status: 'approved',
      decisionType: 'approve',
    })
  )

  await batch.commit()
}

export async function denyAccessRequest({ request, user }) {
  assertConfigured()

  const uid = normalizeText(request?.uid)
  assertUid(uid, 'Access request uid is required.')

  const normalizedRequest = normalizeAccessRequest(uid, request)
  const batch = writeBatch(db)

  batch.set(
    getRequestRef(uid),
    buildDecisionRequestPayload({
      request: normalizedRequest,
      user,
      status: 'denied',
      decisionType: 'deny',
    })
  )

  await batch.commit()
}

export async function revokeAccessUser({ target, user }) {
  assertConfigured()

  const uid = normalizeText(target?.uid)
  assertUid(uid, 'Access user uid is required.')

  if (uid === normalizeText(user?.uid)) {
    throw new Error('You cannot revoke your own access.')
  }

  const normalizedTarget = normalizeManagedAccessUser(uid, target)
  const batch = writeBatch(db)

  batch.set(getAllowlistRef(uid), buildRevokedAllowlistPayload({ target: normalizedTarget, user }))
  batch.set(getRequestRef(uid), buildBlockedRequestPayload({ target: normalizedTarget, user }))

  await batch.commit()
}
