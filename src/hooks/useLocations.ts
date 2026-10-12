import { useEffect, useSyncExternalStore } from 'react'
import { locationService } from '../lib/locationService'
import type { Role } from '../authTypes'
export function useLocations(uid: string, role: Role, name: string) {
  const state = useSyncExternalStore(locationService.subscribe, locationService.snapshot)
  useEffect(() => { locationService.bind(uid, role, name); return () => locationService.unbind() }, [uid, role])
  useEffect(() => { locationService.syncName(name) }, [name])
  return { ...state, start: locationService.start, pause: locationService.pause, rename: locationService.rename, deletePosition: locationService.deletePosition, retry: locationService.retry, clearError: locationService.clearError }
}
