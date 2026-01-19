import { motion } from 'framer-motion'

const Loader = ({ size = 'md', fullScreen = false }) => {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  const loader = (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
        className={`${sizes[size]} border-4 border-primary-200 border-t-primary-600 rounded-full`}
      />
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-forest-50">
        {loader}
      </div>
    )
  }

  return <div className="flex items-center justify-center p-8">{loader}</div>
}

export default Loader