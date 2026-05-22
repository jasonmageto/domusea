export const exportToPDF = async ({
  title,
  subtitle,
  headers,
  data,
  filename = 'export'
}) => {
  try {
    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
              color: #1e293b;
            }
            .header {
              background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
              color: white;
              padding: 30px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0 0 10px 0;
              font-size: 28px;
            }
            .header p {
              margin: 0;
              opacity: 0.9;
            }
            .date {
              text-align: right;
              color: #64748b;
              font-size: 12px;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #4f46e5;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: 600;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            tr:hover {
              background-color: #f1f5f9;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
            }
            .badge-success {
              background-color: #d1fae5;
              color: #065f46;
            }
            .badge-warning {
              background-color: #fef3c7;
              color: #92400e;
            }
            .badge-danger {
              background-color: #fee2e2;
              color: #991b1b;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e2e8f0;
              text-align: center;
              color: #64748b;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <p>${subtitle || ''}</p>
          </div>
          <div class="date">Generated: ${new Date().toLocaleDateString('en-KE', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</div>
          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${row.map(cell => {
                    const isStatus = cell === 'GOOD' || cell === 'ACTIVE' || 
                                    cell === 'PENDING' || cell === 'OVERDUE';
                    let badgeClass = '';
                    if (isStatus) {
                      if (cell === 'GOOD' || cell === 'ACTIVE') badgeClass = 'badge-success';
                      else if (cell === 'PENDING') badgeClass = 'badge-warning';
                      else badgeClass = 'badge-danger';
                      return `<td><span class="badge ${badgeClass}">${cell}</span></td>`;
                    }
                    return `<td>${cell}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>DomusEA Property Management System</p>
            <p>Total Records: ${data.length}</p>
          </div>
        </body>
      </html>
    `;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load
    printWindow.onload = () => {
      printWindow.print();
      // Optionally close after print
      // printWindow.close();
    };
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
    return false;
  }
};