import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'

import type { UserProfile } from '@/api/types'
import { api } from '@/api/sdk'
import { auth, e2eMode } from '@/lib/firebase'

interface AuthContextValue {
  firebaseUser: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  refreshProfile: () => Promise<UserProfile | null>
  signIn: (email: string, password: string, expectedRole?: string) => Promise<UserProfile>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const syncProfile = useCallback(async (user: User | null) => {
    if (e2eMode) {
      const nextProfile = window.__CLH_E2E_PROFILE__ ?? null
      startTransition(() => {
        setFirebaseUser(null)
        setProfile(nextProfile)
        setError(null)
        setLoading(false)
      })
      return nextProfile
    }

    if (!user) {
      startTransition(() => {
        setFirebaseUser(null)
        setProfile(null)
        setError(null)
        setLoading(false)
      })
      return null
    }

    startTransition(() => {
      setFirebaseUser(user)
      setLoading(true)
    })

    try {
      const nextProfile = await api.getCurrentUser()
      // Note: role validation must be done explicitly here if passed via signIn, 
      // but syncProfile is general. We will handle custom errors in signIn instead!
      startTransition(() => {
        setProfile(nextProfile)
        setError(null)
      })
      return nextProfile
    } catch (caughtError) {
      const message = getErrorMessage(caughtError)
      startTransition(() => {
        setProfile(null)
        setError(message)
      })
      await firebaseSignOut(auth)
      return null
    } finally {
      startTransition(() => {
        setLoading(false)
      })
    }
  }, [])

  useEffect(() => {
    if (e2eMode) {
      void syncProfile(null)
      return undefined
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      void syncProfile(user)
    })

    return unsubscribe
  }, [syncProfile])

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      error,
      refreshProfile: async () => syncProfile(auth.currentUser),
      signIn: async (email: string, password: string, expectedRole?: string) => {
        if (e2eMode) {
          const nextProfile = await syncProfile(null)
          if (!nextProfile) {
            throw new Error('No E2E profile has been configured for this test run.')
          }
          if (expectedRole && nextProfile.role !== expectedRole) {
            throw new Error(`Access denied: Not a${expectedRole === 'admin' ? 'n admin' : ' ' + expectedRole} account.`)
          }
          return nextProfile
        }

        setError(null)
        setLoading(true)
        try {
          await setPersistence(auth, browserSessionPersistence)
          const credential = await signInWithEmailAndPassword(auth, email, password)
          
          // Get profile explicitly without running syncProfile yet to avoid premature state update
          const nextProfile = await api.getCurrentUser()
          if (!nextProfile) {
            throw new Error('Unable to load your profile.')
          }
          if (expectedRole && nextProfile.role !== expectedRole) {
            await firebaseSignOut(auth)
            throw new Error(`Access denied: Not a${expectedRole === 'admin' ? 'n admin' : ' ' + expectedRole} account.`)
          }
          
          // If valid, sync state
          startTransition(() => {
            setFirebaseUser(credential.user)
            setProfile(nextProfile)
            setLoading(false)
            setError(null)
          })

          return nextProfile
        } catch (caughtError) {
          const message = getErrorMessage(caughtError)
          startTransition(() => {
            setError(message)
            setLoading(false)
          })
          throw new Error(message)
        }
      },
      signOut: async () => {
        if (e2eMode) {
          delete window.__CLH_E2E_PROFILE__
          delete window.__CLH_E2E_TOKEN__
          startTransition(() => {
            setFirebaseUser(null)
            setProfile(null)
            setError(null)
            setLoading(false)
          })
          return
        }

        await firebaseSignOut(auth)
        startTransition(() => {
          setFirebaseUser(null)
          setProfile(null)
          setError(null)
          setLoading(false)
        })
      },
    }),
    [error, firebaseUser, loading, profile, syncProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }

  return context
}
