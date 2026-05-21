import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Utility to export data to PDF
 * @param {Object} options 
 * @param {string} options.title - The title of the PDF
 * @param {string} options.filename - The filename for the PDF
 * @param {Array} options.headers - Array of strings for table headers
 * @param {Array} options.data - Array of arrays for table body data
 * @param {string} options.subtitle - Optional subtitle
 */
export const exportToPDF = ({ title, filename, headers, data, subtitle = '' }) => {
  const doc = jsPDF();
  
  // Add Title
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text(title, 14, 22);
  
  // Add Subtitle
  if (subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 30);
  }
  
  // Add Branding
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text('Developed by Elizon Tech', 14, 10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 140, 10);

  // Add Table
  doc.autoTable({
    startY: subtitle ? 35 : 28,
    head: [headers],
    body: data,
    theme: 'striped',
    headStyles: { fillColor: [17, 24, 39] }, // Dark theme color
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 30 },
  });

  // Save PDF
  doc.save(`${filename}.pdf`);
};
