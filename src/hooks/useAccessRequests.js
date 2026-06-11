import { useCallback, useEffect, useState } from 'react'
import {
  approveAccessRequest as approveAccessRequestDoc,
  denyAccessRequest as denyAccessRequestDoc,
  subscribeToPendingAccessRequests,
} from '../lib/accessRequestStore'

export function useAccessRequests({ accessState, user }) {
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')
  const [accessRequestDecisionUid, setAccessRequestDecisionUid] = useState('')

  useEffect(() => {
    if (accessState !== 'allowed') {
      return () => {}
    }

    return subscribeToPendingAccessRequests(
      (nextRequests) => {
        setRequests(nextRequests)
        setError('')
      },
      (nextError) => {
        setError(nextError.message)
      }
    )
  }, [accessState])

  const approveAccessRequest = useCallback(
    async (request) => {
      const uid = String(request?.uid ?? '').trim()
      if (!uid) {
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
    [user]
  )

  const denyAccessRequest = useCallback(
    async (request) => {
      const uid = String(request?.uid ?? '').trim()
      if (!uid) {
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
    [user]
  )

  return {
    pendingAccessRequests: accessState === 'allowed' ? requests : [],
    accessRequestDecisionUid,
    accessRequestsError: accessState === 'allowed' ? error : '',
    approveAccessRequest,
    denyAccessRequest,
  }
}
