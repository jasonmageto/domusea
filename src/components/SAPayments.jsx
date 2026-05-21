import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { exportToPDF } from '../utils/pdfExport';

export default function SAPayments() {
  const { userProfile } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReceived: 0,
    pending: 0,
    confirmed: 0,
    thisMonth: 0
  });
  
  const now = new Date();

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (payments.length > 0) {
      calculateStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments]);

  async function fetchPayments() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('admin_to_sa_payments')
        .select(`
          *,
          admins:admin_id (
            name,
            email
          )
        `)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setPayments(data || []);

    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }

  const calculateStats = () => {
    const totalReceived = payments
      .filter(p => p.status === 'Confirmed')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    
    const pending = payments
      .filter(p => p.status === 'Pending')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    
    const confirmed = payments.filter(p => p.status === 'Confirmed').length;
    
    const thisMonth = payments
      .filter(p => {
        const paymentDate = new Date(p.date);
        return paymentDate.getMonth() === now.getMonth() && 
               paymentDate.getFullYear() === now.getFullYear() && 
               p.status === 'Confirmed';
      })
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    setStats({ totalReceived, pending, confirmed, thisMonth });
  };

  const handleConfirmPayment = async (payment) => {
    if (!window.confirm(`Confirm payment of ${formatCurrency(payment.amount)} from ${payment.admins?.name || 'Admin'}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_to_sa_payments')
        .update({
          status: 'Confirmed',
          confirmed_by: userProfile?.id,
          confirmed_at: now.toISOString()
        })
        .eq('id', payment.id);

      if (error) throw error;
      alert('✅ Payment confirmed successfully!');
      await fetchPayments();
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Failed to confirm payment.');
    }
  };

  const handleRejectPayment = async (payment) => {
    const reason = window.prompt(`Reject payment of ${formatCurrency(payment.amount)}\nEnter reason:`);
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('admin_to_sa_payments')
        .update({
          status: 'Rejected',
          confirmed_by: userProfile?.id,
          confirmed_at: now.toISOString(),
          note: reason
        })
        .eq('id', payment.id);

      if (error) throw error;
      alert('❌ Payment rejected');
      await fetchPayments();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Failed to reject payment.');
    }
  };

  const formatCurrency = (amount) => `KSh ${parseFloat(amount || 0).toLocaleString()}`;

  const downloadCSV = () => {
    const headers = ['Admin Name', 'Admin Email', 'Amount', 'Date', 'Method', 'Reference', 'Status'];
    const rows = payments.map(p => [
      p.admins?.name || 'Unknown',
      p.admins?.email || 'N/A',
      p.amount,
      new Date(p.date).toLocaleString(),
      p.method || 'N/A',
      p.reference || 'N/A',
      p.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `domusea_payments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const downloadPDF = () => {
    const headers = ['Admin Name', 'Email', 'Amount', 'Date', 'Method', 'Status'];
    const data = payments.map(p => [
      p.admins?.name || 'Unknown',
      p.admins?.email || 'N/A',
      formatCurrency(p.amount),
      new Date(p.date).toLocaleDateString(),
      p.method || 'N/A',
      p.status
    ]);
    exportToPDF({
      title: 'Supreme Admin Payment Records',
      filename: 'Supreme_Admin_Payments',
      headers,
      data,
      subtitle: `Total Payments: ${payments.length} | Confirmed: ${stats.confirmed}`
    });
  };

  if (loading) return <div className="card" style={{textAlign: 'center', padding: 40}}>Loading payments...</div>;

  return (
    <div>
      <div style={{marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12}}>
        <div>
          <h2 style={{margin: 0}}>💰 SA Payments</h2>
          <p style={{color: 'var(--gray)', margin: '4px 0 0 0'}}>Admin remittances to Supreme Admin</p>
        </div>
        <div style={{display: 'flex', gap: 10}}>
          <button onClick={downloadCSV} className="btn" style={{background: 'var(--green)', color: 'white'}}>📊 CSV</button>
          <button onClick={downloadPDF} className="btn" style={{background: 'var(--red)', color: 'white'}}>📄 PDF</button>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24}}>
        <div className="card" style={{borderLeft: '4px solid #10b981'}}>
          <div style={{fontSize: 13, color: 'var(--gray)', fontWeight: 600}}>TOTAL RECEIVED</div>
          <div style={{fontSize: 28, fontWeight: 700, color: '#10b981'}}>{formatCurrency(stats.totalReceived)}</div>
        </div>
        <div className="card" style={{borderLeft: '4px solid #f59e0b'}}>
          <div style={{fontSize: 13, color: 'var(--gray)', fontWeight: 600}}>PENDING</div>
          <div style={{fontSize: 28, fontWeight: 700, color: '#f59e0b'}}>{formatCurrency(stats.pending)}</div>
        </div>
        <div className="card" style={{borderLeft: '4px solid #8b5cf6'}}>
          <div style={{fontSize: 13, color: 'var(--gray)', fontWeight: 600}}>THIS MONTH</div>
          <div style={{fontSize: 28, fontWeight: 700, color: '#8b5cf6'}}>{formatCurrency(stats.thisMonth)}</div>
        </div>
      </div>

      <div className="card">
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: 800}}>
            <thead>
              <tr style={{borderBottom: '2px solid var(--border)'}}>
                <th style={{padding: '12px 8px'}}>Admin</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Status</th>
                <th style={{textAlign: 'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} style={{borderBottom: '1px solid var(--border)'}}>
                  <td style={{padding: '12px 8px'}}>
                    <div style={{fontWeight: 600}}>{payment.admins?.name || 'Unknown'}</div>
                    <div style={{fontSize: 12, color: 'var(--gray)'}}>{payment.admins?.email || ''}</div>
                  </td>
                  <td style={{fontWeight: 600}}>{formatCurrency(payment.amount)}</td>
                  <td style={{fontSize: 13, color: 'var(--gray)'}}>{new Date(payment.date).toLocaleString()}</td>
                  <td>{payment.method || 'N/A'}</td>
                  <td style={{fontFamily: 'monospace', fontSize: 13}}>{payment.reference || 'N/A'}</td>
                  <td>
                    <span className={`badge ${payment.status === 'Confirmed' ? 'status-green' : payment.status === 'Pending' ? 'status-amber' : 'status-red'}`}>
                      {payment.status || 'Pending'}
                    </span>
                  </td>
                  <td style={{textAlign: 'center'}}>
                    {payment.status === 'Pending' && (
                      <div style={{display: 'flex', gap: 8, justifyContent: 'center'}}>
                        <button className="btn btn-sm btn-primary" onClick={() => handleConfirmPayment(payment)}>Confirm</button>
                        <button className="btn btn-sm" style={{background: '#ef4444', color: 'white'}} onClick={() => handleRejectPayment(payment)}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
