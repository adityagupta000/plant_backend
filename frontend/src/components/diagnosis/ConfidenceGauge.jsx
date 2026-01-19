import { motion } from 'framer-motion'
import { getConfidenceLevel } from '@/utils/constants'

const ConfidenceGauge = ({ confidence }) => {
  const percentage = (confidence * 100).toFixed(1)
  const level = getConfidenceLevel(confidence)

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="text-6xl font-bold bg-gradient-to-r from-primary-600 to-forest-600 bg-clip-text text-transparent">
          {percentage}%
        </div>
        <div className={`text-2xl font-semibold ${level.color} mb-2`}>
          {level.label}
        </div>
      </div>

      <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute h-full bg-gradient-to-r from-primary-500 to-forest-600 rounded-full"
        />
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="text-center">
          <div className="h-2 bg-red-500 rounded mb-1" />
          <span className="text-gray-600">Low</span>
        </div>
        <div className="text-center">
          <div className="h-2 bg-yellow-500 rounded mb-1" />
          <span className="text-gray-600">Moderate</span>
        </div>
        <div className="text-center">
          <div className="h-2 bg-green-500 rounded mb-1" />
          <span className="text-gray-600">High</span>
        </div>
        <div className="text-center">
          <div className="h-2 bg-green-700 rounded mb-1" />
          <span className="text-gray-600">Very High</span>
        </div>
      </div>
    </div>
  )
}

export default ConfidenceGauge