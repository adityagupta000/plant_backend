import { Leaf, Mail, Heart, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

const Footer = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-gradient-to-b from-white to-gray-50 border-t-2 border-primary-100 mt-auto relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center group">
              <img
                src="/logo.png"
                alt="Leafora"
                className="h-10 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  // Fallback to icon + text if image fails to load
                  e.target.style.display = "none";
                  e.target.nextElementSibling.style.display = "flex";
                }}
              />
              <div className="hidden items-center gap-2">
                <div className="bg-gradient-to-br from-primary-500 to-forest-600 p-2 rounded-xl">
                  <Leaf className="text-white" size={24} />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary-700 to-forest-700 bg-clip-text text-transparent">
                  Leafora
                </span>
              </div>
            </Link>
            <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
              AI-powered plant disease detection. Keep your plants healthy with
              advanced technology and expert recommendations.
            </p>

            {/* Social Links */}
            <div className="flex gap-3 pt-2">
              <a
                href="mailto:support@leafora.com"
                className="p-2.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-110 transition-all duration-300 shadow-sm hover:shadow-md"
                aria-label="Email us"
              >
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-base sm:text-lg">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/"
                  className="text-gray-600 hover:text-primary-600 text-sm transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-0 h-0.5 bg-primary-600 group-hover:w-4 transition-all duration-300"></span>
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-primary-600 text-sm transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-0 h-0.5 bg-primary-600 group-hover:w-4 transition-all duration-300"></span>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/profile"
                  className="text-gray-600 hover:text-primary-600 text-sm transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-0 h-0.5 bg-primary-600 group-hover:w-4 transition-all duration-300"></span>
                  Profile
                </Link>
              </li>
              <li>
                {/* <Link
                  to="/admin"
                  className="text-gray-600 hover:text-primary-600 text-sm transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-0 h-0.5 bg-primary-600 group-hover:w-4 transition-all duration-300"></span>
                  System
                </Link> */}
              </li>
            </ul>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-base sm:text-lg">
              Features
            </h3>
            <ul className="space-y-2.5">
              <li className="text-gray-600 text-sm flex items-start gap-2">
                <span className="text-primary-600 mt-0.5">✓</span>
                <span>Instant AI Diagnosis</span>
              </li>
              <li className="text-gray-600 text-sm flex items-start gap-2">
                <span className="text-primary-600 mt-0.5">✓</span>
                <span>Downloadable PDF Reports</span>
              </li>
              <li className="text-gray-600 text-sm flex items-start gap-2">
                <span className="text-primary-600 mt-0.5">✓</span>
                <span>History Tracking</span>
              </li>
              <li className="text-gray-600 text-sm flex items-start gap-2">
                <span className="text-primary-600 mt-0.5">✓</span>
                <span>Privacy First Design</span>
              </li>
              {/* <li className="text-gray-600 text-sm flex items-start gap-2">
                <span className="text-primary-600 mt-0.5">✓</span>
                <span>No Signup Required</span>
              </li> */}
            </ul>
          </div>

          {/* Account */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-base sm:text-lg">
              Get Started
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/register"
                  className="text-gray-600 hover:text-primary-600 text-sm transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-0 h-0.5 bg-primary-600 group-hover:w-4 transition-all duration-300"></span>
                  Create Account
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-primary-600 text-sm transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-0 h-0.5 bg-primary-600 group-hover:w-4 transition-all duration-300"></span>
                  Sign In
                </Link>
              </li>
            </ul>

            {/* CTA Card */}
            {/* <div className="mt-6 p-4 bg-gradient-to-br from-primary-50 to-forest-50 rounded-xl border-2 border-primary-200">
              <p className="text-xs font-semibold text-primary-900 mb-2">
                Try it now!
              </p>
              <p className="text-xs text-gray-700 mb-3">
                Start diagnosing your plants instantly. No signup required.
              </p>
              <Link
                to="/"
                className="inline-block text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
              >
                Get Started →
              </Link>
            </div> */}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-2 border-primary-100 mt-8 sm:mt-10 lg:mt-12 pt-6 sm:pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="text-center sm:text-left">
              <p className="text-gray-600 text-xs sm:text-sm">
                © {new Date().getFullYear()} Leafora. All rights reserved.
              </p>
              <p className="text-gray-500 text-xs mt-1 flex items-center justify-center sm:justify-start gap-1">
                Made with{" "}
                {/* <Heart className="text-red-500 fill-current" size={12} /> for */}
                plant lovers everywhere
              </p>
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
              <a href="#" className="hover:text-primary-600 transition-colors">
                Privacy Policy
              </a>
              <span className="text-gray-300">•</span>
              <a href="#" className="hover:text-primary-600 transition-colors">
                Terms of Service
              </a>
              <span className="text-gray-300">•</span>
              <a href="#" className="hover:text-primary-600 transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 bg-gradient-to-br from-primary-500 to-forest-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 z-50"
          aria-label="Scroll to top"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </footer>
  );
};

export default Footer;
