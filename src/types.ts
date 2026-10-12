export interface Coordinates { lat: number; lng: number; accuracy: number; capturedAt: number }
export interface Member extends Coordinates { id: string; name: string; updatedAt: number; isSelf: boolean }
export interface LocationState { room: string; name: string; members: Member[]; sharing: boolean; connected: boolean; status: string; error: string; current: Coordinates | null }
