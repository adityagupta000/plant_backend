// src/pages/Home.jsx - ENHANCED WITH COMPLETE GUEST MODE SUPPORT
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Leaf,
  Upload,
  Download,
  History,
  Shield,
  Zap,
  CheckCircle,
  Info,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import ImageUploader from "../components/diagnosis/ImageUploader";
import DiagnosisResult from "../components/diagnosis/DiagnosisResult";
import { diagnosisService } from "../services/diagnosisService";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import { ERROR_CODES, ERROR_MESSAGES } from "../utils/constants";

const Home = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [result, setResult] = useState(null);
  const [guestMetadata, setGuestMetadata] = useState(null);
  const { addToast } = useToast();
  const { user } = useAuth();

  const handleImageSelect = (file) => {
    setSelectedImage(file);
    setResult(null);
    setGuestMetadata(null);

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
    setGuestMetadata(null);
  };

  const handleDiagnose = async () => {
    if (!selectedImage) {
      addToast("Please upload an image first", "warning");
      return;
    }

    setDiagnosing(true);
    try {
      let data;
      if (user) {
        // Authenticated mode
        data = await diagnosisService.diagnoseWithHistory(selectedImage);
        setResult(data.prediction);
        addToast("Diagnosis completed and saved!", "success");
      } else {
        // Guest mode
        data = await diagnosisService.diagnoseStateless(selectedImage);
        setResult(data.prediction);
        setGuestMetadata({
          usage: data.usage,
          loginPrompt: data.login_prompt,
          features: data.features,
          canDownloadPdf: data.can_download_pdf,
        });
        addToast("Diagnosis completed!", "success");
      }
    } catch (error) {
      const errorCode = error.response?.data?.code;
      const errorMessage =
        ERROR_MESSAGES[errorCode] ||
        error.response?.data?.error ||
        "Diagnosis failed";

      // Handle specific error codes
      if (errorCode === ERROR_CODES.GUEST_SESSION_LIMIT_EXCEEDED) {
        addToast(
          "Session limit reached. Sign up to continue analyzing plants!",
          "error",
        );
      } else if (errorCode === ERROR_CODES.GUEST_DAILY_LIMIT_EXCEEDED) {
        addToast(
          "Daily limit reached. Create a free account for 50 predictions per day!",
          "error",
        );
      } else if (errorCode === ERROR_CODES.SUSPICIOUS_ACTIVITY_DETECTED) {
        addToast(
          "Too many rapid requests. Please slow down or create an account.",
          "warning",
        );
      } else if (errorCode?.includes("RATE_LIMIT")) {
        addToast("Too many requests. Please wait and try again.", "warning");
      } else if (errorCode === ERROR_CODES.INVALID_FILE_TYPE) {
        addToast("Invalid file type. Use JPG or PNG images.", "error");
      } else if (errorCode === ERROR_CODES.FILE_TOO_LARGE) {
        addToast("File too large. Maximum size is 5MB.", "error");
      } else {
        addToast(errorMessage, "error");
      }
    } finally {
      setDiagnosing(false);
    }
  };

  const features = [
    {
      icon: <Zap className="text-primary-600" size={32} />,
      title: "Instant Results",
      description:
        "Get AI-powered diagnosis in seconds. No waiting, no signup required.",
    },
    {
      icon: <Shield className="text-forest-600" size={32} />,
      title: "Privacy First",
      description:
        "Your images are analyzed instantly and never stored without permission.",
    },
    {
      icon: <Download className="text-sage-600" size={32} />,
      title: "Download Reports",
      description: "Get detailed PDF reports with treatment recommendations.",
    },
    {
      icon: <History className="text-primary-600" size={32} />,
      title: "Optional History",
      description:
        "Create an account to save and track your diagnoses over time.",
    },
    {
      icon: <Upload className="text-forest-600" size={32} />,
      title: "Easy Upload",
      description:
        "Simple drag and drop interface. Works on mobile and desktop.",
    },
    {
      icon: <Leaf className="text-sage-600" size={32} />,
      title: "Multiple Conditions",
      description:
        "Detect diseases, pests, and nutrient deficiencies accurately.",
    },
  ];

  const tips = [
    { icon: <CheckCircle size={18} />, text: "Take photos in good lighting" },
    { icon: <CheckCircle size={18} />, text: "Focus on affected areas" },
    { icon: <CheckCircle size={18} />, text: "Avoid blurry images" },
    { icon: <CheckCircle size={18} />, text: "Include leaves clearly" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 lg:py-32 px-4 overflow-hidden bg-gradient-to-br from-primary-50 via-forest-50 to-sage-50">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyYzU1ZSIgc3Ryb2tlLXdpZHRoPSIwLjUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>

          <div className="max-w-7xl mx-auto relative z-10">
            {/* Hero heading and description */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12 lg:mb-16"
            >
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-primary-600 via-forest-600 to-sage-600 bg-clip-text text-transparent">
                  AI Plant Health
                </span>
                <br />
                <span className="text-gray-900">Diagnosis</span>
              </h1>

              {/* FIXED: Conditional subtitle based on auth state */}
              <p className="text-lg md:text-xl text-gray-700 mb-6 max-w-3xl mx-auto leading-relaxed">
                {user ? (
                  <>
                    Instant plant disease detection powered by AI. Your
                    diagnoses are automatically saved to your history.
                  </>
                ) : (
                  <>
                    Instant plant disease detection powered by AI. No signup
                    required.
                  </>
                )}
              </p>

              {/* FIXED: Conditional privacy notice based on auth state */}
              <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <Info
                    size={20}
                    className="text-primary-600 flex-shrink-0 mt-0.5"
                  />
                  <div className="text-left">
                    <p className="text-sm text-gray-700">
                      {user ? (
                        <>
                          <span className="font-semibold">Logged In:</span> Your
                          diagnoses are automatically saved to your account.
                          View your complete diagnosis history anytime in your{" "}
                          <Link
                            to="/dashboard"
                            className="text-primary-600 hover:text-primary-700 hover:underline font-semibold"
                          >
                            Dashboard
                          </Link>
                          .
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">Privacy First:</span>{" "}
                          Your images are analyzed instantly and nothing is
                          stored.{" "}
                          <Link
                            to="/register"
                            className="text-primary-600 hover:text-primary-700 hover:underline font-semibold"
                          >
                            Create an account
                          </Link>{" "}
                          if you want to save your diagnosis history.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
            {/* Diagnosis Area */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-4xl mx-auto"
            >
              {diagnosing ? (
                <Card className="p-8 md:p-12 bg-white shadow-xl">
                  <Loader size="lg" />
                  <p className="text-center text-gray-600 mt-6 text-base md:text-lg">
                    Analyzing your plant... This may take a few seconds
                  </p>
                </Card>
              ) : result ? (
                <div className="space-y-6">
                  <DiagnosisResult
                    result={result}
                    imagePreview={imagePreview}
                    onNewDiagnosis={handleRemoveImage}
                  />

                  {/* Guest Usage Tracking */}
                  {!user && guestMetadata?.usage && (
                    <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                      <div className="flex items-start gap-4">
                        <Info
                          size={24}
                          className="text-blue-600 flex-shrink-0"
                        />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-blue-900 mb-2">
                            Usage Tracking
                          </h3>
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div className="text-center p-2 bg-white rounded-lg">
                              <p className="text-gray-600 text-xs">
                                Predictions Used
                              </p>
                              <p className="text-xl font-bold text-blue-900">
                                {guestMetadata.usage.predictions_used}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-white rounded-lg">
                              <p className="text-gray-600 text-xs">
                                Session Left
                              </p>
                              <p className="text-xl font-bold text-blue-900">
                                {guestMetadata.usage.session_remaining}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-white rounded-lg">
                              <p className="text-gray-600 text-xs">
                                Daily Left
                              </p>
                              <p className="text-xl font-bold text-blue-900">
                                {guestMetadata.usage.daily_remaining}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Login Prompt */}
                  {!user && guestMetadata?.loginPrompt?.show && (
                    <Card className="p-6 md:p-8 bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-300">
                      <div className="text-center">
                        <AlertCircle
                          size={40}
                          className="mx-auto mb-4 text-orange-600"
                        />
                        <h3 className="text-lg md:text-xl font-semibold text-orange-900 mb-2">
                          {guestMetadata.loginPrompt.title}
                        </h3>
                        <p className="text-sm md:text-base text-orange-700 mb-6">
                          {guestMetadata.loginPrompt.message}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Link to="/register" className="w-full sm:w-auto">
                            <Button className="w-full">
                              Create Free Account
                            </Button>
                          </Link>
                          <Link to="/login" className="w-full sm:w-auto">
                            <Button variant="secondary" className="w-full">
                              Sign In
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Feature Comparison */}
                  {!user && guestMetadata?.features && (
                    <Card className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        Unlock Full Features
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">
                            Current (Guest):
                          </p>
                          <ul className="space-y-1 text-sm text-gray-600">
                            {guestMetadata.features.current_access.map(
                              (feature, i) => (
                                <li key={i}>• {feature}</li>
                              ),
                            )}
                          </ul>
                        </div>
                        <div className="bg-primary-50 rounded-lg p-4 border-2 border-primary-200">
                          <p className="font-semibold text-primary-900 mb-2">
                            With Free Account:
                          </p>
                          <ul className="space-y-1 text-sm text-primary-700">
                            {guestMetadata.features.with_account.map(
                              (feature, i) => (
                                <li key={i}>✓ {feature}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              ) : (
                <Card className="p-6 md:p-8 lg:p-10 bg-white shadow-xl">
                  <ImageUploader
                    onImageSelect={handleImageSelect}
                    selectedImage={selectedImage}
                    imagePreview={imagePreview}
                    onRemove={handleRemoveImage}
                  />

                  {selectedImage && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 flex justify-center"
                    >
                      <Button
                        onClick={handleDiagnose}
                        size="lg"
                        icon={<Upload size={20} />}
                        className="w-full sm:w-auto"
                      >
                        Diagnose Plant
                      </Button>
                    </motion.div>
                  )}

                  <div className="mt-8 p-6 bg-gradient-to-br from-primary-50 via-forest-50 to-sage-50 rounded-xl border-2 border-primary-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Info size={20} className="text-primary-600" />
                      <h3 className="font-semibold text-gray-900 text-base md:text-lg">
                        Tips for Best Results
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {tips.map((tip, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-3 text-sm md:text-base text-gray-700"
                        >
                          <span className="text-primary-600 flex-shrink-0 mt-0.5">
                            {tip.icon}
                          </span>
                          <span>{tip.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              )}
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-20 lg:py-24 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Why Use Plant Health Detector?
              </h2>
              <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
                Advanced AI technology combined with user-friendly design for
                accurate plant diagnostics
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 md:p-8 h-full bg-gradient-to-br from-white to-gray-50 border border-gray-200">
                    <div className="bg-gradient-to-br from-primary-100 to-forest-100 p-3 md:p-4 rounded-xl inline-block mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        
      </main>

      <Footer />
    </div>
  );
};

export default Home;
