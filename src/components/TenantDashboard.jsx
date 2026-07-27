import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Home, DollarSign, Bell, MessageSquare, Settings, 
  Calendar, FileText, TrendingUp, AlertCircle,
  CheckCircle, Clock, Search, Building2, Key, Users
} from "lucide-react";

export default function TenantDashboard({ userProfile }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [tenantData, setTenantData] = useState(null);

  useEffect(() => {
    fetchTenantData();
  }, [userProfile?.id]);

  async function fetchTenantData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', userProfile.id)
        .single();
      
      if (error) throw error;
      setTenantData(data);
    } catch (error) {
      console.error('Error fetching tenant data:', error);
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'rent', label: 'Rent & Payments', icon: DollarSign },
    { id: 'requests', label: 'Requests', icon: Bell },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const quickStats = [
    { 
      label: 'Current Property', 
      value: userProfile?.property || 'Not assigned',
      icon: Building2,
      color: 'indigo',
      subtext: tenantData?.house ? `House ${tenantData.house}` : ''
    },
    { 
      label: 'Monthly Rent', 
      value: `KSh ${userProfile?.rent?.toLocaleString() || '0'}`,
      icon: DollarSign,
      color: 'emerald',
      subtext: 'Due 1st of every month'
    },
    { 
      label: 'Lease Status', 
      value: 'Active',
      icon: CheckCircle,
      color: 'blue',
      subtext: userProfile?.lease_end ? `Ends ${new Date(userProfile.lease_end).toLocaleDateString()}` : ''
    },
    { 
      label: 'Pending Requests', 
      value: '0',
      icon: AlertCircle,
      color: 'amber',
      subtext: 'All caught up!'
    }
  ];

  const quickActions = [
    { 
      label: 'Pay Rent', 
      icon: DollarSign, 
      action: () => window.location.href = '/pay-rent',
      color: 'from-emerald-500 to-teal-600',
      hoverColor: 'hover:from-emerald-600 hover:to-teal-700',
      description: 'Make your monthly payment'
    },
    { 
      label: 'Submit Request', 
      icon: Bell, 
      action: () => setActiveTab('requests'),
      color: 'from-amber-500 to-orange-600',
      hoverColor: 'hover:from-amber-600 hover:to-orange-700',
      description: 'Report maintenance issues'
    },
    { 
      label: 'View Messages', 
      icon: MessageSquare, 
      action: () => setActiveTab('messages'),
      color: 'from-indigo-500 to-purple-600',
      hoverColor: 'hover:from-indigo-600 hover:to-purple-700',
      description: 'Check your inbox'
    },
    { 
      label: 'House Hunting', 
      icon: Search, 
      action: () => window.location.href = '/house-hunting',
      color: 'from-pink-500 to-rose-600',
      hoverColor: 'hover:from-pink-600 hover:to-rose-700',
      description: 'Find your next home'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'payment',
      title: 'Rent Payment Received',
      description: 'Your payment of KSh 7,000 was confirmed',
      date: '2 days ago',
      status: 'completed',
      icon: CheckCircle
    },
    {
      id: 2,
      type: 'maintenance',
      title: 'Maintenance Request',
      description: 'Toilet repair request submitted',
      date: '5 days ago',
      status: 'in-progress',
      icon: Clock
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="tenant-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1 className="welcome-title">Welcome back, {userProfile?.name?.split(' ')[0] || 'Tenant'} 👋</h1>
            <p className="welcome-subtitle">Manage your rental property with ease</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-outline btn-sm">
              <FileText size={16} />
              <span>View Lease</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Stats Grid */}
      <div className="stats-grid">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`stat-card stat-${stat.color}`}>
              <div className={`stat-icon stat-icon-${stat.color}`}>
                <Icon size={20} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
                {stat.subtext && <div className="stat-subtext">{stat.subtext}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Left Column - Quick Actions */}
        <div className="content-left">
          <div className="card card-interactive">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="card-body">
              <div className="actions-grid">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={action.action}
                      className={`action-card bg-gradient-to-r ${action.color} ${action.hoverColor}`}
                    >
                      <div className="action-icon">
                        <Icon size={24} />
                      </div>
                      <div className="action-content">
                        <span className="action-label">{action.label}</span>
                        <span className="action-description">{action.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card card-interactive">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
              <button className="btn btn-link btn-sm">View All</button>
            </div>
            <div className="card-body">
              <div className="activity-list">
                {recentActivity.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="activity-item">
                      <div className={`activity-icon activity-${activity.status}`}>
                        <Icon size={16} />
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">{activity.title}</div>
                        <div className="activity-description">{activity.description}</div>
                        <div className="activity-date">{activity.date}</div>
                      </div>
                    </div>
                  );
                })}
                {recentActivity.length === 0 && (
                  <div className="empty-state">
                    <Clock size={32} className="empty-icon" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Property Info & Announcements */}
        <div className="content-right">
          {/* Property Details */}
          <div className="card card-interactive mb-6">
            <div className="card-header">
              <h3 className="card-title">Your Property</h3>
              <Key size={18} className="text-gray-400" />
            </div>
            <div className="card-body">
              <div className="property-info">
                <div className="info-row">
                  <span className="info-label">Property Name</span>
                  <span className="info-value">{userProfile?.property || 'Not assigned'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">House Number</span>
                  <span className="info-value">{tenantData?.house || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Monthly Rent</span>
                  <span className="info-value rent-highlight">KSh {userProfile?.rent?.toLocaleString() || '0'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Lease End</span>
                  <span className="info-value">
                    {userProfile?.lease_end ? new Date(userProfile.lease_end).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Announcements */}
          <div className="card card-interactive">
            <div className="card-header">
              <h3 className="card-title"> Announcements</h3>
              <Bell size={18} className="text-gray-400" />
            </div>
            <div className="card-body">
              <div className="announcements-list">
                <div className="announcement-item">
                  <div className="announcement-badge">New</div>
                  <h4 className="announcement-title">Rent Due Reminder</h4>
                  <p className="announcement-text">Rent for this month is due on the 1st. Please ensure timely payment.</p>
                  <span className="announcement-date">Posted 3 days ago</span>
                </div>
                <div className="announcement-item">
                  <h4 className="announcement-title">Maintenance Schedule</h4>
                  <p className="announcement-text">Scheduled maintenance for water tanks on 15th July.</p>
                  <span className="announcement-date">Posted 1 week ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Admin */}
          <div className="card card-interactive mt-6">
            <div className="card-body text-center">
              <div className="contact-section">
                <Users size={32} className="contact-icon" />
                <h4 className="contact-title">Need Help?</h4>
                <p className="contact-text">Contact your property admin for assistance</p>
                <button className="btn btn-primary btn-full mt-3">
                  <MessageSquare size={16} />
                  <span>Send Message</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .tenant-dashboard {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* Header */
        .dashboard-header {
          margin-bottom: 24px;
          padding: 24px 28px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          color: white;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .welcome-title {
          font-size: 1.875rem;
          font-weight: 700;
          margin: 0 0 4px;
          letter-spacing: -0.5px;
        }

        .welcome-subtitle {
          font-size: 1rem;
          opacity: 0.95;
          margin: 0;
        }

        .header-actions .btn {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          backdrop-filter: blur(8px);
        }

        .header-actions .btn:hover {
          background: rgba(255,255,255,0.3);
        }

        /* Tab Navigation */
        .tab-navigation {
          display: flex;
          gap: 8px;
          margin-bottom: 28px;
          padding: 8px;
          background: #f1f5f9;
          border-radius: 12px;
          overflow-x: auto;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: transparent;
          border: none;
          border-radius: 10px;
          color: #64748b;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab-btn:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .tab-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 24px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          border: 1px solid #e2e8f0;
          transition: all 0.3s;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-icon-indigo { background: #eef2ff; color: #6366f1; }
        .stat-icon-emerald { background: #ecfdf5; color: #10b981; }
        .stat-icon-blue { background: #eff6ff; color: #3b82f6; }
        .stat-icon-amber { background: #fffbeb; color: #f59e0b; }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }

        .stat-subtext {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 2px;
        }

        /* Content Grid */
        .content-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
        }

        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Cards */
        .card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          overflow: hidden;
          transition: box-shadow 0.3s;
        }

        .card-interactive:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        .card-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .card-body {
          padding: 24px;
        }

        /* Quick Actions */
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .action-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border-radius: 14px;
          color: white;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.3s;
          border: none;
          text-align: left;
          position: relative;
          overflow: hidden;
        }

        .action-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s;
        }

        .action-card:hover::before {
          transform: translateX(100%);
        }

        .action-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.2);
        }

        .action-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(255,255,255,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .action-content {
          flex: 1;
        }

        .action-label {
          display: block;
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 4px;
        }

        .action-description {
          display: block;
          font-size: 0.8125rem;
          opacity: 0.9;
        }

        /* Activity List */
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .activity-item {
          display: flex;
          gap: 16px;
          padding: 16px;
          border-radius: 12px;
          background: #f8fafc;
          transition: all 0.2s;
          border: 1px solid #e2e8f0;
        }

        .activity-item:hover {
          background: #f1f5f9;
          transform: translateX(4px);
        }

        .activity-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .activity-completed { background: #dcfce7; color: #16a34a; }
        .activity-in-progress { background: #fef3c7; color: #d97706; }

        .activity-content {
          flex: 1;
        }

        .activity-title {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9375rem;
          margin-bottom: 4px;
        }

        .activity-description {
          color: #64748b;
          font-size: 0.875rem;
          margin-bottom: 6px;
        }

        .activity-date {
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
        }

        .empty-icon {
          margin-bottom: 12px;
          opacity: 0.5;
        }

        /* Property Info */
        .property-info {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-weight: 500;
          color: #64748b;
          font-size: 0.875rem;
        }

        .info-value {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9375rem;
        }

        .rent-highlight {
          color: #10b981;
          font-size: 1.125rem;
        }

        /* Announcements */
        .announcements-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .announcement-item {
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border-left: 4px solid #6366f1;
          position: relative;
        }

        .announcement-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: #10b981;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .announcement-title {
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 8px;
          font-size: 1rem;
        }

        .announcement-text {
          color: #64748b;
          font-size: 0.875rem;
          line-height: 1.5;
          margin: 0 0 8px;
        }

        .announcement-date {
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 500;
        }

        /* Contact Section */
        .contact-section {
          padding: 20px;
        }

        .contact-icon {
          color: #6366f1;
          margin-bottom: 12px;
        }

        .contact-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 8px;
        }

        .contact-text {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0 0 16px;
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-outline {
          background: transparent;
          border: 1px solid currentColor;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 0.75rem;
        }

        .btn-full {
          width: 100%;
          justify-content: center;
        }

        .btn-link {
          background: none;
          border: none;
          color: #6366f1;
          padding: 0;
          font-weight: 600;
          cursor: pointer;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .tenant-dashboard {
            padding: 16px;
          }

          .dashboard-header {
            padding: 20px;
          }

          .welcome-title {
            font-size: 1.5rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .actions-grid {
            grid-template-columns: 1fr;
          }

          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Utility */
        .mb-6 { margin-bottom: 24px; }
        .mt-3 { margin-top: 12px; }
        .mt-6 { margin-top: 24px; }
        .text-center { text-align: center; }
      `}</style>
    </div>
  );
}