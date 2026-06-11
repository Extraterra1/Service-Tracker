import { doc, getDoc } from 'firebase/firestore'
import { createOwnAccessRequest } from './accessRequestStore'
import { db } from './firebaseDb'

const ACCESS_REQUEST_COLLECTION = 'access_requests'

function normalizeRequestStatus(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'pending' || normalized === 'approved' || normalized === 'denied' || normalized === 'blocked') {
    return normalized
  }
  return 'unknown'
}

function requestStatusToState(status) {
  if (status === 'blocked') {
    return 'blocked'
  }

  if (status === 'denied') {
    return 'denied'
  }

  if (status === 'pending') {
    return 'pending'
  }

  if (status === 'approved') {
    // Keep waiting until allowlist is actually active.
    return 'pending'
  }

  return 'denied'
}

async function requestAccessApprovalState(user) {
  const approvalResult = await requestAccessApproval(user)
  return {
    state: approvalResult.state,
    reason: `request_${approvalResult.requestStatus}`,
    message: approvalResult.message,
  }
}

export async function checkAllowlist(uid) {
  if (!db || !uid) {
    return { allowed: false, reason: 'missing' }
  }

  const allowlistDoc = await getDoc(doc(db, 'staff_allowlist', uid))
  if (!allowlistDoc.exists()) {
    return { allowed: false, reason: 'not_found' }
  }

  const payload = allowlistDoc.data()
  if (payload.active !== true) {
    return { allowed: false, reason: 'inactive' }
  }

  return { allowed: true, reason: 'ok', profile: payload }
}

export async function getOwnAccessRequest(uid) {
  if (!db || !uid) {
    return { exists: false, status: 'unknown', data: null }
  }

  const requestDoc = await getDoc(doc(db, ACCESS_REQUEST_COLLECTION, uid))
  if (!requestDoc.exists()) {
    return { exists: false, status: 'unknown', data: null }
  }

  const payload = requestDoc.data()
  return {
    exists: true,
    status: normalizeRequestStatus(payload.status),
    data: payload,
  }
}

export async function requestAccessApproval(user) {
  return createOwnAccessRequest(user)
}

export async function resolveAccessState(user) {
  if (!user?.uid) {
    return { state: 'signed_out', reason: 'missing_user', message: '' }
  }

  const allowlist = await checkAllowlist(user.uid)
  if (allowlist.allowed) {
    return { state: 'allowed', reason: 'allowlist', message: '', profile: allowlist.profile ?? null }
  }

  const request = await getOwnAccessRequest(user.uid)
  if (request.exists) {
    const nextState = requestStatusToState(request.status)
    if (request.status !== 'unknown') {
      if (nextState === 'pending') {
        return {
          state: 'pending',
          reason: `request_${request.status}`,
          message: 'Pedido de acesso enviado. Aguarda aprovação.',
        }
      }

      if (nextState === 'blocked') {
        return {
          state: 'blocked',
          reason: `request_${request.status}`,
          message: 'A tua conta foi bloqueada. Contacta o administrador.',
        }
      }

      return {
        state: 'denied',
        reason: `request_${request.status}`,
        message: 'Pedido recusado. Contacta o administrador para reabrir o acesso.',
      }
    }
  }

  return requestAccessApprovalState(user)
}

export async function pollApprovalState(user) {
  if (!user?.uid) {
    return { state: 'signed_out', reason: 'missing_user', message: '' }
  }

  const allowlist = await checkAllowlist(user.uid)
  if (allowlist.allowed) {
    return { state: 'allowed', reason: 'allowlist', message: '', profile: allowlist.profile ?? null }
  }

  const request = await getOwnAccessRequest(user.uid)
  if (!request.exists) {
    return requestAccessApprovalState(user)
  }

  const nextState = requestStatusToState(request.status)
  if (nextState === 'pending') {
    return {
      state: 'pending',
      reason: 'request_pending',
      message: 'Pedido de acesso enviado. Aguarda aprovação.',
    }
  }

  if (nextState === 'blocked') {
    return {
      state: 'blocked',
      reason: 'request_blocked',
      message: 'A tua conta foi bloqueada. Contacta o administrador.',
    }
  }

  return {
    state: 'denied',
    reason: 'request_denied',
    message: 'Pedido recusado. Contacta o administrador para reabrir o acesso.',
  }
}
