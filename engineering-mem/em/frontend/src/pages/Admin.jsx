import React, { useEffect, useRef, useState } from 'react';
import {
  Upload, Database, Users, AlertTriangle, CircleDot,
  Server, Cpu, HardDrive, FileText, Layers, Activity,
  CheckCircle2, XCircle, ChevronUp, ChevronDown,
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const ROLE_STYLE = {
  ADMIN:      'bg-em-amber/15 text-em-amberDark border border-em-amber/30',
  ENGINEER:   'bg-blue-50 text-blue-700 border border-blue-200',
  TECHNICIAN: 'bg-em-successSoft text-em-success border border-em-success/30',
};

const VIBRANT_ROLE_STYLE = {
  ADMIN:      'bg-purple-100 text-purple-900 border border-purple-400 font-bold shadow-sm',
  ENGINEER:   'bg-blue-100 text-blue-900 border border-blue-400 font-bold shadow-sm',
  TECHNICIAN: 'bg-amber-100 text-amber-900 border border-amber-400 font-bold shadow-sm',
};

function StatCard({ icon: Icon, label, value, sub, vibrantCls }) {
  const { isVibrant } = useTheme();
  return (
    <div className={`flex items-start gap-3 rounded-sm border p-4 transition-all ${isVibrant && vibrantCls ? vibrantCls : 'border-em-line bg-em-surface'}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${isVibrant ? 'bg-white shadow-sm' : 'bg-em-navy/8'}`}>
        <Icon className={`h-4 w-4 ${isVibrant ? 'text-em-graphite' : 'text-em-amber'}`} />
      </span>
      <div className="min-w-0">
        <p className={`text-2xs uppercase tracking-label ${isVibrant ? 'font-bold text-em-graphite' : 'text-em-muted'}`}>{label}</p>
        <p className={`mt-0.5 font-mono text-lg font-bold ${isVibrant ? 'text-em-ink text-xl' : 'text-em-graphite'}`}>{value ?? '—'}</p>
        {sub && <p className="mt-0.5 text-2xs text-em-steel truncate">{sub}</p>}
      </div>
    </div>
  );
}

export default function Admin() {
  const { isVibrant } = useTheme();
  const [stats, setStats] = useState(null);
  const [operators, setOperators] = useState(null);
  const [operatorsError, setOperatorsError] = useState(null);
  const [file, setFile] = useState(null);
  const [docName, setDocName] = useState('');
  const [uploadStatus, setUploadStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sortField, setSortField] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const fileRef = useRef(null);

  const refresh = () => {
    api.get('/stats').then(setStats).catch(() => setStats(null));
    api.get('/auth/directory')
      .then((res) => setOperators(res.users || []))
      .catch(() => setOperatorsError('Operator directory requires administrator role.'));
  };

  useEffect(refresh, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setUploadStatus(null);
    try {
      const form = new FormData();
      form.append('file', file);
      if (docName) form.append('document_name', docName);
      form.append('document_type', 'service_manual');
      const res = await api.post('/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadStatus({ ok: true, text: `Indexed "${res.document_name}" into ${res.chunks_indexed} retrievable passages.` });
      setFile(null); setDocName('');
      if (fileRef.current) fileRef.current.value = '';
      refresh();
    } catch (err) {
      setUploadStatus({ ok: false, text: err?.detail || 'Ingestion failed. Check the document format and try again.' });
    } finally {
      setBusy(false);
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortAsc(v => !v);
    else { setSortField(field); setSortAsc(true); }
  };

  const sortedOps = [...(operators || [])].filter(u => roleFilter === 'ALL' || u.role === roleFilter)
    .sort((a, b) => {
      const av = a[sortField] || ''; const bv = b[sortField] || '';
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const SortIcon = ({ field }) => sortField === field
    ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
    : <ChevronDown className="h-3 w-3 opacity-30" />;

  return (
    <div className="space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Server}    label="Machines"       value={stats?.machines?.total?.toLocaleString()} vibrantCls="border-t-4 border-t-blue-500 border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-white shadow-sm" />
        <StatCard icon={Activity}  label="Cases"          value={stats?.cases?.total?.toLocaleString()} vibrantCls="border-t-4 border-t-purple-500 border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50/50 to-white shadow-sm" />
        <StatCard icon={Users}     label="Technicians"    value={stats?.technicians?.toLocaleString()} vibrantCls="border-t-4 border-t-amber-500 border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-white shadow-sm" />
        <StatCard icon={FileText}  label="Documents"      value={stats?.documents?.toLocaleString()} vibrantCls="border-t-4 border-t-teal-500 border-l-4 border-l-teal-500 bg-gradient-to-br from-teal-50/50 to-white shadow-sm" />
        <StatCard icon={Layers}    label="Vectors"        value={stats?.index?.vectors?.toLocaleString()} vibrantCls="border-t-4 border-t-indigo-500 border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm" />
        <StatCard icon={HardDrive} label="DB Engine"      value={stats?.database?.engine?.split(' ')[0]} sub={stats?.database?.engine} vibrantCls="border-t-4 border-t-emerald-500 border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">

        {/* Platform state */}
        <div className={`panel lg:col-span-4 ${isVibrant ? 'border-l-4 border-l-slate-800 shadow-sm' : ''}`}>
          <div className={`panel-head ${isVibrant ? 'bg-slate-900 text-white' : ''}`}>
            <span className={`tech-label flex items-center gap-2 ${isVibrant ? 'text-slate-100 font-bold' : ''}`}>
              <Database className={`h-3.5 w-3.5 ${isVibrant ? 'text-emerald-400' : 'text-em-steel'}`} />
              Platform state
            </span>
          </div>
          <dl className="divide-y divide-em-line">
            {[
              ['Database engine',       stats?.database?.engine],
              ['Indexed passages',      stats?.document_chunks?.toLocaleString()],
              ['Retrieval vectors',     stats?.index?.vectors?.toLocaleString()],
              ['Embedding dimension',   stats?.index?.dimension],
              ['Embedding model',       stats?.index?.embedding_model],
              ['Reasoning model',       stats?.reasoning_model],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="tech-label">{label}</dt>
                <dd className="font-mono text-2xs text-em-graphite text-right truncate max-w-[55%]">{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-em-line px-4 py-2.5 text-2xs leading-relaxed text-em-muted">
            Retrieval vectors reflect the index currently on disk. Documents must be indexed before appearing in semantic search.
          </p>
        </div>

        {/* Document ingestion */}
        <div className={`panel lg:col-span-8 ${isVibrant ? 'border-l-4 border-l-blue-600 bg-gradient-to-b from-blue-50/20 to-white shadow-sm' : ''}`}>
          <div className={`panel-head ${isVibrant ? 'bg-blue-50/80 border-b border-blue-200' : ''}`}>
            <span className={`tech-label flex items-center gap-2 ${isVibrant ? 'text-blue-950 font-bold' : ''}`}>
              <Upload className={`h-3.5 w-3.5 ${isVibrant ? 'text-blue-700' : 'text-em-steel'}`} />
              Engineering document ingestion
            </span>
          </div>
          <form onSubmit={handleUpload} className="space-y-4 p-5">
            <div>
              <label htmlFor="docName" className="tech-label mb-1.5 block">Document title</label>
              <input
                id="docName"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. ZX210 Hydraulic System Service Manual"
                className="field"
              />
            </div>

            <div>
              <label htmlFor="docFile" className="tech-label mb-1.5 block">File</label>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="docFile"
                  className="flex cursor-pointer items-center gap-2 border border-dashed border-em-line bg-em-paper px-4 py-3 text-2xs text-em-steel hover:border-em-steel hover:text-em-graphite transition-colors flex-1"
                >
                  <Upload className="h-4 w-4 text-em-muted" />
                  {file ? (
                    <span className="font-semibold text-em-graphite truncate">{file.name}</span>
                  ) : (
                    <span>Click to choose file — .txt .md .csv .pdf .docx</span>
                  )}
                </label>
                {file && (
                  <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                    className="text-em-muted hover:text-em-fault">
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input id="docFile" ref={fileRef} type="file" accept=".txt,.md,.csv,.pdf,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)} className="sr-only" />
              <p className="mt-1.5 text-2xs leading-relaxed text-em-muted">
                Text is extracted, split into overlapping passages with page and section metadata, then stored. Machine identifiers and component references are preserved where present.
              </p>
            </div>

            {uploadStatus && (
              <div className={`flex items-start gap-2 border-l-2 px-3 py-2.5 text-2xs leading-relaxed ${
                uploadStatus.ok ? 'border-em-success bg-em-successSoft text-em-success' : 'border-em-fault bg-em-faultSoft text-em-fault'
              }`}>
                {uploadStatus.ok
                  ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                {uploadStatus.text}
              </div>
            )}

            <button type="submit" disabled={busy || !file} className="btn-amber">
              <Upload className="h-3.5 w-3.5" />
              {busy ? 'Ingesting…' : 'Ingest document'}
            </button>
          </form>
        </div>
      </div>

      {/* Operators table */}
      <div className={`panel ${isVibrant ? 'border-l-4 border-l-purple-600 shadow-sm' : ''}`}>
        <div className={`panel-head ${isVibrant ? 'bg-purple-50/80 border-b border-purple-200' : ''}`}>
          <span className={`tech-label flex items-center gap-2 ${isVibrant ? 'text-purple-950 font-bold' : ''}`}>
            <Users className={`h-3.5 w-3.5 ${isVibrant ? 'text-purple-700' : 'text-em-steel'}`} />
            Registered operators
          </span>
          <div className="flex items-center gap-2">
            {['ALL', 'ADMIN', 'ENGINEER', 'TECHNICIAN'].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`px-2 py-0.5 text-2xs font-semibold uppercase tracking-label border transition-colors rounded-sm ${
                  roleFilter === r
                    ? isVibrant ? 'bg-purple-700 text-white border-purple-700 shadow-sm' : 'bg-em-navy text-white border-em-navy'
                    : isVibrant ? 'border-purple-200 text-purple-900 bg-white hover:bg-purple-50' : 'border-em-line text-em-steel hover:border-em-steel'
                }`}>
                {r === 'ALL' ? `All (${(operators || []).length})` : r}
              </button>
            ))}
          </div>
        </div>

        {operatorsError ? (
          <div className="flex items-start gap-2 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-em-warning" />
            <p className="text-xs text-em-graphite">{operatorsError}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={isVibrant ? 'bg-slate-900 text-white' : 'bg-em-panelDeep'}>
                <tr>
                  {[
                    { label: 'Operator ID', field: 'username' },
                    { label: 'Name',        field: 'full_name' },
                    { label: 'Email',       field: 'email' },
                    { label: 'Role',        field: 'role' },
                    { label: 'Created',     field: 'created_at' },
                  ].map(({ label, field }) => (
                    <th key={field}
                      onClick={() => toggleSort(field)}
                      className={`tech-label cursor-pointer select-none px-4 py-2.5 font-semibold ${isVibrant ? 'text-slate-200 hover:text-white' : 'hover:text-em-graphite'}`}>
                      <span className="flex items-center gap-1">{label}<SortIcon field={field} /></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-em-line">
                {sortedOps.map((u) => (
                  <tr key={u.user_id} className={`hover:bg-em-paper transition-colors ${isVibrant ? 'hover:bg-purple-50/20' : ''}`}>
                    <td className="px-4 py-2.5 font-mono text-em-steel">{u.username}</td>
                    <td className="px-4 py-2.5 font-semibold text-em-graphite">{u.full_name}</td>
                    <td className="px-4 py-2.5 text-em-steel">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block rounded-sm px-2 py-0.5 text-2xs font-semibold uppercase tracking-label ${isVibrant ? VIBRANT_ROLE_STYLE[u.role] || 'chip-neutral' : ROLE_STYLE[u.role] || 'chip-neutral'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-2xs text-em-muted">{u.created_at}</td>
                  </tr>
                ))}
                {sortedOps.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-em-muted">No operators match the current filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center gap-1.5 border-t border-em-line px-4 py-2.5 text-2xs text-em-muted">
          <CircleDot className="h-3 w-3" />
          Password hashes are never returned by the API.
        </div>
      </div>
    </div>
  );
}
