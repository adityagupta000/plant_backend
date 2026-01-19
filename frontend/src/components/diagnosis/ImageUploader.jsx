import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const ImageUploader = ({ onImageSelect, selectedImage, imagePreview, onRemove }) => {
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (file) {
      onImageSelect(file)
    }
  }, [onImageSelect])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxFiles: 1,
    maxSize: 5242880, // 5MB
  })

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {!imagePreview ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            {...getRootProps()}
            className={`border-3 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? 'border-primary-500 bg-primary-50 scale-105'
                : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="p-6 rounded-full bg-primary-100">
                <Upload className="text-primary-600" size={48} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900 mb-2">
                  {isDragActive ? 'Drop your image here' : 'Upload Leaf Image'}
                </p>
                <p className="text-gray-600 mb-1">
                  Drag & drop or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports: JPG, JPEG, PNG (Max 5MB)
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative rounded-2xl overflow-hidden bg-gray-100 shadow-lg"
          >
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-96 object-contain"
            />
            <button
              onClick={onRemove}
              className="absolute top-4 right-4 p-3 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg transition-all hover:scale-110"
            >
              <X size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {imagePreview && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 border-2 border-green-200 rounded-xl p-4">
          <ImageIcon size={20} className="text-green-600" />
          <span className="font-medium">Image ready for diagnosis</span>
        </div>
      )}
    </div>
  )
}

export default ImageUploader