import { getFunctions } from 'firebase/functions'
import { app } from './firebaseApp'

const FUNCTIONS_REGION = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'europe-west9'

export const functions = app ? getFunctions(app, FUNCTIONS_REGION) : null
