import { useCallback, useEffect, useState } from 'react'
import { Activity, BellRing, RefreshCw } from 'lucide-react'
import { api, date } from '../shared/api'
import type { ActivityItem, NotificationItem } from '../shared/types'
import { EmptyState, ErrorBox, Loading } from '../store/ui'

export default function Logs({ notify }: { notify: (message: string) => void }) {
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [tab, setTab] = useState<'activity' | 'notifications'>('activity')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [a, n] = await Promise.all([api.activity(), api.notifications()])
      setActivity(a.activity)
      setNotifications(n.notifications)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Loglar yuklanmadi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const retry = async (notification: NotificationItem) => {
    // Xabarnoma qayta yuborish uchun umumiy event nomi ishlatiladi
    notify(`"${notification.title}" qayta yuborish uchun buyurtma holatini o'zgartiring yoki test xabarini ishlating.`)
  }

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div><h2>Harakatlar va xabarnomalar</h2><p>Bot xatolari do'kon ishini to'xtatmaydi — ular shu yerda ko'rinadi.</p></div>
          <button className="btn btn-ghost btn-sm" onClick={() => void load()}><RefreshCw size={15} /> Yangilash</button>
        </div>
        <div className="toolbar">
          <button className="tab" aria-selected={tab === 'activity'} onClick={() => setTab('activity')}><Activity size={15} /> Harakatlar</button>
          <button className="tab" aria-selected={tab === 'notifications'} onClick={() => setTab('notifications')}><BellRing size={15} /> Xabarnomalar</button>
        </div>
        {error && <ErrorBox message={error} onRetry={() => void load()} />}
        {loading ? <Loading /> : tab === 'activity' ? (
          activity.length === 0 ? <EmptyState title="Harakat yo'q" text="Admin yoki bot tomonidan amal bajarilganda yoziladi." /> : (
            <div className="log-list">
              {activity.map((item) => (
                <div className="log-line" key={item.id}>
                  <span className="log-dot" />
                  <div><b>{item.actor}</b> <span>{item.action.replace(/_/g, ' ').toLowerCase()}</span> {item.entity && <code>{item.entity}</code>}</div>
                  <time>{date(item.at)}</time>
                </div>
              ))}
            </div>
          )
        ) : notifications.length === 0 ? (
          <EmptyState title="Xabarnoma yo'q" text="Buyurtma yaratilganda yoki holat o'zgarganda xabarnoma yuboriladi." />
        ) : (
          <div className="log-list">
            {notifications.map((item) => (
              <div className="log-line" key={item.id}>
                <span className={`log-dot ${item.status === 'FAILED' || item.status === 'ERROR' ? 'bad' : item.status === 'SENT' ? 'good' : ''}`} />
                <div><b>{item.title}</b> <span>{item.event}</span> {item.error && <em className="log-error">{item.error}</em>}</div>
                <div className="log-meta"><span className={`badge ${item.status === 'SENT' ? 'on' : 'off'}`}>{item.status}</span><time>{date(item.createdAt)}</time></div>
                {(item.status === 'FAILED' || item.status === 'ERROR') && <button className="btn btn-ghost btn-sm" onClick={() => void retry(item)}>Qayta</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
