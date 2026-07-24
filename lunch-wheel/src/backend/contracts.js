/**
 * 백엔드 교체를 위한 클라이언트 계약.
 *
 * 이 파일은 런타임 구현이 아니라 포트의 기준 문서다. Supabase와 향후 Spring
 * 어댑터는 아래 객체 구조와 반환 DTO를 동일하게 유지해야 한다.
 *
 * @typedef {object} Backend
 * @property {() => boolean} isConfigured
 * @property {typeof import('../services/teamService')} teams
 * @property {typeof import('../services/menuService')} menus
 * @property {typeof import('../services/menuTypeService')} menuTypes
 * @property {typeof import('../services/exclusionService')} exclusions
 * @property {typeof import('../services/placeLinkService')} placeLinks
 * @property {typeof import('../services/placePhotoCache')} placePhotos
 * @property {typeof import('../services/lunchRoomService')} rooms
 * @property {RoomRealtimePort} roomRealtime
 *
 * @typedef {object} RoomRealtimePort
 * @property {(code: string, onChanged: () => void) => {
 *   notify: (type: string) => Promise<void>,
 *   close: () => void
 * }} subscribe
 */

export const BACKEND_CONTRACT_VERSION = 1
