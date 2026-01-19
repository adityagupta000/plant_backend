// src/pages/AdminDashboard.jsx - NEW FILE
// Comprehensive system monitoring dashboard

import { useState, useEffect } from "react";
import {
  Activity,
  Database,
  HardDrive,
  Shield,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { useToast } from "@/hooks/useToast";
import { systemService } from "../services/systemService";

const AdminDashboard = () => {
  const { addToast } = useToast();
  const { user } = useAuth();
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <Card className="p-8 max-w-md text-center">
            <Shield size={64} className="mx-auto mb-4 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-6">
              You do not have administrator privileges to access this page.
            </p>
            <Link to="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [systemHealth, setSystemHealth] = useState(null);
  const [redisStatus, setRedisStatus] = useState(null);
  const [guestStats, setGuestStats] = useState(null);
  const [databaseStats, setDatabaseStats] = useState(null);
  const [storageStats, setStorageStats] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSystemHealth(),
        loadRedisStatus(),
        loadGuestStats(),
        loadDatabaseStats(),
        loadStorageStats(),
      ]);
    } catch (error) {
      addToast("Failed to load system data", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadSystemHealth = async () => {
    try {
      const data = await systemService.getHealth();
      setSystemHealth(data);
    } catch (error) {
      console.error("Failed to load health:", error);
    }
  };

  const loadRedisStatus = async () => {
    try {
      const data = await systemService.getRedisStatus();
      setRedisStatus(data);
    } catch (error) {
      console.error("Failed to load Redis status:", error);
    }
  };

  const loadGuestStats = async () => {
    try {
      const data = await systemService.getGuestStats();
      setGuestStats(data);
    } catch (error) {
      console.error("Failed to load guest stats:", error);
    }
  };

  const loadDatabaseStats = async () => {
    try {
      const data = await systemService.getDatabaseStats();
      setDatabaseStats(data);
    } catch (error) {
      console.error("Failed to load database stats:", error);
    }
  };

  const loadStorageStats = async () => {
    try {
      const data = await systemService.getStorageStats();
      setStorageStats(data);
    } catch (error) {
      console.error("Failed to load storage stats:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
    addToast("Data refreshed", "success");
  };

  const handleClearGuestStore = async () => {
    if (
      !window.confirm(
        "Clear guest memory store? This will reset all guest rate limits.",
      )
    ) {
      return;
    }

    try {
      await systemService.clearGuestStore();
      addToast("Guest store cleared", "success");
      await loadGuestStats();
    } catch (error) {
      addToast("Failed to clear guest store", "error");
    }
  };

  const StatusBadge = ({ status }) => {
    const isHealthy =
      status === "healthy" ||
      status === "operational" ||
      status === "connected";

    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
          isHealthy
            ? "bg-green-100 text-green-700"
            : "bg-yellow-100 text-yellow-700"
        }`}
      >
        {isHealthy ? <CheckCircle size={16} /> : <XCircle size={16} />}
        <span className="font-medium">{status}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              System Dashboard
            </h1>
            <p className="text-gray-600">
              Monitor system health and performance
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            loading={refreshing}
            icon={<RefreshCw size={20} />}
          >
            Refresh
          </Button>
        </div>

        {/* System Health Overview */}
        {systemHealth && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                System Health
              </h2>
              <StatusBadge status={systemHealth.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Database */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <Database size={24} className="text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Database</h3>
                </div>
                <StatusBadge status={systemHealth.services?.database?.status} />
                <div className="mt-3 text-sm text-gray-700">
                  <p>Type: {systemHealth.services?.database?.type}</p>
                  <p>
                    Connected:{" "}
                    {systemHealth.services?.database?.connected ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {/* Redis */}
              <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border-2 border-red-200">
                <div className="flex items-center gap-3 mb-2">
                  <Shield size={24} className="text-red-600" />
                  <h3 className="font-semibold text-gray-900">Redis</h3>
                </div>
                <StatusBadge status={systemHealth.services?.redis?.status} />
                <div className="mt-3 text-sm text-gray-700">
                  <p>Guest: {systemHealth.services?.redis?.guest_limiter}</p>
                  <p>Rate: {systemHealth.services?.redis?.rate_limiter}</p>
                </div>
              </div>

              {/* AI Service */}
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <Activity size={24} className="text-purple-600" />
                  <h3 className="font-semibold text-gray-900">AI Service</h3>
                </div>
                <StatusBadge
                  status={systemHealth.services?.ai_service?.status}
                />
                <div className="mt-3 text-sm text-gray-700">
                  <p>Workers: {systemHealth.services?.ai_service?.workers}</p>
                  <p>
                    Success: {systemHealth.services?.ai_service?.success_rate}
                  </p>
                </div>
              </div>

              {/* Storage */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <HardDrive size={24} className="text-green-600" />
                  <h3 className="font-semibold text-gray-900">Storage</h3>
                </div>
                <StatusBadge status={systemHealth.services?.storage?.status} />
                <div className="mt-3 text-sm text-gray-700">
                  <p>Files: {systemHealth.services?.storage?.files}</p>
                  <p>Size: {systemHealth.services?.storage?.total_size}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Guest Statistics */}
        {guestStats && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Guest Predictions
              </h2>
              <Button
                onClick={handleClearGuestStore}
                variant="outline"
                icon={<Trash2 size={18} />}
                size="sm"
              >
                Clear Store
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Storage Type</p>
                <p className="text-2xl font-bold text-gray-900">
                  {guestStats.storage_type}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Redis Connected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {guestStats.redis_connected ? "Yes" : "No"}
                </p>
              </div>

              {guestStats.memory_store_stats && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Memory Store</p>
                  <div className="text-sm text-gray-700 mt-2">
                    <p>
                      Fingerprints:{" "}
                      {guestStats.memory_store_stats.fingerprints || 0}
                    </p>
                    <p>IPs: {guestStats.memory_store_stats.ips || 0}</p>
                    <p>
                      Sessions: {guestStats.memory_store_stats.sessions || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Database Statistics */}
        {databaseStats && (
          <Card className="p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Database Statistics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pool Stats */}
              {databaseStats.pool && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Connection Pool
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dialect:</span>
                      <span className="font-medium">
                        {databaseStats.pool.dialect}
                      </span>
                    </div>
                    {databaseStats.pool.size !== undefined && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pool Size:</span>
                          <span className="font-medium">
                            {databaseStats.pool.size}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Available:</span>
                          <span className="font-medium">
                            {databaseStats.pool.available}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">In Use:</span>
                          <span className="font-medium">
                            {databaseStats.pool.using}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Query Stats */}
              {databaseStats.queries && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Query Performance
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Queries:</span>
                      <span className="font-medium">
                        {databaseStats.queries.totalQueries}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Slow Queries:</span>
                      <span className="font-medium">
                        {databaseStats.queries.slowQueries}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Time:</span>
                      <span className="font-medium">
                        {databaseStats.queries.averageQueryTime}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Storage Statistics */}
        {storageStats && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Storage Statistics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Total Files</p>
                <p className="text-2xl font-bold text-gray-900">
                  {storageStats.fileCount}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Total Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {storageStats.totalSizeMB} MB
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Pending Cleanups</p>
                <p className="text-2xl font-bold text-gray-900">
                  {storageStats.pendingCleanups}
                </p>
              </div>
            </div>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
