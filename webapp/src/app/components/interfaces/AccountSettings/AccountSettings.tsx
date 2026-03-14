"use client";
import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import Navbar from '../../toolbar';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

type Status = 'idle' | 'saving' | 'success' | 'error';

type TabKey = 'account' | 'security' | 'sessions';

interface NavItem { key: TabKey; label: string; description: string; }

const NAV: NavItem[] = [
  { key: 'account', label: 'Account', description: 'Profile & identity' },
  { key: 'security', label: 'Security', description: 'Password & safeguards' },
  { key: 'sessions', label: 'Sessions', description: 'Active device activity' }
];

const ProfileForm = () => {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [original, setOriginal] = useState<{ email: string; username: string } | null>(null);

  const [acceptChange, setAcceptChange] = useState(false);
  const [oauthOnly, setOauthOnly] = useState<boolean | null>(null); // null = loading
  // Track if OAuth provider is GitHub for conditional UI
  const [activeTab, setActiveTab] = useState<TabKey>('account');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Initialize from session (only once when available)
  useEffect(() => {
    if (session?.user && !original) {
      const email = session.user.email || '';
  const username = typeof session.user.name === 'string' ? session.user.name : '';
      setFormData(prev => ({ ...prev, email, username }));
      setOriginal({ email, username });
    }
  }, [session, original]);

  // Fetch providers & password presence to decide password UI
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/user');
        if (!res.ok) return;
        const json = await res.json();
        if (!active) return;
  const pv: string[] = json.providers || [];
        // For users authenticated via GitHub, do not show Change Password per requirement
        const usesGithub = pv.includes('github');
        setOauthOnly(usesGithub);
      } catch {
        // ignore
      }
    })();
    return () => { active = false };
  }, []);

  const hasProfileChanges = useCallback(() => {
    if (!original) return true; // allow initial
    return formData.email !== original.email || formData.username !== original.username;
  }, [formData, original]);

  const passwordSectionFilled = () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    return currentPassword || newPassword || confirmPassword;
  };

  const validatePasswordChange = (): string | null => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    if (!passwordSectionFilled()) return null; // optional section
    if (!currentPassword || !newPassword || !confirmPassword) return 'Fill all password fields';
    if (newPassword.length < 8) return 'New password must be at least 8 characters';
    if (newPassword !== confirmPassword) return 'New password & confirmation do not match';
    return null;
  };

  const buildPayload = () => {
    const payload: Record<string, string> = {};
    if (hasProfileChanges()) {
      if (formData.email) payload.email = formData.email;
      if (formData.username) payload.username = formData.username;
    }
    if (passwordSectionFilled()) {
      payload.currentPassword = passwordData.currentPassword;
      payload.newPassword = passwordData.newPassword;
      payload.confirmNewPassword = passwordData.confirmPassword;
    }
    return payload;
  };

  const resetPasswordFields = () => {
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleSubmit = async () => {
    if (status === 'saving') return;
    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic guards
    const pwdErr = validatePasswordChange();
    if (pwdErr) {
      setErrorMsg(pwdErr);
      return;
    }
    const payload = buildPayload();
    if (Object.keys(payload).length === 0) {
      setErrorMsg('No changes to update');
      return;
    }
    setStatus('saving');
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Update failed');
      // Update originals
      if (json.user) {
        setOriginal({ email: json.user.email, username: json.user.username });
        setFormData(prev => ({ ...prev, email: json.user.email, username: json.user.username }));
      }
      if (passwordSectionFilled()) resetPasswordFields();
      setSuccessMsg('Profile updated successfully');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 1800);
    } catch (e: unknown) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  const renderAccountSection = (): ReactNode => (
    <div className="border border-white/10 bg-[#2f3132]">
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-medium text-white">Profile</h2>
      </div>
      <div className="p-6 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start pb-2">
          <label className="text-sm text-white/70 font-medium md:pt-2">Primary email</label>
          <div className="md:col-span-3">
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 border bg-[#2a2a2a] border-[#3a3a3a] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3E9] focus:border-transparent" />
            <p className="text-xs text-white/40 mt-2">Used for notifications and recovery.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start pb-2">
          <label className="text-sm text-white/70 font-medium md:pt-2">Username</label>
          <div className="md:col-span-3">
            <input type="text" name="username" value={formData.username} onChange={handleInputChange} className="w-full px-3 py-2 border bg-[#2a2a2a] border-[#3a3a3a] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3E9] focus:border-transparent" />
            <p className="text-xs text-white/40 mt-2">Appears across the dashboard.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySection = (): ReactNode => {
    if (oauthOnly === null) {
      return <div className="border border-white/10 bg-[#2f3132] p-6 text-sm text-white/50">Loading account security...</div>;
    }
    if (oauthOnly) {
      return (
        <div className="border border-white/10 bg-[#2f3132] p-6 space-y-2">
          <h2 className="text-lg font-medium text-white">Password Management Disabled</h2>
          <p className="text-sm text-white/50">Your account is authenticated via GitHub — password changes are not available.</p>
        </div>
      );
    }
    return (
      <div className="border border-white/10 bg-[#2f3132]">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-medium text-white">Change Password</h2>
        </div>
        <div className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start pb-1">
            <label className="text-sm text-white/70 font-medium md:pt-2">Current password</label>
            <div className="md:col-span-3">
              <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="Enter current password" className="w-full px-3 py-2 border bg-[#2a2a2a] border-[#3a3a3a] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3E9] focus:border-transparent" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start pb-1">
            <label className="text-sm text-white/70 font-medium md:pt-2">New password</label>
            <div className="md:col-span-3">
              <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="Enter new password" className="w-full px-3 py-2 border bg-[#2a2a2a] border-[#3a3a3a] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3E9] focus:border-transparent" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start pb-1">
            <label className="text-sm text-white/70 font-medium md:pt-2">Confirm new password</label>
            <div className="md:col-span-3">
              <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="Confirm new password" className="w-full px-3 py-2 border bg-[#2a2a2a] border-[#3a3a3a] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3E9] focus:border-transparent" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSessionsSection = (): ReactNode => (
    <div className="border border-white/10 bg-[#2f3132] p-6 text-sm text-white/60 space-y-4">
      <h2 className="text-lg font-medium text-white">Active Sessions</h2>
      <p>No session tracking implemented yet.</p>
      <p className="text-xs text-white/40">(Placeholder) Future enhancement: device list, revoke tokens, last activity timeline.</p>
    </div>
  );

  const renderActive = () => {
    switch (activeTab) {
      case 'security': return renderSecuritySection();
      case 'sessions': return renderSessionsSection();
      case 'account':
      default: return renderAccountSection();
    }
  };

  const renderSavePanel = () => (
    <div className="border border-white/10 bg-[#2f3132] px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <label className="flex items-start cursor-pointer gap-3">
        <div className="relative mt-0.5">
          <input type="checkbox" checked={acceptChange} onChange={(e)=>setAcceptChange(e.target.checked)} className="sr-only" />
          <div className={`w-5 h-5 border flex items-center justify-center text-white text-[10px] ${acceptChange? 'bg-[#00A3E9] border-[#00A3E9]' : 'border-white/40 bg-transparent'}`}>{acceptChange && '✓'}</div>
        </div>
        <div>
          <div className="text-sm text-white/80 font-medium">I confirm these changes</div>
          <p className="text-xs text-white/40 mt-1">Applies to the currently visible tab.</p>
        </div>
      </label>
      <div className="flex flex-col items-end gap-2 w-full md:w-auto">
        {errorMsg && <div className="text-xs text-red-400 bg-red-900/30 border border-red-800 px-3 py-1 w-full md:w-auto text-right">{errorMsg}</div>}
        {successMsg && <div className="text-xs text-green-400 bg-green-900/30 border border-green-800 px-3 py-1 w-full md:w-auto text-right">{successMsg}</div>}
        <button type="button" onClick={handleSubmit} disabled={!acceptChange || status==='saving'} className={`px-6 py-2 text-sm font-semibold min-w-[130px] ${acceptChange && status!=='saving' ? 'bg-[#00A3E9] text-white cursor-pointer' : 'bg-[#404040] text-white/40 cursor-not-allowed'}`}>{status==='saving'?'Saving...' : status==='success'?'Saved':'Save Changes'}</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#1b1b1d] text-white overflow-hidden">
      <Navbar />
      <style jsx global>{`body { padding:0 !important; overflow:hidden !important; }`}</style>
      <div className="mx-auto flex h-full w-full max-w-7xl gap-10 px-6 pt-20 pb-16 overflow-hidden">
        <aside className="w-60 shrink-0 flex flex-col">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-white/45">Account Settings</p>
          <nav className="space-y-2 flex-1">
            {NAV.map(item => {
              const active = item.key === activeTab;
              return (
                <button key={item.key} onClick={()=>setActiveTab(item.key)} className={`w-full text-left border px-4 py-3 text-sm font-medium cursor-pointer ${active ? 'border-white/30 bg-[#2f3233] text-white' : 'border-white/10 bg-[#2a2c2d] text-white/65 hover:bg-[#2e3031] hover:text-white'}`}> 
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="mt-1 text-[11px] text-white/45">{item.description}</div>
                </button>
              );
            })}
            <div className="pt-6">
              <div className="flex items-center gap-3 text-xs text-white/60">
                <Image src="/assets/dist.png" alt="AVACX" width={28} height={28} />
                <div>
                  <div className="font-medium text-white/80">AVACX</div>
                  <div className="text-[11px] text-white/50">By Fyron Industries</div>
                </div>
              </div>
              {/* <div className="mt-3 text-[10px] text-white/40">v1 • Internal</div> */}
            </div>
          </nav>
        </aside>
        <main className="flex-1 h-full overflow-y-auto no-scrollbar space-y-8 pr-2">
          {renderActive()}
          {renderSavePanel()}
        </main>
      </div>
    </div>
  );
};

export default ProfileForm;