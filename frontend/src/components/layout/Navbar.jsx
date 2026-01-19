// src/components/layout/Navbar.jsx - FIXED AND RESPONSIVE WITH LOGO
import { Link, useNavigate } from "react-router-dom";
import { Leaf, LogOut, User, Menu, X, History, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useState } from "react";
import Button from "../common/Button";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      addToast("Logged out successfully", "success");
      navigate("/");
    } catch (error) {
      addToast("Failed to logout", "error");
    }
  };

  return (
    <nav className="bg-white/90 backdrop-blur-lg border-b-2 border-primary-100 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Image only since it includes the name */}
          <Link to="/" className="flex items-center group">
            <img
              src="/logo.png"
              alt="Leafora"
              className="h-8 sm:h-10 md:h-12 w-auto object-contain group-hover:scale-105 transition-transform"
              onError={(e) => {
                // Fallback to icon + text if image fails to load
                e.target.style.display = "none";
                e.target.nextElementSibling.style.display = "flex";
              }}
            />
            <div className="hidden items-center gap-2">
              <div className="bg-gradient-to-br from-primary-500 to-forest-600 p-2 rounded-xl">
                <Leaf className="text-white w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary-700 to-forest-700 bg-clip-text text-transparent">
                Leafora
              </span>
            </div>
          </Link>

          {/* Desktop Menu - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4">
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" icon={<History size={20} />}>
                    <span className="hidden lg:inline">My History</span>
                    <span className="lg:hidden">History</span>
                  </Button>
                </Link>
                {user.role === "admin" && (
                  <Link to="/admin">
                    <Button variant="ghost" icon={<Settings size={20} />}>
                      Admin
                    </Button>
                  </Link>
                )}
                <Link to="/profile">
                  <Button variant="ghost" icon={<User size={20} />}>
                    <span className="max-w-[100px] truncate">
                      {user.username.charAt(0).toUpperCase() +
                        user.username.slice(1)}
                    </span>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  icon={<LogOut size={20} />}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary">
                    <span className="hidden lg:inline">Create Account</span>
                    <span className="lg:hidden">Sign Up</span>
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button - Only visible on mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-primary-50 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu - Animated dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t-2 border-primary-100 bg-white"
          >
            <div className="px-4 py-4 space-y-2">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      icon={<History size={20} />}
                    >
                      My History
                    </Button>
                  </Link>
                  {user.role === "admin" && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        icon={<Settings size={20} />}
                      >
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      icon={<User size={20} />}
                    >
                      Profile
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-start"
                    icon={<LogOut size={20} />}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" className="w-full">
                      Create Account
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
