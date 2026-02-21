import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebaseDb'

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

