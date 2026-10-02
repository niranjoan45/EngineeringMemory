import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QrCode, Truck, Wrench, ClipboardList } from 'lucide-react';
import api from '../services/api';
import { Notice } from '../components/common/Evidence';
import { formatHours, orNotRecorded } from '../utils/format';

export default function ScanLanding() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [cases, setCases] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/machines/scan/${token}`)
      .then((res) => {
        setData(res);
        // fetch full historic cases for this machine
        return api.get(`/cases?machine_id=${res.machine_id}&limit=500`);
      })
      .then((res) => setCases(res.cases || []))
      .catch((err) => setError(err?.detail || 'This machine code did not resolve to a machine in the registry.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="p-6 text-xs text-em-steel">Resolving machine code {token}…</p>;

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Notice tone="fault" title="Unknown machine code">
          <span className="block font-mono">{token}</span>
          {error}
        </Notice>
        <div className="mt-4">
          <button className="btn-outline" onClick={() => navigate('/machines')}>Fleet registry</button>
        </div>
      </div>
    );
  }

  const machine = data.machine || {};
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      {/* Machine header */}
      <div className="panel p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center bg-em-navy">
            <QrCode className="h-6 w-6 text-em-amber" />
          </span>
          <div>
            <p className="font-mono text-xl font-bold text-em-graphite">{data.machine_id}</p>
            <p className="text-xs text-em-steel">{orNotRecorded(machine.machine_model)} · {orNotRecorded(machine.machine_type)} · {orNotRecorded(machine.manufacturer)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-2xs sm:grid-cols-4">
          {[
            ['Model', orNotRecorded(machine.machine_model)],
            ['Operating hours', formatHours(machine.operating_hours)],
            ['Status', orNotRecorded(machine.status)],
            ['Open investigations', (data.open_investigations || []).length],
          ].map(([label, value]) => (
            <div key={label} className="border border-em-line p-2">
              <span className="tech-label block">{label}</span>
              <span className="text-em-graphite">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/machines/${data.machine_id}`} className="btn-amber">
            <Truck className="h-3.5 w-3.5" />
            Open machine detail
          </Link>
          <Link to="/diagnose" className="btn-outline">
            <Wrench className="h-3.5 w-3.5" />
            Start diagnosis
          </Link>
        </div>
      </div>

      {/* Historic cases */}
      <div className="panel">
        <div className="panel-head">
          <span className="tech-label flex items-center gap-2">
            <ClipboardList className="h-3.5 w-3.5 text-em-steel" />
            Historical maintenance cases
          </span>
          <span className="tech-value tnum">{cases.length}</span>
        </div>
        <ul className="divide-y divide-em-line">
          {cases.map((c) => (
            <li key={c.case_id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-em-graphite">{c.case_id}</span>
                <span className="tech-value tnum">{c.operating_hours != null ? `${Number(c.operating_hours).toLocaleString()} h` : '—'}</span>
              </div>
              <p className="mt-1 text-2xs text-em-steel">{c.component} — {c.failure_mode}</p>
              <p className="mt-0.5 text-2xs text-em-muted">{c.symptom}</p>
              <p className="mt-0.5 text-2xs text-em-success">Repair: {c.repair_action}</p>
            </li>
          ))}
          {cases.length === 0 && (
            <li className="p-4 text-xs text-em-muted">No maintenance cases recorded for this machine.</li>
          )}
        </ul>
      </div>

      <p className="text-center text-2xs text-em-muted">
        Read-only view. Diagnosis and evidence entry require signing in.
      </p>
    </div>
  );
}
