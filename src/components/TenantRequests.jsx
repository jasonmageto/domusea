import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { MessageSquare, Send, AlertCircle, CheckCircle, Clock, Wrench, Loader2 } from "lucide-react";

// ---- Static config, kept outside the component so it isn't recreated on every render ----

const STATUS_CONFIG = {
  Open: { icon: Clock, className: 'dea-req-badge-open' },
  'In Progress': { icon: AlertCircle, className: 'dea-req-badge-progress' },
  Resolved: { icon: CheckCircle, className: 'dea-req-badge-resolved' },
};

const TYPE_CONFIG = {
  complaint: { icon: AlertCircle, className: 'dea-req-type-complaint', label: 'Complaint' },
  maintenance: { icon: Wrench, className: 'dea-req-type-maintenance', label: 'Maintenance' },
};

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Lightweight toast, styled to match the brand rather than relying on native alert()
function showToast(message, variant = 'success') {
  const toast = document.createElement('div');
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    background: variant === 'success' ? '#10B981' : '#DC2626',
    color: '#ffffff',
    padding: '12px 20px',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    fontSize: '14px',
    fontWeight: '600',
    zIndex: 9999,
    animation: 'dea-req-toast-in 0.3s ease-out',
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Open;
  const Icon = config.icon;
  return (
    <span className={`dea-req-badge ${config.className}`}>
      <Icon size={14} />
      {status}
    </span>
  );
}

export default function TenantRequests() {
  const { userProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: '', message: '', type: 'complaint' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('tenant_id', userProfile.id)
        .order('date', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Routing: the complaint goes only to the tenant's assigned admin,
      // never to the Supreme Admin — admin_id is set from the tenant's own profile.
      const { error } = await supabase.from('complaints').insert({
        tenant_id: userProfile.id,
        admin_id: userProfile.admin_id,
        subject: form.subject,
        message: form.message,
        type: form.type,
        date: new Date().toISOString(),
        status: 'Open',
      });

      if (error) throw error;

      setForm({ subject: '', message: '', type: 'complaint' });
      fetchRequests();
      showToast('Request submitted to your Property Admin', 'success');
    } catch (error) {
      showToast(error.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="dea-req-loading">
        <Loader2 size={32} className="dea-req-spin" />
      </div>
    );
  }

  return (
    <div className="dea-req-page">
      {/* Page Header */}
      <div className="dea-req-page-header">
        <div className="dea-req-page-icon">
          <MessageSquare color="#ffffff" size={22} />
        </div>
        <div>
          <h1 className="dea-req-page-title">Submit Request / Complaint</h1>
          <p className="dea-req-page-subtitle">
            Report issues or submit maintenance requests to your Property Admin
          </p>
        </div>
      </div>

      {/* Submit Form Card */}
      <div className="dea-req-card">
        <div className="dea-req-card-banner">
          <h2 className="dea-req-card-title">New Request</h2>
          <p className="dea-req-card-subtitle">Fill in the details below to submit your request</p>
        </div>

        <form onSubmit={handleSubmit} className="dea-req-form">
          {/* Request Type */}
          <div className="dea-req-field">
            <label className="dea-req-label">Request Type</label>
            <div className="dea-req-type-toggle">
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const active = form.type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, type: key })}
                    className={`dea-req-type-btn ${active ? 'dea-req-type-btn-active' : ''}`}
                  >
                    <Icon size={18} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject */}
          <div className="dea-req-field">
            <label htmlFor="subject" className="dea-req-label">Subject</label>
            <input
              type="text"
              id="subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Brief description of the issue"
              className="dea-req-input"
              required
              disabled={submitting}
            />
          </div>

          {/* Message */}
          <div className="dea-req-field">
            <label htmlFor="message" className="dea-req-label">Description</label>
            <textarea
              id="message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe the issue in detail..."
              rows={5}
              className="dea-req-textarea"
              required
              disabled={submitting}
            />
          </div>

          {/* Submit Button */}
          <div className="dea-req-form-footer">
            <button type="submit" disabled={submitting} className="dea-req-submit">
              {submitting ? (
                <>
                  <Loader2 size={18} className="dea-req-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit to Admin
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* History Section */}
      <div className="dea-req-history">
        <div className="dea-req-history-header">
          <Clock size={20} />
          <h2 className="dea-req-history-title">My History</h2>
          <span className="dea-req-history-count">{requests.length}</span>
        </div>

        {requests.map((r) => {
          const typeCfg = TYPE_CONFIG[r.type] || TYPE_CONFIG.complaint;
          const TypeIcon = typeCfg.icon;
          return (
            <div
              key={r.id}
              className="dea-req-history-card"
              style={{ borderLeftColor: r.status === 'Resolved' ? '#10B981' : '#F59E0B' }}
            >
              <div className="dea-req-history-card-header">
                <div className="dea-req-history-card-heading">
                  <div className={`dea-req-type-icon ${typeCfg.className}`}>
                    <TypeIcon size={18} />
                  </div>
                  <div>
                    <h3 className="dea-req-history-subject">{r.subject}</h3>
                    <p className="dea-req-history-date">{formatDate(r.date)}</p>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>

              <div className="dea-req-history-card-body">
                <p>{r.message}</p>
              </div>

              {r.response && (
                <div className="dea-req-history-response">
                  <div className="dea-req-history-response-icon">
                    <CheckCircle size={16} />
                  </div>
                  <div>
                    <p className="dea-req-history-response-label">Admin Response</p>
                    <p className="dea-req-history-response-text">{r.response}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {requests.length === 0 && (
          <div className="dea-req-empty">
            <div className="dea-req-empty-icon">
              <MessageSquare size={30} />
            </div>
            <h3 className="dea-req-empty-title">No requests yet</h3>
            <p className="dea-req-empty-text">You haven't submitted any requests or complaints yet.</p>
          </div>
        )}
      </div>

      <style>{`
        .dea-req-page, .dea-req-page * {
          box-sizing: border-box;
        }

        .dea-req-page {
          --dea-navy: #0B2545;
          --dea-navy-soft: #33455e;
          --dea-muted: #6b7a8f;
          --dea-emerald: #10B981;
          --dea-emerald-light: #34D399;
          --dea-amber: #F59E0B;
          --dea-border: #e6ebf1;
          --dea-bg-soft: #f6f8fb;

          max-width: 880px;
          margin: 0 auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .dea-req-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 260px;
          color: var(--dea-emerald);
        }

        .dea-req-spin {
          animation: dea-req-spin 0.8s linear infinite;
        }

        @keyframes dea-req-spin { to { transform: rotate(360deg); } }

        @keyframes dea-req-toast-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ---- Page header ---- */
        .dea-req-page-header {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .dea-req-page-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--dea-emerald-light) 0%, var(--dea-navy) 55%, var(--dea-amber) 100%);
          box-shadow: 0 8px 20px rgba(11, 37, 69, 0.2);
        }

        .dea-req-page-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--dea-navy);
          margin: 0;
        }

        .dea-req-page-subtitle {
          font-size: 13px;
          color: var(--dea-muted);
          margin: 4px 0 0;
        }

        /* ---- Form card ---- */
        .dea-req-card {
          background: #ffffff;
          border: 1px solid var(--dea-border);
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(11, 37, 69, 0.06);
          overflow: hidden;
        }

        .dea-req-card-banner {
          padding: 18px 24px;
          background: linear-gradient(90deg, rgba(16,185,129,0.08) 0%, rgba(245,158,11,0.08) 100%);
          border-bottom: 1px solid var(--dea-border);
        }

        .dea-req-card-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--dea-navy);
          margin: 0;
        }

        .dea-req-card-subtitle {
          font-size: 13px;
          color: var(--dea-muted);
          margin: 4px 0 0;
        }

        .dea-req-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .dea-req-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dea-req-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--dea-navy-soft);
        }

        .dea-req-type-toggle {
          display: flex;
          gap: 12px;
        }

        .dea-req-type-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border: 2px solid var(--dea-border);
          border-radius: 12px;
          background: #ffffff;
          color: var(--dea-muted);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .dea-req-type-btn:hover {
          border-color: #c7d2de;
        }

        .dea-req-type-btn-active {
          border-color: var(--dea-emerald);
          background: rgba(16, 185, 129, 0.08);
          color: var(--dea-emerald);
        }

        .dea-req-input,
        .dea-req-textarea {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid var(--dea-border);
          border-radius: 12px;
          font-size: 14px;
          font-family: inherit;
          color: var(--dea-navy);
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .dea-req-textarea {
          resize: none;
        }

        .dea-req-input:focus,
        .dea-req-textarea:focus {
          border-color: var(--dea-emerald);
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
        }

        .dea-req-form-footer {
          display: flex;
          justify-content: flex-end;
        }

        .dea-req-submit {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(90deg, var(--dea-emerald-light) 0%, var(--dea-amber) 100%);
          color: var(--dea-navy);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.2);
        }

        .dea-req-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* ---- Status badges ---- */
        .dea-req-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid transparent;
        }

        .dea-req-badge-open {
          background: rgba(245, 158, 11, 0.12);
          color: #b45309;
          border-color: rgba(245, 158, 11, 0.3);
        }

        .dea-req-badge-progress {
          background: rgba(37, 99, 235, 0.1);
          color: #1d4ed8;
          border-color: rgba(37, 99, 235, 0.25);
        }

        .dea-req-badge-resolved {
          background: rgba(16, 185, 129, 0.12);
          color: #047857;
          border-color: rgba(16, 185, 129, 0.3);
        }

        /* ---- History ---- */
        .dea-req-history {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .dea-req-history-header {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--dea-navy-soft);
        }

        .dea-req-history-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--dea-navy);
          margin: 0;
        }

        .dea-req-history-count {
          padding: 3px 10px;
          background: var(--dea-bg-soft);
          color: var(--dea-navy-soft);
          font-size: 12px;
          font-weight: 700;
          border-radius: 999px;
        }

        .dea-req-history-card {
          background: #ffffff;
          border: 1px solid var(--dea-border);
          border-left: 4px solid var(--dea-amber);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(11, 37, 69, 0.04);
        }

        .dea-req-history-card-header {
          padding: 16px 20px;
          background: var(--dea-bg-soft);
          border-bottom: 1px solid var(--dea-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }

        .dea-req-history-card-heading {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .dea-req-type-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .dea-req-type-complaint {
          background: rgba(245, 158, 11, 0.14);
          color: #b45309;
        }

        .dea-req-type-maintenance {
          background: rgba(16, 185, 129, 0.14);
          color: #047857;
        }

        .dea-req-history-subject {
          font-size: 15px;
          font-weight: 700;
          color: var(--dea-navy);
          margin: 0;
        }

        .dea-req-history-date {
          font-size: 12px;
          color: var(--dea-muted);
          margin: 2px 0 0;
        }

        .dea-req-history-card-body {
          padding: 16px 20px;
          font-size: 14px;
          line-height: 1.6;
          color: var(--dea-navy-soft);
        }

        .dea-req-history-response {
          padding: 14px 20px;
          background: rgba(16, 185, 129, 0.06);
          border-top: 1px solid rgba(16, 185, 129, 0.15);
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .dea-req-history-response-icon {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: rgba(16, 185, 129, 0.15);
          color: var(--dea-emerald);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .dea-req-history-response-label {
          font-size: 13px;
          font-weight: 700;
          color: #047857;
          margin: 0 0 2px;
        }

        .dea-req-history-response-text {
          font-size: 13px;
          font-style: italic;
          color: #0f5c46;
          line-height: 1.5;
          margin: 0;
        }

        /* ---- Empty state ---- */
        .dea-req-empty {
          text-align: center;
          padding: 48px 24px;
          background: #ffffff;
          border: 1px solid var(--dea-border);
          border-radius: 16px;
        }

        .dea-req-empty-icon {
          width: 60px;
          height: 60px;
          border-radius: 999px;
          background: var(--dea-bg-soft);
          color: var(--dea-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
        }

        .dea-req-empty-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--dea-navy);
          margin: 0 0 6px;
        }

        .dea-req-empty-text {
          font-size: 13px;
          color: var(--dea-muted);
          margin: 0;
        }

        @media (max-width: 640px) {
          .dea-req-page { padding: 16px; gap: 22px; }
          .dea-req-type-toggle { flex-direction: column; }
          .dea-req-form-footer { justify-content: stretch; }
          .dea-req-submit { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
