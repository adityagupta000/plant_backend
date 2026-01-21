/**
 * CSP Report Middleware
 * Handles Content Security Policy violation reports
 */

const express = require("express");
const logger = require("../utils/logger");

/**
 * CSP Report Handler
 */
const cspReportHandler = express.Router();

// Parse JSON body for CSP reports (separate from main app parser)
cspReportHandler.use(express.json({ type: "application/csp-report" }));
cspReportHandler.use(express.json());

/**
 * CSP Violation Report Endpoint
 * POST /api/csp-report
 */
cspReportHandler.post("/", (req, res) => {
  const report = req.body;

  // Log CSP violation
  logger.warn("CSP Violation Detected", {
    violation: {
      documentUri: report["csp-report"]?.["document-uri"],
      violatedDirective: report["csp-report"]?.["violated-directive"],
      blockedUri: report["csp-report"]?.["blocked-uri"],
      sourceFile: report["csp-report"]?.["source-file"],
      lineNumber: report["csp-report"]?.["line-number"],
      columnNumber: report["csp-report"]?.["column-number"],
    },
    userAgent: req.headers["user-agent"],
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // In production, you might want to:
  // 1. Store in database for analysis
  // 2. Send alerts if violations spike
  // 3. Track patterns to identify attacks

  // Acknowledge receipt
  res.status(204).end();
});

/**
 * Enhanced Helmet Configuration with CSP Reporting
 */
const getHelmetConfig = () => {
  const cspReportUri =
    process.env.CSP_REPORT_URI || "http://localhost:5000/api/csp-report";

  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        // CSP Reporting
        reportUri: cspReportUri,
        // Or use the newer report-to directive
        // reportTo: 'csp-endpoint'
      },
      reportOnly: process.env.CSP_REPORT_ONLY === "true", // Set to true to test without blocking
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: "deny",
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
  };
};

/**
 * CSP Violation Statistics
 */
class CSPViolationStats {
  constructor() {
    this.violations = [];
    this.maxViolations = 1000; // Keep last 1000 violations
  }

  addViolation(violation) {
    this.violations.push({
      ...violation,
      timestamp: new Date(),
    });

    // Keep only recent violations
    if (this.violations.length > this.maxViolations) {
      this.violations.shift();
    }
  }

  getStats() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const recentViolations = this.violations.filter(
      (v) => v.timestamp.getTime() > oneHourAgo,
    );

    const dailyViolations = this.violations.filter(
      (v) => v.timestamp.getTime() > oneDayAgo,
    );

    // Group by violated directive
    const byDirective = this.violations.reduce((acc, v) => {
      const directive = v.violatedDirective || "unknown";
      acc[directive] = (acc[directive] || 0) + 1;
      return acc;
    }, {});

    return {
      total: this.violations.length,
      lastHour: recentViolations.length,
      lastDay: dailyViolations.length,
      byDirective,
      recentViolations: this.violations.slice(-10), // Last 10
    };
  }

  clear() {
    this.violations = [];
  }
}

const violationStats = new CSPViolationStats();

// Enhance report handler to track stats
cspReportHandler.post("/", (req, res) => {
  const report = req.body["csp-report"];

  if (report) {
    violationStats.addViolation({
      documentUri: report["document-uri"],
      violatedDirective: report["violated-directive"],
      blockedUri: report["blocked-uri"],
      sourceFile: report["source-file"],
      lineNumber: report["line-number"],
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    logger.warn("CSP Violation", {
      directive: report["violated-directive"],
      blocked: report["blocked-uri"],
      source: report["source-file"],
    });
  }

  res.status(204).end();
});

/**
 * Get CSP violation statistics
 * GET /api/system/csp-stats
 */
const getCspStats = (req, res) => {
  const stats = violationStats.getStats();
  res.json({
    success: true,
    data: stats,
  });
};

module.exports = {
  cspReportHandler,
  getHelmetConfig,
  getCspStats,
  violationStats,
};
