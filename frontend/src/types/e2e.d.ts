import type { UserProfile } from '@/api/types'

declare global {
  interface Window {
    __CLH_E2E_PROFILE__?: UserProfile
    __CLH_E2E_TOKEN__?: string
  }
}

export {}
