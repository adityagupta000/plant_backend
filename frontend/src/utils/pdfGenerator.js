import jsPDF from 'jspdf'

export const generatePDFReport = async (prediction, imageSrc) => {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  
  // Add title
  pdf.setFontSize(24)
  pdf.setTextColor(34, 197, 94) // Primary green
  pdf.text('Plant Health Report', pageWidth / 2, 20, { align: 'center' })
  
  // Add date
  pdf.setFontSize(10)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' })
  
  // Add image (if available)
  if (imageSrc) {
    try {
      const imgData = await loadImage(imageSrc)
      const imgWidth = 80
      const imgHeight = 60
      const imgX = (pageWidth - imgWidth) / 2
      pdf.addImage(imgData, 'JPEG', imgX, 35, imgWidth, imgHeight)
    } catch (error) {
      console.error('Error adding image to PDF:', error)
    }
  }
  
  let yPos = imageSrc ? 105 : 40
  
  // Diagnosis Result
  pdf.setFontSize(16)
  pdf.setTextColor(0, 0, 0)
  pdf.text('Diagnosis Result', 15, yPos)
  yPos += 10
  
  pdf.setFontSize(12)
  pdf.setTextColor(50, 50, 50)
  pdf.text(`Condition: ${prediction.class.replace(/_/g, ' ')}`, 15, yPos)
  yPos += 7
  pdf.text(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`, 15, yPos)
  yPos += 7
  if (prediction.category) {
    pdf.text(`Category: ${prediction.category}`, 15, yPos)
    yPos += 7
  }
  if (prediction.subtype) {
    pdf.text(`Subtype: ${prediction.subtype}`, 15, yPos)
    yPos += 7
  }
  yPos += 3
  
  // Recommendations
  if (prediction.explanation) {
    pdf.setFontSize(14)
    pdf.setTextColor(0, 0, 0)
    pdf.text('Recommendations', 15, yPos)
    yPos += 8
    
    pdf.setFontSize(10)
    pdf.setTextColor(50, 50, 50)
    const splitText = pdf.splitTextToSize(prediction.explanation, pageWidth - 30)
    pdf.text(splitText, 15, yPos)
    yPos += splitText.length * 5
  }
  
  // Model info
  yPos += 10
  pdf.setFontSize(9)
  pdf.setTextColor(120, 120, 120)
  pdf.text(`Model: ${prediction.model_name || 'efficientnet_b2'}`, 15, yPos)
  yPos += 5
  pdf.text(`Processing Time: ${prediction.processing_time_ms || 'N/A'}ms`, 15, yPos)
  
  // Footer
  pdf.setFontSize(8)
  pdf.setTextColor(150, 150, 150)
  pdf.text('Plant Health Detector - AI-Powered Diagnosis', pageWidth / 2, pageHeight - 10, { align: 'center' })
  pdf.text('This is an automated diagnosis. Consult experts for critical decisions.', pageWidth / 2, pageHeight - 6, { align: 'center' })
  
  // Download
  pdf.save(`plant-diagnosis-${Date.now()}.pdf`)
}

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = reject
    img.src = src
  })
}