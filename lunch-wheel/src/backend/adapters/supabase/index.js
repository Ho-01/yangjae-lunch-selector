import * as teams from '../../../services/teamService'
import * as menus from '../../../services/menuService'
import * as menuTypes from '../../../services/menuTypeService'
import * as exclusions from '../../../services/exclusionService'
import * as placeLinks from '../../../services/placeLinkService'
import * as placePhotos from '../../../services/placePhotoCache'
import * as rooms from '../../../services/lunchRoomService'
import * as roomRealtime from './roomRealtime'
import { isSupabaseConfigured } from '../../../lib/supabase'

/** @type {import('../../contracts').Backend} */
export const supabaseBackend = {
  isConfigured: isSupabaseConfigured,
  teams,
  menus,
  menuTypes,
  exclusions,
  placeLinks,
  placePhotos,
  rooms,
  roomRealtime,
}
