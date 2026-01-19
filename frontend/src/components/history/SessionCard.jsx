import { Calendar, Trash2 } from 'lucide-react'
import Card from '../common/Card'
import { formatDate } from '@/utils/helpers'
import { DISEASE_INFO } from '@/utils/constants'

const SessionCard = ({ session, onClick, onDelete }) => {
  const lastPrediction = session.last_prediction
  const diseaseInfo = lastPrediction ? DISEASE_INFO[lastPrediction.predicted_class] : null

  return (
    <Card className="p-6 cursor-pointer group hover:shadow-xl" onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-2">
            {session.title}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar size={16} />
              <span>{formatDate(session.created_at)}</span>
            </div>
            {lastPrediction && diseaseInfo && (
              <div className={`flex items-center gap-2 px-3 py-1 ${diseaseInfo.bgColor} ${diseaseInfo.borderColor} border-2 rounded-lg`}>
                <span className="text-xl">{diseaseInfo.icon}</span>
                <span className={`font-medium ${diseaseInfo.color}`}>
                  {lastPrediction.predicted_class.replace(/_/g, ' ')}
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </Card>
  )
}

export default SessionCard