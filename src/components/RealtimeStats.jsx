import { useState, useEffect } from 'react';
import { createClient } from '../supabaseClient';

const RealtimeStats = () => {
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalVacant: 0,
    totalOccupied: 0,
    recentlyUpdated: []
  });
  const supabase = createClient();

  useEffect(() => {
    fetchStats();

    // Subscribe to changes
    const channel = supabase
      .channel('stats-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'properties'
        },
        (payload) => {
          // Add to recently updated list
          setStats((prev) => ({
            ...prev,
            recentlyUpdated: [
              {
                name: payload.new.name,
                oldVacant: payload.old.vacant_units,
                newVacant: payload.new.vacant_units,
                time: new Date()
              },
              ...prev.recentlyUpdated.slice(0, 4)
            ]
          }));
          
          fetchStats(); // Refresh stats
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    const { data } = await supabase.from('properties').select('total_units, vacant_units');
    
    if (data) {
      const totalVacant = data.reduce((sum, p) => sum + p.vacant_units, 0);
      const totalUnits = data.reduce((sum, p) => sum + p.total_units, 0);
      
      setStats((prev) => ({
        ...prev,
        totalProperties: data.length,
        totalVacant,
        totalOccupied: totalUnits - totalVacant
      }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        Live Statistics
      </h3>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.totalProperties}</div>
          <div className="text-xs text-gray-600">Properties</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.totalVacant}</div>
          <div className="text-xs text-gray-600">Vacant Units</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{stats.totalOccupied}</div>
          <div className="text-xs text-gray-600">Occupied</div>
        </div>
      </div>

      {stats.recentlyUpdated.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-gray-700">Recent Updates</h4>
          <div className="space-y-2">
            {stats.recentlyUpdated.map((update, idx) => (
              <div key={idx} className="text-sm p-2 bg-gray-50 rounded flex justify-between items-center">
                <span className="font-medium">{update.name}</span>
                <span className={`text-xs ${update.newVacant > update.oldVacant ? 'text-green-600' : 'text-red-600'}`}>
                  {update.oldVacant} → {update.newVacant} vacant
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeStats;