/**
 * Professional PDF Report Generator
 * Creates detailed prediction reports with perfect table format
 * UPDATED: Enhanced styling and layout
 */

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");

class PDFReportGenerator {
  constructor() {
    this.pageWidth = 595.28; // A4 width
    this.pageHeight = 841.89; // A4 height
    this.margin = 50;
    this.contentWidth = this.pageWidth - this.margin * 2;
  }

  /**
   * Generate prediction report
   * @param {Object} prediction - Prediction data
   * @param {String} outputPath - Output file path
   */
  async generateReport(prediction, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margins: {
            top: this.margin,
            bottom: this.margin,
            left: this.margin,
            right: this.margin,
          },
        });

        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // Add header
        this._addHeader(doc);

        // Add prediction summary
        this._addPredictionSummary(doc, prediction);

        // Add detailed results table
        this._addResultsTable(doc, prediction);

        // Add all probabilities table
        this._addProbabilitiesTable(doc, prediction);

        // Add recommendations
        this._addRecommendations(doc, prediction);

        // Add footer
        this._addFooter(doc);

        // Finalize
        doc.end();

        stream.on("finish", () => {
          logger.info("PDF report generated", { outputPath });
          resolve(outputPath);
        });

        stream.on("error", (error) => {
          logger.error("Error writing PDF", { error: error.message });
          reject(error);
        });
      } catch (error) {
        logger.error("Error generating PDF", { error: error.message });
        reject(error);
      }
    });
  }

  /**
   * Add header with logo and title
   */
  _addHeader(doc) {
    // Title
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .fillColor("#2c3e50")
      .text("Plant Health Diagnosis Report", this.margin, this.margin, {
        align: "center",
      });

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#7f8c8d")
      .text("AI-Powered Plant Disease Detection System", {
        align: "center",
      });

    // Line separator
    doc
      .strokeColor("#3498db")
      .lineWidth(2)
      .moveTo(this.margin, 110)
      .lineTo(this.pageWidth - this.margin, 110)
      .stroke();

    doc.moveDown(2);
  }

  /**
   * Add prediction summary box
   */
  _addPredictionSummary(doc, prediction) {
    const startY = 130;

    // Summary box background
    doc
      .rect(this.margin, startY, this.contentWidth, 120)
      .fillAndStroke("#ecf0f1", "#bdc3c7");

    const padding = 15;
    let y = startY + padding;

    // Prediction Result
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#2c3e50")
      .text("Diagnosis:", this.margin + padding, y);

    const predictedClassText = (
      prediction.predicted_class || "Unknown"
    ).replace(/_/g, " ");
    doc
      .fontSize(18)
      .fillColor(this._getStatusColor(prediction.predicted_class))
      .text(predictedClassText, this.margin + 120, y);

    y += 30;

    // Confidence
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#2c3e50")
      .text("Confidence:", this.margin + padding, y);

    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor(this._getConfidenceColor(prediction.confidence))
      .text(
        `${(prediction.confidence_percentage || 0).toFixed(2)}% (${
          prediction.confidence_level
        })`,
        this.margin + 120,
        y,
      );

    y += 25;

    // Category
    if (prediction.category) {
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#2c3e50")
        .text("Category:", this.margin + padding, y);

      doc
        .fontSize(11)
        .font("Helvetica")
        .text(prediction.category, this.margin + 120, y);
    }

    doc.moveDown(3);
  }

  /**
   * Add detailed results table
   */
  _addResultsTable(doc, prediction) {
    const tableTop = doc.y + 20;
    const rowHeight = 25;

    // Table title
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#2c3e50")
      .text("Detailed Analysis", this.margin, tableTop - 5);

    // Table header
    const headerY = tableTop + 20;
    doc
      .rect(this.margin, headerY, this.contentWidth, rowHeight)
      .fillAndStroke("#3498db", "#2980b9");

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text("Property", this.margin + 10, headerY + 7)
      .text("Value", this.margin + 200, headerY + 7);

    // Table rows
    const rows = [
      {
        label: "Predicted Class",
        value: (prediction.predicted_class || "Unknown").replace(/_/g, " "),
      },
      { label: "Category", value: prediction.category || "N/A" },
      { label: "Subtype", value: prediction.subtype || "N/A" },
      {
        label: "Confidence Score",
        value: `${(prediction.confidence_percentage || 0).toFixed(2)}%`,
      },
      { label: "Confidence Level", value: prediction.confidence_level },
      { label: "Image Name", value: prediction.image_name || "Unknown" },
      {
        label: "Processing Time",
        value: `${prediction.processing_time_ms || 0} ms`,
      },
      { label: "Model Version", value: prediction.model_version || "v1.0.0" },
      {
        label: "Analysis Date",
        value: new Date(prediction.created_at || Date.now()).toLocaleString(),
      },
    ];

    let currentY = headerY + rowHeight;

    rows.forEach((row, index) => {
      const bgColor = index % 2 === 0 ? "#ecf0f1" : "#ffffff";

      doc
        .rect(this.margin, currentY, this.contentWidth, rowHeight)
        .fillAndStroke(bgColor, "#bdc3c7");

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#2c3e50")
        .text(row.label, this.margin + 10, currentY + 7);

      doc
        .font("Helvetica")
        .fillColor("#34495e")
        .text(row.value, this.margin + 200, currentY + 7, {
          width: this.contentWidth - 210,
        });

      currentY += rowHeight;
    });

    doc.y = currentY + 20;
  }

  /**
   * Add all probabilities table
   */
  _addProbabilitiesTable(doc, prediction) {
    // Check if we need a new page
    if (doc.y > this.pageHeight - 300) {
      doc.addPage();
    }

    const tableTop = doc.y;
    const rowHeight = 22;

    // Table title
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#2c3e50")
      .text("All Class Probabilities", this.margin, tableTop);

    // Table header
    const headerY = tableTop + 25;
    doc
      .rect(this.margin, headerY, this.contentWidth, rowHeight)
      .fillAndStroke("#3498db", "#2980b9");

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text("Rank", this.margin + 10, headerY + 5)
      .text("Class", this.margin + 60, headerY + 5)
      .text("Probability", this.margin + 280, headerY + 5)
      .text("Confidence", this.margin + 400, headerY + 5);

    // Table rows
    let currentY = headerY + rowHeight;

    prediction.all_predictions.forEach((prob, index) => {
      const bgColor = index % 2 === 0 ? "#ecf0f1" : "#ffffff";
      const isTopPrediction = index === 0;

      doc
        .rect(this.margin, currentY, this.contentWidth, rowHeight)
        .fillAndStroke(bgColor, "#bdc3c7");

      // Rank
      doc
        .fontSize(10)
        .font(isTopPrediction ? "Helvetica-Bold" : "Helvetica")
        .fillColor("#2c3e50")
        .text(`#${index + 1}`, this.margin + 10, currentY + 5);

      // Class name
      doc.text(
        (prob.class || "Unknown").replace(/_/g, " "),
        this.margin + 60,
        currentY + 5,
      );

      // Probability bar
      const barWidth = 100;
      const barHeight = 12;
      const filledWidth = barWidth * prob.confidence;

      doc
        .rect(this.margin + 280, currentY + 5, barWidth, barHeight)
        .stroke("#bdc3c7");

      doc
        .rect(this.margin + 280, currentY + 5, filledWidth, barHeight)
        .fillAndStroke(
          this._getConfidenceColor(prob.confidence),
          this._getConfidenceColor(prob.confidence),
        );

      // Percentage
      doc
        .font("Helvetica")
        .fillColor("#34495e")
        .text(
          `${(prob.confidence_percentage || 0).toFixed(2)}%`,
          this.margin + 400,
          currentY + 5,
        );

      currentY += rowHeight;
    });

    doc.y = currentY + 20;
  }

  /**
   * Add recommendations section
   */
  _addRecommendations(doc, prediction) {
    // Check if we need a new page
    if (doc.y > this.pageHeight - 250) {
      doc.addPage();
    }

    const startY = doc.y;

    // Section title
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#2c3e50")
      .text("Diagnosis & Recommendations", this.margin, startY);

    // Explanation box
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#34495e")
      .text(prediction.explanation, this.margin, startY + 25, {
        width: this.contentWidth,
        align: "justify",
      });

    doc.moveDown(1.5);

    // Treatment recommendations
    if (prediction.recommendations && prediction.recommendations.length > 0) {
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#2c3e50")
        .text("Treatment Steps:", this.margin, doc.y);

      doc.moveDown(0.5);

      prediction.recommendations.forEach((rec, index) => {
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#34495e")
          .text(`${index + 1}. ${rec}`, this.margin + 15, doc.y, {
            width: this.contentWidth - 15,
          });
        doc.moveDown(0.3);
      });
    }

    doc.moveDown(2);
  }

  /**
   * Add footer with disclaimer
   */
  _addFooter(doc) {
    const footerY = this.pageHeight - this.margin - 60;

    // Disclaimer box
    doc
      .rect(this.margin, footerY, this.contentWidth, 60)
      .fillAndStroke("#fff3cd", "#ffc107");

    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor("#856404")
      .text("DISCLAIMER:", this.margin + 10, footerY + 10);

    doc
      .fontSize(7)
      .font("Helvetica")
      .text(
        "This report is generated by an AI system for informational purposes only. " +
          "Please consult agricultural experts for professional advice. The accuracy of predictions " +
          "may vary based on image quality and environmental factors.",
        this.margin + 10,
        footerY + 25,
        {
          width: this.contentWidth - 20,
          align: "justify",
        },
      );

    // Page number
    doc
      .fontSize(8)
      .fillColor("#7f8c8d")
      .text(
        `Generated on ${new Date().toLocaleString()} | Page 1`,
        this.margin,
        this.pageHeight - this.margin + 10,
        { align: "center" },
      );
  }

  /**
   * Get color based on diagnosis
   */

  _getStatusColor(predictedClass) {
    // Guard against undefined/null predictedClass
    if (!predictedClass || typeof predictedClass !== "string") {
      return "#3498db"; // Default blue
    }

    if (predictedClass === "Healthy") {
      return "#27ae60"; // Green
    } else if (predictedClass.startsWith("Pest")) {
      return "#e74c3c"; // Red
    } else if (predictedClass.startsWith("Nutrient_")) {
      return "#f39c12"; // Orange
    } else if (predictedClass === "Not_Plant") {
      return "#95a5a6"; // Gray
    } else {
      return "#3498db"; // Blue
    }
  }

  /**
   * Get color based on confidence
   */
  _getConfidenceColor(confidence) {
    if (confidence >= 0.85) {
      return "#27ae60"; // Green - Very High
    } else if (confidence >= 0.7) {
      return "#2ecc71"; // Light Green - High
    } else if (confidence >= 0.55) {
      return "#f39c12"; // Orange - Moderate
    } else {
      return "#e74c3c"; // Red - Low
    }
  }
}

module.exports = new PDFReportGenerator();
