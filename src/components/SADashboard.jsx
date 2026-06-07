import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { toast, Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SADashboard() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({
    totalAdmins: 0,
    activeAdmins: 0,
    totalTenants: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    totalReceived: 0
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [activeAdminsList, setActiveAdminsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      console.log('📊 Fetching Supreme Admin Dashboard Stats...');
      setLoading(true);
      setError(null);

      // Fetch admins with timeout protection
      const adminsPromise = supabase.from('admins').select('*');
      const { data: adminsData, error: adminsError } = await Promise.race([
        adminsPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Admins query timeout')), 10000))
      ]);

      if (adminsError) throw adminsError;

      const totalAdmins = adminsData?.length || 0;
      const activeAdminsCount = adminsData?.filter(a => a.subscription_status === 'Active')?.length || 0;

      // Fetch tenants
      const tenantsPromise = supabase.from('tenants').select('*');
      const { data: tenantsData, error: tenantsError } = await Promise.race([
        tenantsPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Tenants query timeout')), 10000))
      ]);

      if (tenantsError) throw tenantsError;
      const totalTenants = tenantsData?.length || 0;

      // Fetch payments
      const paymentsPromise = supabase
        .from('admin_to_sa_payments')
        .select(`*, admins:admin_id(name, email)`)
        .order('date', { ascending: false })
        .limit(10);
      
      const { data: paymentsData, error: paymentsError } = await Promise.race([
        paymentsPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Payments query timeout')), 10000))
      ]);

      if (paymentsError) throw paymentsError;

      // ✅ Calculate stats - Case-insensitive status filter
      const now = new Date();
      const confirmedPayments = paymentsData?.filter(p => 
        p.status?.toLowerCase() === 'confirmed'
      ) || [];
      
      const monthlyRevenue = confirmedPayments
        .filter(p => {
          const paymentDate = new Date(p.date);
          return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const totalReceived = confirmedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      
      // ✅ Case-insensitive pending filter
      const pendingPaymentsCount = paymentsData?.filter(p => 
        p.status?.toLowerCase() === 'pending'
      )?.length || 0;
      
      const activeAdmins = adminsData?.filter(a => a.subscription_status === 'Active') || [];

      setStats({
        totalAdmins,
        activeAdmins: activeAdminsCount,
        totalTenants,
        monthlyRevenue,
        pendingPayments: pendingPaymentsCount,
        totalReceived
      });

      setRecentPayments(paymentsData || []);
      setActiveAdminsList(activeAdmins.slice(0, 5));

    } catch (err) {
      console.error('❌ Dashboard fetch error:', err);
      setError(err.message);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  // ✅ Beautiful PDF Export for Payments
  const exportPaymentsToPDF = (payments, filename) => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(79, 70, 229); // Primary color
      doc.text('🏢 DomusEA - Payment Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleString('en-KE')}`, 14, 28);
      doc.text(`Total Records: ${payments.length}`, 14, 33);
      
      // Table data
      const tableData = payments.map(p => [
        p.admins?.name || 'Unknown',
        p.admins?.email || '',
        `KSh ${parseFloat(p.amount || 0).toLocaleString()}`,
        p.status || 'Pending',
        new Date(p.date).toLocaleDateString('en-KE')
      ]);

      // Generate table
      autoTable(doc, {
        startY: 40,
        head: [['Admin', 'Email', 'Amount', 'Status', 'Date']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 50 },
          2: { cellWidth: 30 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 }
        }
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
        doc.text('© DomusEA - Confidential', doc.internal.pageSize.width - 60, doc.internal.pageSize.height - 10);
      }

      // Save file
      doc.save(filename || 'payments-report.pdf');
      
      toast.success('✅ Payments report downloaded!', {
        duration: 4000,
        style: {
          background: '#10B981',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontWeight: '600'
        }
      });
      
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('❌ Failed to generate PDF. Please try again.', {
        duration: 5000,
        style: {
          background: '#EF4444',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontWeight: '600'
        }
      });
    }
  };

  // ✅ Beautiful PDF Export for Admins
  const exportAdminsToPDF = (admins, filename) => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(79, 70, 229);
      doc.text('🏢 DomusEA - Active Admins Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleString('en-KE')}`, 14, 28);
      doc.text(`Total Admins: ${admins.length}`, 14, 33);
      
      // Table data
      const tableData = admins.map(a => [
        a.name || 'Unknown',
        a.email || '',
        a.subscription_plan || 'Monthly',
        `KSh ${parseFloat(a.subscription_fee || 0).toLocaleString()}`,
        a.subscription_status || 'Unknown'
      ]);

      // Generate table
      autoTable(doc, {
        startY: 40,
        head: [['Name', 'Email', 'Plan', 'Fee', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 55 },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25 }
        }
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
        doc.text('© DomusEA - Confidential', doc.internal.pageSize.width - 60, doc.internal.pageSize.height - 10);
      }

      // Save file
      doc.save(filename || 'admins-report.pdf');
      
      toast.success('✅ Admins report downloaded!', {
        duration: 4000,
        style: {
          background: '#10B981',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontWeight: '600'
        }
      });
      
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('❌ Failed to generate PDF. Please try again.', {
        duration: 5000,
        style: {
          background: '#EF4444',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontWeight: '600'
        }
      });
    }
  };

  // ✅ Download handlers with loading states
  const handleDownloadPayments = () => {
    if (recentPayments.length === 0) {
      toast('No payments to export', {
        icon: '📭',
        duration: 3000,
        style: {
          background: '#F59E0B',
          color: '#fff',
          padding: '14px 20px',
          borderRadius: '12px'
        }
      });
      return;
    }
    
    const loadingToast = toast.loading('📄 Generating PDF...', {
      style: {
        background: '#3B82F6',
        color: '#fff',
        padding: '14px 20px',
        borderRadius: '12px'
      }
    });
    
    setTimeout(() => {
      exportPaymentsToPDF(
        recentPayments, 
        `DomusEA_Payments_${new Date().toISOString().split('T')[0]}.pdf`
      );
      toast.dismiss(loadingToast);
    }, 300);
  };

  const handleDownloadAdmins = () => {
    if (activeAdminsList.length === 0) {
      toast('No admins to export', {
        icon: '👥',
        duration: 3000,
        style: {
          background: '#F59E0B',
          color: '#fff',
          padding: '14px 20px',
          borderRadius: '12px'
        }
      });
      return;
    }
    
    const loadingToast = toast.loading('📄 Generating PDF...', {
      style: {
        background: '#3B82F6',
        color: '#fff',
        padding: '14px 20px',
        borderRadius: '12px'
      }
    });
    
    setTimeout(() => {
      exportAdminsToPDF(
        activeAdminsList, 
        `DomusEA_Admins_${new Date().toISOString().split('T')[0]}.pdf`
      );
      toast.dismiss(loadingToast);
    }, 300);
  };

  const formatCurrency = (amount) => `KSh ${(parseFloat(amount) || 0).toLocaleString()}`;
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-muted">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center">
        <h3 className="text-xl font-bold text-danger mb-2">Error Loading Dashboard</h3>
        <p className="text-muted mb-4">{error}</p>
        <button onClick={fetchDashboardData} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* ✅ Toast Notifications Container */}
      <Toaster 
        position="top-right"
        gutter={12}
        containerStyle={{ margin: '8px' }}
        toastOptions={{
          success: { 
            duration: 4000,
            style: {
              background: '#10B981',
              color: '#fff',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontWeight: '600'
            }
          },
          error: { 
            duration: 5000,
            style: {
              background: '#EF4444',
              color: '#fff',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontWeight: '600'
            }
          },
          loading: {
            duration: 3000,
            style: {
              background: '#3B82F6',
              color: '#fff',
              borderRadius: '12px'
            }
          }
        }}
      />

      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-muted m-0">Welcome back, Supreme Admin</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card success">
          <div className="stat-header">
            <div>
              <div className="stat-label">Monthly Revenue</div>
              <div className="stat-value text-success">{formatCurrency(stats.monthlyRevenue)}</div>
            </div>
            <div className="stat-icon green"><i className="fas fa-coins"></i></div>
          </div>
          <div className="stat-subtitle">↑ 0.0% vs last month</div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-header">
            <div>
              <div className="stat-label">Pending Payments</div>
              <div className="stat-value text-warning">{stats.pendingPayments}</div>
            </div>
            <div className="stat-icon orange"><i className="fas fa-clock"></i></div>
          </div>
          <div className="stat-subtitle">Awaiting confirmation</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label">Active Admins</div>
              <div className="stat-value">{stats.activeAdmins}</div>
            </div>
            <div className="stat-icon blue"><i className="fas fa-users-cog"></i></div>
          </div>
          <div className="stat-subtitle">Of {stats.totalAdmins} total</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label">Total Tenants</div>
              <div className="stat-value">{stats.totalTenants}</div>
            </div>
            <div className="stat-icon purple"><i className="fas fa-users"></i></div>
          </div>
          <div className="stat-subtitle">Across all properties</div>
        </div>
      </div>

      <div className="content-grid">
        {/* Recent Payments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Payments</h3>
            <div className="flex gap-2">
              <span className="text-muted text-sm">Last 10</span>
              <button 
                onClick={handleDownloadPayments}
                className="btn btn-sm btn-primary"
                title="Download PDF Report"
              >
                <i className="fas fa-download"></i> Download
              </button>
            </div>
          </div>
          
          {recentPayments.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <i className="fas fa-coins" style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block' }}></i>
              No payments yet
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map(payment => (
                    <tr key={payment.id}>
                      <td>
                        <div className="font-semibold">{payment.admins?.name || 'Unknown'}</div>
                        <div className="text-muted text-xs">{payment.admins?.email}</div>
                      </td>
                      <td className="font-bold">{formatCurrency(payment.amount)}</td>
                      <td>
                        <span className={`badge ${payment.status?.toLowerCase() === 'confirmed' ? 'badge-success' : 'badge-warning'}`}>
                          {payment.status || 'Pending'}
                        </span>
                      </td>
                      <td className="text-muted text-xs">{formatDate(payment.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Active Admins */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Active Admins</h3>
            <div className="flex gap-2">
              <span className="text-muted text-sm">Top 5</span>
              <button 
                onClick={handleDownloadAdmins}
                className="btn btn-sm btn-primary"
                title="Download PDF Report"
              >
                <i className="fas fa-download"></i> Download
              </button>
            </div>
          </div>
          
          {activeAdminsList.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block' }}></i>
              No active admins found
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Plan</th>
                    <th>Fee</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAdminsList.map(admin => (
                    <tr key={admin.id}>
                      <td>
                        <div className="font-semibold">{admin.name || 'Unknown'}</div>
                        <div className="text-muted text-xs">{admin.email}</div>
                      </td>
                      <td><span className="badge badge-info">{admin.subscription_plan || 'Monthly'}</span></td>
                      <td className="font-bold">{formatCurrency(admin.subscription_fee)}</td>
                      <td>
                        <span className={`badge ${admin.subscription_status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                          {admin.subscription_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}