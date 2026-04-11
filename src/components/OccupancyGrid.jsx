import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function OccupancyGrid() {
  const { userProfile } = useAuth();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOccupancyData();
  }, []);

  async function fetchOccupancyData() {
    try {
      // 1. Fetch all tenants for this admin
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, house, property, rent, due_date, status')
        .eq('admin_id', userProfile.id)
        .eq('status', 'Active');

      // 2. Fetch all payments for these tenants
      const tenantIds = tenants?.map(t => t.id) || [];
      const { data: payments } = tenantIds.length > 0 
        ? await supabase
            .from('payments')
            .select('tenant_id, amount, date, status')
            .in('tenant_id', tenantIds)
            .order('date', { ascending: false })
        : { data: [] };

      // 3. Build unit grid with proper status colors
      const unitMap = {};
      
      // Add all tenant units
      tenants?.forEach(tenant => {
        const tenantPayments = payments?.filter(p => p.tenant_id === tenant.id) || [];
        const latestPayment = tenantPayments[0];
        const today = new Date();
        const dueDate = new Date(tenant.due_date);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        // Determine status and color
        let status, color, statusLabel;
        
        if (latestPayment?.status === 'Confirmed') {
          // Check if payment covers current period
          const paymentDate = new Date(latestPayment.date);
          const nextDueDate = new Date(dueDate);
          
          if (paymentDate >= dueDate && dueDate >= today) {
            status = 'paid';
            color = '#10b981'; // Green
            statusLabel = 'Paid';
          } else if (daysUntilDue <= 0) {
            status = 'overdue';
            color = '#ef4444'; // Red
            statusLabel = 'Overdue';
          } else {
            status = 'pending';
            color = '#f59e0b'; // Amber
            statusLabel = 'Pending';
          }
        } else if (latestPayment?.status === 'Pending') {
          status = 'pending';
          color = '#f59e0b'; // Amber
          statusLabel = 'Payment Pending';
        } else {
          // No payment or failed payment
          if (daysUntilDue <= 0) {
            status = 'overdue';
            color = '#ef4444'; // Red
            statusLabel = 'Overdue';
          } else if (daysUntilDue <= 3) {
            status = 'pending';
            color = '#f59e0b'; // Amber
            statusLabel = 'Due Soon';
          } else {
            status = 'pending';
            color = '#f59e0b'; // Amber
            statusLabel = 'Unpaid';
          }
        }

        unitMap[tenant.house] = {
          id: tenant.id,
          name: tenant.name,
          rent: tenant.rent,
          status,
          color,
          statusLabel,
          daysUntilDue
        };
      });

      // 4. Generate standard unit list (A1-A20, B1-B16, etc.)
      const allUnits = [];
      const prefixes = ['A', 'B', 'C'];
      const ranges = { A: 20, B: 16, C: 12 };

      prefixes.forEach(prefix => {
        for (let i = 1; i <= ranges[prefix]; i++) {
          const unitCode = `${prefix}${i}`;
          if (unitMap[unitCode]) {
            allUnits.push({ code: unitCode, ...unitMap[unitCode], occupied: true });
          } else {
            allUnits.push({
              code: unitCode,
              occupied: false,
              status: 'vacant',
              color: '#94a3b8', // Grey
              statusLabel: 'VACANT'
            });
          }
        }
      });

      setUnits(allUnits);
    } catch (error) {
      console.error('Error fetching occupancy:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="card" style={{textAlign: 'center', padding: 40}}>Loading grid...</div>;
  }

  return (
    <div>
      <div style={{marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <h2 style={{margin: 0}}>🏢 Occupancy Grid</h2>
          <p style={{color: 'var(--gray)', margin: '4px 0 0 0'}}>
            {units.filter(u => u.occupied).length} occupied / {units.length} total units
          </p>
        </div>
        
        {/* Legend */}
        <div style={{display: 'flex', gap: 16, fontSize: 13}}>
          <span style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <span style={{width: 12, height: 12, borderRadius: 3, background: '#10b981'}}></span> Paid
          </span>
          <span style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <span style={{width: 12, height: 12, borderRadius: 3, background: '#f59e0b'}}></span> Pending
          </span>
          <span style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <span style={{width: 12, height: 12, borderRadius: 3, background: '#ef4444'}}></span> Overdue
          </span>
          <span style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <span style={{width: 12, height: 12, borderRadius: 3, background: '#94a3b8'}}></span> Vacant
          </span>
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 16
      }}>
        {units.map(unit => (
          <div
            key={unit.code}
            style={{
              background: unit.color,
              color: 'white',
              padding: 20,
              borderRadius: 12,
              textAlign: 'center',
              minHeight: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: unit.occupied ? 'pointer' : 'default',
              transition: 'transform 0.2s',
              opacity: unit.occupied ? 1 : 0.7
            }}
            onClick={() => unit.occupied && alert(`Unit ${unit.code}: ${unit.name}\nRent: KSh ${unit.rent}\nStatus: ${unit.statusLabel}\nDue: ${unit.daysUntilDue} days`)}
          >
            <h3 style={{margin: '0 0 4px 0', fontSize: 18, fontWeight: 700}}>{unit.code}</h3>
            {unit.occupied ? (
              <>
                <p style={{margin: '4px 0 0 0', fontSize: 13, fontWeight: 500}}>{unit.name}</p>
                <p style={{margin: '2px 0 0 0', fontSize: 12, opacity: 0.9}}>KSh {unit.rent.toLocaleString()}</p>
                <span style={{
                  marginTop: 6,
                  padding: '2px 8px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  fontSize: 10,
                  fontWeight: 600
                }}>
                  {unit.statusLabel}
                </span>
              </>
            ) : (
              <p style={{margin: '4px 0 0 0', fontSize: 12, opacity: 0.8, textTransform: 'uppercase'}}>Vacant</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}