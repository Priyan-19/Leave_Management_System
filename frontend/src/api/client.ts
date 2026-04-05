import axios from 'axios'

import { auth, e2eMode } from '@/lib/firebase'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
})

apiClient.interceptors.request.use(async (config) => {
  if (e2eMode && window.__CLH_E2E_TOKEN__) {
    config.headers = config.headers ?? {}
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${window.__CLH_E2E_TOKEN__}`
    return config
  }

  const currentUser = auth.currentUser
  if (currentUser) {
    const token = await currentUser.getIdToken()
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`)
    } else {
      config.headers = config.headers ?? {}
      ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
    }
  }
  return config
})
