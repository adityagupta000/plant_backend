// src/pages/Profile.jsx - ENHANCED WITH SESSION MANAGEMENT
import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Calendar,
  LogOut,
  Shield,
  Trash2,
  Monitor,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { authService } from "../services/authService";
import { historyService } from "../services/historyService";

const Profile = () => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalSessions: 0,
    totalPredictions: 0,
  });

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await historyService.getSessions(1000, 0);
      setStats({
        totalSessions: data.total || 0,
        totalPredictions: data.sessions?.length || 0,
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadActiveSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await authService.getSessions();
      setSessions(data.sessions || []);
      setShowSessionsModal(true);
    } catch (error) {
      addToast("Failed to load sessions", "error");
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to revoke this session?")) {
      return;
    }

    try {
      await authService.revokeSession(sessionId);
      addToast("Session revoked successfully", "success");

      // Reload sessions
      const data = await authService.getSessions();
      setSessions(data.sessions || []);
    } catch (error) {
      addToast("Failed to revoke session", "error");
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm("This will log you out from all devices. Continue?")) {
      return;
    }

    try {
      await authService.logoutAll();
      addToast("Logged out from all devices", "success");
      navigate("/");
    } catch (error) {
      addToast("Failed to logout from all devices", "error");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      addToast("Logged out successfully", "success");
      navigate("/");
    } catch (error) {
      addToast("Failed to logout", "error");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Profile Settings
          </h1>
          <p className="text-gray-600 text-lg">
            Manage your account and view your statistics
          </p>
        </motion.div>

        {/* Profile Info */}
        <Card className="p-8 mb-6">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-forest-600 flex items-center justify-center text-white text-4xl font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900 mb-1">
                {user?.username?.charAt(0).toUpperCase() +
                  user?.username?.slice(1)}
              </h2>

              <p className="text-gray-600 flex items-center gap-2">
                <Mail size={16} />
                {user?.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl border-2 border-primary-200">
              <p className="text-gray-600 text-sm font-medium mb-1">
                Total Sessions
              </p>
              <p className="text-3xl font-bold text-primary-700">
                {stats.totalSessions}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-forest-50 to-forest-100 rounded-xl border-2 border-forest-200">
              <p className="text-gray-600 text-sm font-medium mb-1">
                Total Diagnoses
              </p>
              <p className="text-3xl font-bold text-forest-700">
                {stats.totalPredictions}
              </p>
            </div>
          </div>
        </Card>

        {/* Account Information */}
        <Card className="p-8 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Account Information
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <User className="text-gray-600" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Username</p>
                  <p className="font-semibold text-gray-900">
                    {user?.username?.charAt(0).toUpperCase() +
                      user?.username?.slice(1)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Mail className="text-gray-600" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Email Address</p>
                  <p className="font-semibold text-gray-900">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="text-gray-600" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="font-semibold text-gray-900">
                    {user?.created_at &&
                      new Date(user.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Security & Sessions */}
        <Card className="p-8 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Security & Sessions
          </h3>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              icon={<Monitor size={20} />}
              onClick={loadActiveSessions}
              loading={loadingSessions}
            >
              View Active Sessions
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              icon={<Shield size={20} />}
              onClick={handleLogoutAll}
            >
              Logout from All Devices
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              icon={<LogOut size={20} />}
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </div>
        </Card>

        {/* Version Info */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Plant Health Detector v2.0.0</p>
          <p>© 2026 All rights reserved</p>
        </div>
      </main>

      {/* Active Sessions Modal */}
      <Modal
        isOpen={showSessionsModal}
        onClose={() => setShowSessionsModal(false)}
        title="Active Sessions"
        size="lg"
      >
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <Shield size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No active sessions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 rounded-xl border-2 ${
                  session.isCurrent
                    ? "bg-primary-50 border-primary-300"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor size={16} className="text-gray-600" />
                      <p className="font-semibold text-gray-900">
                        {session.userAgent || "Unknown Device"}
                      </p>
                      {session.isCurrent && (
                        <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>IP: {session.ipAddress || "Unknown"}</p>
                      <p>Last used: {formatDate(session.lastUsedAt)}</p>
                      <p>Expires: {formatDate(session.expiresAt)}</p>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Footer />
    </div>
  );
};

export default Profile;
