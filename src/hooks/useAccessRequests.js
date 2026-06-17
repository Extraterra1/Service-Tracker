import { useCallback, useEffect, useState } from 'react'
import {
  approveAccessRequest as approveAccessRequestDoc,
  denyAccessRequest as denyAccessRequestDoc,
  revokeAccessUser as revokeAccessUserDoc,
  subscribeToManagedAccessUsers,
  subscribeToPendingAccessRequests,
} from '../lib/accessRequestStore'

export function useAccessRequests({ accessState, user, canManageAccess = false }) {
  const [requests, setRequests] = useState([])
  const [managedUsers, setManagedUsers] = useState([])
  const [error, setError] = useState('')
  const [accessRequestDecisionUid, setAccessRequestDecisionUid] = useState('')

  useEffect(() => {
    if (accessState !== 'allowed' || !canManageAccess) {
      setRequests([])
      setManagedUsers([])
      return () => {}
    }

    const unsubscribeRequests = subscribeToPendingAccessRequests(
      (nextRequests) => {
        setRequests(nextRequests)
        setError('')
      },
      (nextError) => {
        setError(nextError.message)
      }
    )

    const unsubscribeUsers = subscribeToManagedAccessUsers(
      (nextUsers) => {
        setManagedUsers(nextUsers)
        setError('')
      },
      (nextError) => {
        setError(nextError.message)
      }
    )

    return () => {
      if (typeof unsubscribeRequests === 'function') {
        unsubscribeRequests()
      }
      if (typeof unsubscribeUsers === 'function') {
        unsubscribeUsers()
      }
    }
  }, [accessState, canManageAccess])

  const approveAccessRequest = useCallback(
    async (request) => {
      const uid = String(request?.uid ?? '').trim()
      if (!uid) {
        return
      }

      if (!canManageAccess) {
        return
      }

      setAccessRequestDecisionUid(uid)
      setError('')

      try {
        await approveAccessRequestDoc({ request, user })
      } catch (nextError) {
        setError(nextError.message)
      } finally {
        setAccessRequestDecisionUid('')
      }
    },
    [canManageAccess, user]
  )

  const denyAccessRequest = useCallback(
    async (request) => {
      const uid = String(request?.uid ?? '').trim()
      if (!uid) {
        return
      }

      if (!canManageAccess) {
        return
      }

      setAccessRequestDecisionUid(uid)
      setError('')

      try {
        await denyAccessRequestDoc({ request, user })
      } catch (nextError) {
        setError(nextError.message)
      } finally {
        setAccessRequestDecisionUid('')
      }
    },
    [canManageAccess, user]
  )

  const revokeAccessUser = useCallback(
    async (target) => {
      const uid = String(target?.uid ?? '').trim()
      if (!uid) {
        return
      }

      if (!canManageAccess) {
        return
      }

      setAccessRequestDecisionUid(uid)
      setError('')

      try {
        await revokeAccessUserDoc({ target, user })
      } catch (nextError) {
        setError(nextError.message)
      } finally {
        setAccessRequestDecisionUid('')
      }
    },
    [canManageAccess, user]
  )

  return {
    pendingAccessRequests: accessState === 'allowed' && canManageAccess ? requests : [],
    managedAccessUsers: accessState === 'allowed' && canManageAccess ? managedUsers : [],
    accessRequestDecisionUid,
    accessRequestsError: accessState === 'allowed' && canManageAccess ? error : '',
    approveAccessRequest,
    denyAccessRequest,
    revokeAccessUser,
  }
}
