import { motion } from 'framer-motion'
import clsx from 'clsx'

const Card = ({ 
  children, 
  className = '', 
  bordered = false,
  hover = true,
  ...props 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { y: -4 } : {}}
      className={clsx(
        'card',
        bordered && 'card-bordered',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export default Card