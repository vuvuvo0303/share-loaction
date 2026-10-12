import { useEffect, useSyncExternalStore } from 'react'
import { authService } from '../lib/authService'
export function useAuth() { const state = useSyncExternalStore(authService.subscribe, authService.snapshot); useEffect(() => { authService.mount() }, []); return { ...state, login: authService.login, logout: authService.logout, retry: authService.retry } }
