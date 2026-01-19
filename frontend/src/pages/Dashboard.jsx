import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  TrendingUp,
  Plus,
  Search,
  Calendar,
  Trash2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Modal from "../components/common/Modal";
import Loader from "../components/common/Loader";
import DiagnosisResult from "../components/diagnosis/DiagnosisResult";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { historyService } from "../services/historyService";
import { formatDate } from "@/utils/helpers";
import { DISEASE_INFO } from "@/utils/constants";

const Dashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [sessionPredictions, setSessionPredictions] = useState([]);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await historyService.getSessions(100, 0);
      setSessions(data.sessions || []);
    } catch (error) {
      addToast("Failed to load sessions", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadSessionPredictions = async (sessionId) => {
    try {
      const data = await historyService.getSessionPredictions(sessionId);
      setSessionPredictions(data.predictions || []);
      setModalOpen(true);
    } catch (error) {
      addToast("Failed to load predictions", "error");
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to delete this session?")) {
      return;
    }

    try {
      await historyService.deleteSession(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      addToast("Session deleted successfully", "success");
    } catch (error) {
      addToast("Failed to delete session", "error");
    }
  };

  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const stats = [
    {
      icon: <Activity className="text-primary-600" size={28} />,
      label: "Total Diagnoses",
      value: sessions.length,
      bgColor: "from-primary-50 to-primary-100",
      borderColor: "border-primary-200",
    },
    {
      icon: <TrendingUp className="text-forest-600" size={28} />,
      label: "This Week",
      value: sessions.filter((s) => {
        const date = new Date(s.created_at);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }).length,
      bgColor: "from-forest-50 to-forest-100",
      borderColor: "border-forest-200",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 lg:py-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Welcome back,{" "}
            {user?.username?.charAt(0).toUpperCase() + user?.username?.slice(1)}
          </h1>

          <p className="text-sm sm:text-base text-gray-600">
            View your diagnosis history and track plant health over time
          </p>
        </motion.div>

        {/* Two Column Layout - 50/50 Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Stats & Actions */}
          <div className="space-y-6">
            {/* Stats */}
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`p-6 bg-gradient-to-br ${stat.bgColor} border-2 ${stat.borderColor} hover:shadow-lg transition-shadow`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium mb-1 uppercase tracking-wide text-gray-600">
                        {stat.label}
                      </p>
                      <p className="text-3xl sm:text-4xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-lg">
                      {stat.icon}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}

            {/* Quick Action */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link to="/">
                <Card className="p-6 bg-gradient-to-br from-primary-500 to-forest-400 text-white hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold mb-1">
                        New Diagnosis
                      </h3>
                      <p className="text-primary-100 text-sm">
                        Upload an image to diagnose your plant
                      </p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                      <Plus size={32} />
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          </div>

          {/* Right Column - History */}
          <div className="space-y-6">
            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-4 bg-white shadow-md">
                <Input
                  placeholder="Search sessions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search size={18} />}
                  className="text-sm"
                />
              </Card>
            </motion.div>

            {/* Section Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Diagnosis History
              </h2>
              {filteredSessions.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                  <FileText size={14} />
                  <span>{filteredSessions.length}</span>
                </div>
              )}
            </div>

            {/* Sessions List */}
            <div className="max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader size="lg" />
                </div>
              ) : filteredSessions.length === 0 ? (
                <Card className="p-8 bg-white">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-100 to-forest-100 rounded-full mb-4">
                      {searchTerm ? (
                        <AlertCircle size={32} className="text-gray-400" />
                      ) : (
                        <Activity size={32} className="text-primary-600" />
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {searchTerm ? "No matching sessions" : "No diagnoses yet"}
                    </h3>
                    <p className="text-gray-600 mb-6 text-sm">
                      {searchTerm
                        ? "Try a different search term"
                        : "Start by diagnosing your first plant"}
                    </p>
                    {!searchTerm && (
                      <Link to="/">
                        <Button size="md" icon={<Plus size={18} />}>
                          Diagnose Your First Plant
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredSessions.map((session, index) => {
                    const lastPrediction = session.last_prediction;
                    const diseaseInfo = lastPrediction
                      ? DISEASE_INFO[lastPrediction.predicted_class]
                      : null;

                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card
                          className="p-4 cursor-pointer group hover:shadow-xl hover:border-primary-200 transition-all bg-white"
                          onClick={() => loadSessionPredictions(session.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-2 truncate">
                                {session.title}
                              </h3>

                              <div className="flex flex-col gap-2 text-xs text-gray-600">
                                <div className="flex items-center gap-1.5">
                                  <Calendar
                                    size={14}
                                    className="text-gray-400"
                                  />
                                  <span>{formatDate(session.created_at)}</span>
                                </div>
                                {lastPrediction && diseaseInfo && (
                                  <div
                                    className={`inline-flex items-center gap-1.5 px-2 py-1 ${diseaseInfo.bgColor} ${diseaseInfo.borderColor} border rounded-lg w-fit`}
                                  >
                                    <span className="text-base">
                                      {diseaseInfo.icon}
                                    </span>
                                    <span
                                      className={`font-medium ${diseaseInfo.color} truncate text-xs`}
                                    >
                                      {lastPrediction.predicted_class.replace(
                                        /_/g,
                                        " ",
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.id);
                              }}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all flex-shrink-0"
                              aria-label="Delete session"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Session Details Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Session Predictions"
        size="lg"
      >
        {sessionPredictions.length > 0 ? (
          <div className="space-y-6 max-h-[60vh] md:max-h-[70vh] overflow-y-auto pr-2">
            {sessionPredictions.map((pred) => (
              <Card key={pred.id} className="p-4 bg-white">
                {sessionPredictions.map((pred) => (
                  <Card key={pred.id} className="p-4 bg-white">
                    <DiagnosisResult
                      result={{
                        ...pred,
                        class: pred.predicted_class || pred.class, // Normalize field name
                        confidence: pred.confidence,
                        category: pred.category,
                        subtype: pred.subtype,
                      }}
                      imagePreview={null}
                      onNewDiagnosis={() => setModalOpen(false)}
                    />
                  </Card>
                ))}
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <AlertCircle size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-600 text-sm">
              No predictions found in this session
            </p>
          </div>
        )}
      </Modal>

      <Footer />
    </div>
  );
};

export default Dashboard;
