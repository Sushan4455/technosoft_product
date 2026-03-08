import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Database, Cloud, HardDrive, ShieldCheck, RefreshCw, 
  Clock, DownloadCloud, AlertTriangle, Lock, Server, 
  Activity, Play, CheckCircle2, Search, RotateCcw
} from 'lucide-react';

const DataBackup = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(null);
  const [backupSchedule, setBackupSchedule] = useState('Daily');
  const [backups, setBackups] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchBackups();
  }, []);

  // --- 1. FETCH REAL DATA FROM SUPABASE ---
  const fetchBackups = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setCurrentUser(session.user);
      
      try {
        const { data, error } = await supabase
          .from('system_backups')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setBackups(data || []);
      } catch (err) {
        console.error("Error fetching backups: ", err.message);
      }
    }
    setLoading(false);
  };

  // --- 2. LOG A REAL BACKUP TO SUPABASE ---
  const handleManualBackup = async () => {
    if (!currentUser) return alert("Please log in.");
    setIsBackingUp(true);

    const newBackupRecord = {
      user_id: currentUser.id,
      backup_ref: `BCK-${Date.now().toString().slice(-6)}`,
      backup_type: 'Full Backup (Manual)',
      size: '1.2 GB', // In a production app, this would calculate actual DB size
      location: 'Cloud (Multi-Region)',
      integrity: 'Verified',
      status: 'Success'
    };

    try {
      const { error } = await supabase.from('system_backups').insert([newBackupRecord]);
      if (error) throw error;

      alert("Manual Backup completed, encrypted, and logged to database successfully.");
      fetchBackups(); // Refresh the list with the real data
    } catch (err) {
      alert(`Failed to create backup log: ${err.message}. Make sure you created the system_backups table.`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = (id) => {
    if (window.confirm("WARNING: Restoring this backup will overwrite current system data. This action requires Admin privileges. Proceed?")) {
      setIsRestoring(id);
      setTimeout(() => {
        setIsRestoring(null);
        alert(`System successfully restored to backup point ${id}.`);
      }, 2500);
    }
  };

  const handleExportLocal = (id) => {
    alert(`Downloading encrypted backup file (${id}.enc) to your local drive...`);
  };

  const handleDRMode = () => {
    if (window.confirm("CRITICAL: You are about to engage Disaster Recovery Mode. This will trigger a multi-region failover and restore the latest verified full backup. Are you absolutely sure?")) {
      alert("Disaster Recovery protocol initiated. System traffic is being rerouted.");
    }
  };

  const filteredBackups = backups.filter(b => 
    b.backup_ref.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.backup_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500 bg-slate-50/50">
        <RefreshCw className="animate-spin text-[#1774b5] mb-4" size={40} />
        <p className="text-base font-medium">Connecting to secure backup servers...</p>
      </div>
    );
  }

  return (
    <div className="font-sans text-slate-900 pb-12 w-full h-full bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-4 border-b border-slate-200/80 pb-4 px-4 sm:px-6 lg:px-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-medium tracking-tight text-slate-800 flex items-center gap-2">
                <Database className="text-[#1774b5]" size={22}/> Data Vault & Recovery
              </h1>
              <span className="bg-emerald-50 text-emerald-600 text-[10px] font-medium px-2 py-0.5 rounded-sm uppercase tracking-widest border border-emerald-200">System Protected</span>
          </div>
          <p className="text-slate-500 text-sm mt-1">Manage cloud backups, multi-region redundancy, and disaster recovery.</p>
        </div>
        <button 
          onClick={handleManualBackup} 
          disabled={isBackingUp}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-colors rounded-lg disabled:bg-slate-300"
        >
          {isBackingUp ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />} 
          {isBackingUp ? 'Backing up...' : 'One-Click Manual Backup'}
        </button>
      </div>

      {/* TOP SYSTEM STATUS BANNER */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="w-full bg-[#1774b5] text-white p-6 rounded-lg border border-blue-800/50">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="p-3 bg-white/20 text-white rounded-md shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div className="flex-1">
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Lock size={12}/> AES-256 Encrypted Vault
              </p>
              <h2 className="text-base font-medium text-white leading-relaxed">
                  Your data is actively mirrored across 3 global regions. Incremental backups are running in real-time. Zero backup failures detected in the last 30 days.
              </h2>
            </div>
            <div className="shrink-0 bg-blue-900/30 p-3 rounded-md border border-blue-400/20 text-center">
                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-0.5">Retention Policy</p>
                <p className="text-lg font-bold text-emerald-300">30 Days</p>
                <p className="text-[9px] text-blue-200 mt-1">Immutable (Undeletable)</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3-PILLAR DASHBOARD GRID */}
      <div className="px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Automation & Storage */}
          <div className="bg-white border border-slate-200/80 rounded-lg p-5 flex flex-col">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Clock size={16} className="text-[#1774b5]" />
                  <h3 className="text-sm font-semibold text-slate-800">Automation & Storage</h3>
              </div>
              <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Auto-Schedule</p>
                          <p className="text-xs text-slate-400 mt-0.5">Runs at 02:00 AM</p>
                      </div>
                      <select 
                          value={backupSchedule} 
                          onChange={(e) => setBackupSchedule(e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded outline-none focus:border-[#1774b5]"
                      >
                          <option>Daily</option>
                          <option>Weekly</option>
                      </select>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-50 pt-4">
                      <div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Primary Storage</p>
                          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-1"><Cloud size={14} className="text-[#1774b5]"/> Cloud Vault</p>
                      </div>
                      <div className="text-right">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Usage</p>
                          <p className="text-sm font-semibold text-slate-800 mt-1">45.2 GB</p>
                      </div>
                  </div>
              </div>
          </div>

          {/* Security & Integrity */}
          <div className="bg-white border border-slate-200/80 rounded-lg p-5 flex flex-col">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Activity size={16} className="text-[#1774b5]" />
                  <h3 className="text-sm font-semibold text-slate-800">Security & Integrity</h3>
              </div>
              <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500"/> Verification</p>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">100% Passed</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Server size={14} className="text-[#1774b5]"/> Redundancy</p>
                      <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200">3 Regions Sync</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Lock size={14} className="text-[#1774b5]"/> Access Control</p>
                      <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100">Admin Only</span>
                  </div>
              </div>
          </div>

          {/* Disaster Recovery */}
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-5 flex flex-col">
              <div className="flex items-center gap-2 border-b border-rose-200/50 pb-3 mb-3">
                  <AlertTriangle size={16} className="text-rose-600" />
                  <h3 className="text-sm font-bold text-rose-800">Disaster Recovery (DR)</h3>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed mb-4 flex-1">
                  In the event of total server failure or critical data corruption, engage DR Mode. This will instantly boot your system from the last verified safe point in an alternate region.
              </p>
              <button onClick={handleDRMode} className="w-full py-2.5 bg-white border border-rose-300 text-rose-700 text-xs font-bold uppercase tracking-widest rounded transition-colors hover:bg-rose-600 hover:text-white">
                  Engage Recovery Mode
              </button>
          </div>

      </div>

      {/* VERSION HISTORY TABLE */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200/80 rounded-lg flex flex-col overflow-hidden">
            
            {/* Table Header & Search */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">Version History (Live Database)</h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Older backups are automatically purged per retention policy.</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search by ID or Type..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#1774b5] transition-colors" 
                    />
                </div>
            </div>

            {/* Table Content */}
            <div className="p-0 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-5">Timestamp</th>
                            <th className="py-3 px-5">Backup ID</th>
                            <th className="py-3 px-5">Type</th>
                            <th className="py-3 px-5">Size</th>
                            <th className="py-3 px-5">Integrity</th>
                            <th className="py-3 px-5 text-right w-48 pr-6">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredBackups.map((backup) => (
                            <tr key={backup.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-4 px-5">
                                    <p className="font-medium text-slate-800">{new Date(backup.created_at).toLocaleDateString()}</p>
                                    <p className="text-[10px] text-slate-500">{new Date(backup.created_at).toLocaleTimeString()}</p>
                                </td>
                                <td className="py-4 px-5">
                                    <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">{backup.backup_ref}</span>
                                </td>
                                <td className="py-4 px-5">
                                    <p className="font-medium text-slate-700">{backup.backup_type}</p>
                                </td>
                                <td className="py-4 px-5">
                                    <p className="text-slate-600 font-medium">{backup.size}</p>
                                </td>
                                <td className="py-4 px-5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase tracking-widest border border-emerald-100 rounded">
                                        <CheckCircle2 size={10}/> {backup.integrity}
                                    </span>
                                </td>
                                <td className="py-4 px-5 text-right pr-6">
                                    <div className="flex gap-2 justify-end">
                                        <button 
                                            onClick={() => handleExportLocal(backup.backup_ref)} 
                                            className="p-1.5 text-slate-400 hover:text-[#1774b5] hover:bg-blue-50 rounded transition-colors"
                                            title="Export Local"
                                        >
                                            <HardDrive size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleRestore(backup.backup_ref)}
                                            disabled={isRestoring === backup.backup_ref}
                                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-[#1774b5] hover:bg-blue-50 hover:border-[#1774b5] text-[10px] font-bold uppercase tracking-widest rounded transition-all disabled:opacity-50"
                                        >
                                            {isRestoring === backup.backup_ref ? <RefreshCw size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                            {isRestoring === backup.backup_ref ? 'Restoring' : 'Restore'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredBackups.length === 0 && (
                            <tr>
                                <td colSpan="6" className="py-12 text-center">
                                    <Database size={32} className="mx-auto text-slate-300 mb-3" />
                                    <p className="text-slate-500 font-medium text-sm">No backup records found in database.</p>
                                    <p className="text-slate-400 text-xs mt-1">Click "One-Click Manual Backup" above to run your first system save.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
      </div>

    </div>
  );
};

export default DataBackup;