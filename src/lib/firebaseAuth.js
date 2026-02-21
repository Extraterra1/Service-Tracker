import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { app } from './firebaseApp'

export const auth = app ? getAuth(app) : null
export const googleProvider = new GoogleAuthProvider()

