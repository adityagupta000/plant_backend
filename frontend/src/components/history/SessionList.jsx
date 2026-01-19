import { motion } from 'framer-motion'
import SessionCard from './SessionCard'
import Loader from '../common/Loader'

const SessionList = ({ sessions, loading, onSessionClick, onDeleteSession }) => {
  if (loading) {
    return <Loader />
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-8xl mb-6"></div>
        <h3 className="text-2xl font-semibold text-gray-700 mb-3">No sessions yet</h3>
        <p className="text-gray-500 mb-8">Start diagnosing plants to create your first session</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {sessions.map((session, index) => (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <SessionCard
            session={session}
            onClick={() => onSessionClick(session.id)}
            onDelete={() => onDeleteSession(session.id)}
          />
        </motion.div>
      ))}
    </div>
  )
}

export default SessionList