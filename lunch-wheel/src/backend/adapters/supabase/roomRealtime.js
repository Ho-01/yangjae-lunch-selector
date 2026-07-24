import { getSupabase } from '../../../lib/supabase'

export function subscribe(code, onChanged) {
  const supabase = getSupabase()
  const channel = supabase
    .channel(`lunch-room:${code}`)
    .on('broadcast', { event: 'room_changed' }, onChanged)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onChanged()
    })

  return {
    notify(type) {
      return channel.send({
        type: 'broadcast',
        event: 'room_changed',
        payload: { type },
      })
    },
    close() {
      supabase.removeChannel(channel)
    },
  }
}
