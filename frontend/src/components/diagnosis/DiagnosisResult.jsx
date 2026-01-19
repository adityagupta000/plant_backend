// src/components/diagnosis/DiagnosisResult.jsx - FIXED: Proper disease info mapping
import { Download, RotateCcw, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import Card from "../common/Card";
import Button from "../common/Button";
import ConfidenceGauge from "./ConfidenceGauge";
import RecommendationCard from "./RecommendationCard";
import { DISEASE_INFO } from "@/utils/constants";
import { generatePDFReport } from "@/utils/pdfGenerator";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";

const DiagnosisResult = ({ result, imagePreview, onNewDiagnosis }) => {
  const { addToast } = useToast();
  const { user } = useAuth();

  // CRITICAL FIX: Normalize field names (backend returns predicted_class, frontend expects class)
  const predictionClass = result.predicted_class || result.class || "Healthy";

  // CRITICAL FIX: Proper disease info lookup with fallback chain
  const diseaseInfo =
    DISEASE_INFO[predictionClass] ||
    DISEASE_INFO.not_plant ||
    DISEASE_INFO.Not_Plant ||
    DISEASE_INFO.Healthy;

  const isNotPlant =
    predictionClass === "not_plant" || predictionClass === "Not_Plant";

  const handleDownloadPDF = async () => {
    try {
      // Pass normalized result with correct field names
      const normalizedResult = {
        ...result,
        class: predictionClass,
        predicted_class: predictionClass,
      };
      await generatePDFReport(normalizedResult, imagePreview);
      addToast("Report downloaded successfully!", "success");
    } catch (error) {
      addToast("Failed to generate PDF", "error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* SPECIAL WARNING for not_plant */}
      {isNotPlant && (
        <Card className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300">
          <div className="flex items-start gap-4">
            <AlertTriangle
              className="text-yellow-600 flex-shrink-0"
              size={32}
            />
            <div>
              <h3 className="text-xl font-bold text-yellow-900 mb-2">
                Not a Plant Detected
              </h3>
              <p className="text-yellow-800 text-lg">
                Our AI detected that this image does not contain a plant. Please
                upload a clear photo of plant leaves or affected areas for
                accurate diagnosis.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        {!isNotPlant && imagePreview && (
          <Button
            onClick={handleDownloadPDF}
            icon={<Download size={20} />}
            size="lg"
          >
            Download PDF Report
          </Button>
        )}
        <Button
          onClick={onNewDiagnosis}
          variant="secondary"
          icon={<RotateCcw size={20} />}
          size="lg"
        >
          {isNotPlant ? "Try Again with Plant Image" : "New Diagnosis"}
        </Button>
      </div>

      {/* Main Result Card */}
      <Card className={`p-6 ${diseaseInfo.borderColor} border-2`}>
        <div className="flex items-start gap-4">
          <div className="text-6xl">{diseaseInfo.icon}</div>
          <div className="flex-1">
            <h2 className={`text-3xl font-bold ${diseaseInfo.color} mb-2`}>
              {diseaseInfo.title}
            </h2>
            <p className="text-gray-700 text-lg mb-4">
              {diseaseInfo.description}
            </p>

            {!isNotPlant && (
              <div className="flex flex-wrap gap-3">
                {result.category && (
                  <div
                    className={`px-4 py-2 ${diseaseInfo.bgColor} ${diseaseInfo.borderColor} border-2 rounded-lg`}
                  >
                    <span className="text-sm font-medium text-gray-600">
                      Category:{" "}
                    </span>
                    <span className={`font-bold ${diseaseInfo.color}`}>
                      {result.category}
                    </span>
                  </div>
                )}
                {result.subtype && (
                  <div
                    className={`px-4 py-2 ${diseaseInfo.bgColor} ${diseaseInfo.borderColor} border-2 rounded-lg`}
                  >
                    <span className="text-sm font-medium text-gray-600">
                      Subtype:{" "}
                    </span>
                    <span className={`font-bold ${diseaseInfo.color}`}>
                      {result.subtype}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Uploaded Image */}
      {imagePreview && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Analyzed Image
          </h3>
          <img
            src={imagePreview}
            alt="Analyzed"
            className="w-full max-h-96 object-contain rounded-xl shadow-lg"
          />
        </Card>
      )}

      {/* Confidence - Only show for plant images */}
      {!isNotPlant && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Confidence Level
          </h3>
          <ConfidenceGauge confidence={result.confidence} />
        </Card>
      )}

      {/* Recommendations */}
      {diseaseInfo.recommendations &&
        diseaseInfo.recommendations.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isNotPlant
                ? "Tips for Better Results"
                : "Recommended Actions"}
            </h3>
            <div className="space-y-3">
              {diseaseInfo.recommendations.map((rec, index) => (
                <RecommendationCard
                  key={index}
                  recommendation={rec}
                  index={index}
                />
              ))}
            </div>
          </Card>
        )}

      {/* Privacy Notice - Only for valid plant diagnoses */}
      {!isNotPlant && (
        <div
          className={`p-4 border-2 rounded-xl ${
            user ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"
          }`}
        >
          <p className={`text-sm ${user ? "text-green-800" : "text-blue-800"}`}>
            {user ? (
              <>
                <strong>Saved to History:</strong> This diagnosis has been
                automatically saved to your account. View it in your{" "}
                <a
                  href="/dashboard"
                  className="underline font-semibold hover:opacity-80"
                >
                  Dashboard
                </a>
                .
              </>
            ) : (
              <>
                <strong>Privacy Notice:</strong> This diagnosis was not saved.
                Download the PDF to keep your results. Want to track your plant
                health history?{" "}
                <a
                  href="/register"
                  className="underline font-semibold hover:text-blue-900"
                >
                  Create a free account
                </a>
                .
              </>
            )}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default DiagnosisResult;
