import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function TenantSettings() {
  const { userProfile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    if (newPassword !== confirmPassword) {
      setMsg('❌ New passwords do not match!');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setMsg('❌ Password must be at least 6 characters!');
      setLoading(false);
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: currentPassword
      });

      if (signInError) throw new Error('Current password is incorrect');

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setMsg('✅ Password changed successfully! Please use your new password next time.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{marginBottom: 24}}>Account Settings</h2>

      <div className="card">
        <h3 style={{marginTop: 0}}>Change Password</h3>
        <p style={{color: 'var(--gray)', fontSize: 13, marginBottom: 12}}>
          Update your password to keep your account secure.
        </p>
        <form onSubmit={handleChangePassword}>
          <input
            type="password"
            placeholder="Current Password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            style={{...inputStyle, marginTop: 8}}
            required
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            style={{...inputStyle, marginTop: 8}}
            required
          />
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{marginTop: 12, width: '100%'}}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
        {msg && (
          <p style={{
            marginTop: 12, 
            textAlign: 'center', 
            fontWeight: 'bold',
            color: msg.includes('✅') ? 'var(--green)' : 'var(--red)'
          }}>
            {msg}
          </p>
        )}
      </div>

      <div className="card" style={{marginTop: 24}}>
        <h3 style={{marginTop: 0}}>Profile Information</h3>
        <div style={{display: 'grid', gap: 8}}>
          <p style={{margin: 0}}><strong>Name:</strong> {userProfile?.name || 'N/A'}</p>
          <p style={{margin: 0}}><strong>Email:</strong> {userProfile?.email || 'N/A'}</p>
          <p style={{margin: 0}}><strong>Unit:</strong> {userProfile?.house || 'N/A'}</p>
          <p style={{margin: 0}}><strong>Monthly Rent:</strong> KSh {userProfile?.rent || '0'}</p>
          <p style={{margin: 0}}><strong>Status:</strong> 
            <span className={`badge ${userProfile?.status === 'good' ? 'status-green' : userProfile?.status === 'pending' ? 'status-amber' : 'status-red'}`} style={{marginLeft: 8}}>
              {(userProfile?.status || 'good').toUpperCase()}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

const inputStyle = { 
  padding: 8, 
  borderRadius: 4, 
  border: '1px solid var(--border)', 
  width: '100%', 
  background: 'var(--bg)', 
  color: 'var(--text)' 
};