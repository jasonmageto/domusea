import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ✅ Generic export function used by ManageAdmins
export const exportToPDF = ({ title, filename = 'report.pdf', headers, data, subtitle = '' }) => {
  try {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text(title, 14, 20);
    
    // Subtitle if provided
    if (subtitle) {
      doc.setFontSize(11);
      doc.text(subtitle, 14, 30);
    }
    
    // Date
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, subtitle ? 40 : 30);
    
    // Table
    doc.autoTable({
      startY: subtitle ? 50 : 40,
      head: [headers],
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 60 }
      }
    });
    
    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
    return true;
  } catch (error) {
    console.error('PDF export error:', error);
    alert('Failed to generate PDF');
    return false;
  }
};

// ✅ Specific export functions for SADashboard
export const exportPaymentsToPDF = (payments, filename = 'payments.pdf') => {
  try {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('DomusEA - Payment Report', 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    
    const tableData = payments.map(p => [
      p.admins?.name || 'Unknown',
      `KSh ${(parseFloat(p.amount) || 0).toLocaleString()}`,
      p.status || 'Pending',
      new Date(p.date).toLocaleDateString('en-KE')
    ]);
    
    doc.autoTable({
      startY: 40,
      head: [['Admin', 'Amount', 'Status', 'Date']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 50 }
      }
    });
    
    doc.save(filename);
    return true;
  } catch (error) {
    console.error('PDF export error:', error);
    alert('Failed to generate PDF');
    return false;
  }
};

export const exportAdminsToPDF = (admins, filename = 'admins.pdf') => {
  try {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('DomusEA - Active Admins Report', 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    
    const tableData = admins.map(a => [
      a.name || 'Unknown',
      a.email,
      a.subscription_plan || 'Monthly',
      `KSh ${(parseFloat(a.subscription_fee) || 0).toLocaleString()}`,
      a.subscription_status || 'N/A'
    ]);
    
    doc.autoTable({
      startY: 40,
      head: [['Name', 'Email', 'Plan', 'Fee', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    doc.save(filename);
    return true;
  } catch (error) {
    console.error('PDF export error:', error);
    alert('Failed to generate PDF');
    return false;
  }
};

export const exportTenantsToPDF = (tenants, filename = 'tenants.pdf') => {
  try {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('DomusEA - Tenants Report', 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    
    const tableData = tenants.map(t => [
      t.name || 'Unknown',
      t.email,
      t.property || 'N/A',
      t.house || 'N/A',
      `KSh ${(parseFloat(t.rent) || 0).toLocaleString()}`,
      t.status || 'N/A'
    ]);
    
    doc.autoTable({
      startY: 40,
      head: [['Name', 'Email', 'Property', 'House', 'Rent', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    doc.save(filename);
    return true;
  } catch (error) {
    console.error('PDF export error:', error);
    alert('Failed to generate PDF');
    return false;
  }
};