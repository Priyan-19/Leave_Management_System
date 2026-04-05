import { initializeApp } from 'firebase/app'
import { getAuth, sendPasswordResetEmail } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
}

export const e2eMode = import.meta.env.VITE_E2E_MODE === '1'

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key)

export const firebaseConfigReady = e2eMode || missingKeys.length === 0
export const firebaseConfigError = firebaseConfigReady
  ? null
  : `Missing Firebase config values: ${missingKeys.join(', ')}`

const firebaseApp = initializeApp(
  firebaseConfigReady
    ? firebaseConfig
    : {
        apiKey: 'development-only',
        authDomain: 'development-only',
        projectId: 'development-only',
        appId: 'development-only',
      },
)

export const auth = getAuth(firebaseApp)

export async function sendPasswordSetupEmail(email: string) {
  if (e2eMode) {
    return
  }

  if (!firebaseConfigReady) {
    throw new Error(firebaseConfigError ?? 'Firebase configuration is incomplete.')
  }

  await sendPasswordResetEmail(auth, email)
}

export async function sendPasswordSetupEmails(emails: string[]) {
  const uniqueEmails = [...new Set(emails.filter(Boolean))]
  const results = await Promise.allSettled(uniqueEmails.map((email) => sendPasswordSetupEmail(email)))

  return uniqueEmails.reduce<Record<string, 'sent' | 'failed'>>((deliveryMap, email, index) => {
    deliveryMap[email] = results[index]?.status === 'fulfilled' ? 'sent' : 'failed'
    return deliveryMap
  }, {})
}
