import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'

const RecommendationCard = ({ recommendation, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-start gap-3 p-4 bg-primary-50 border-2 border-primary-200 rounded-xl hover:bg-primary-100 transition-colors"
    >
      <CheckCircle className="text-primary-600 flex-shrink-0 mt-0.5" size={20} />
      <p className="text-gray-700 font-medium">{recommendation}</p>
    </motion.div>
  )
}

export default RecommendationCard