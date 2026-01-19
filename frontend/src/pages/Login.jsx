import { Leaf } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import LoginForm from '../components/auth/LoginForm'
import Card from '../components/common/Card'

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-forest-50">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo - Image only since it includes the name */}
          <Link to="/" className="flex items-center justify-center mb-8 group">
            <img
              src="/logo.png"
              alt="Leafora"
              className="h-12 sm:h-14 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // Fallback to icon + text if image fails to load
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
            <div className="hidden items-center gap-2">
              <div className="bg-gradient-to-br from-primary-500 to-forest-600 p-3 rounded-xl shadow-lg">
                <Leaf className="text-white" size={32} />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-700 to-forest-700 bg-clip-text text-transparent">
                Leafora
              </span>
            </div>
          </Link>

          {/* Login Card */}
          <Card className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back
              </h1>
              <p className="text-gray-600">
                Sign in to access your diagnosis history
              </p>
            </div>

            <LoginForm />
          </Card>

          {/* Back to Home */}
          <div className="text-center mt-6">
            <Link to="/" className="text-gray-600 hover:text-primary-600 text-sm font-medium transition-colors">
              ← Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Login