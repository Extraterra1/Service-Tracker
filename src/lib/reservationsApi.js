import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from './firebaseApp'

const functions = app ? getFunctions(app, 'europe-west9') : null
const getReservations = functions ? httpsCallable(functions, 'getReservations') : null
const getReservationDetails = functions ? httpsCallable(functions, 'getReservationDetails') : null

export async function fetchReservations(filters) {
  if (!getReservations) {
    throw new Error('Configuração Firebase em falta.')
  }

  const result = await getReservations(filters)
  return result.data
}

export async function fetchReservationDetails(reference) {
  if (!getReservationDetails) {
    throw new Error('Configuração Firebase em falta.')
  }

  const result = await getReservationDetails({ reference })
  return result.data
}
