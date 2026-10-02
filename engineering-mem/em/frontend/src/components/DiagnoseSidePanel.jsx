import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, CheckCircle2, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import MachineScene from './3d/MachineScene';
import api from '../services/api';

const WORKFLOW_STEPS = [
  { key: 'diagnosed',  label: 'Diagnosis',        pct: 25 },
  { key: 'repaired',   label: 'Repair Done',       pct: 50 },
  { key: 'submitted',  label: 'Submitted',         pct: 75 },
  { key: 'approved',   label: 'Eng. Approved',     pct: 100 },
];

function WorkflowBar({ diagnosis }) {
  const currentPct = !diagnosis ? 0
    : diagnosis.verified_by_tech ? 100
    : diagnosis.actual_cause_confirmed ? 75
    : diagnosis.component_id ? 50
    : 25;

  return (
    <div className="px-3 py-3 border-t border-em-line">
      <div className="flex items-center justify-between mb-2">
        <span className="tech-label">Workflow Progress</span>
        <span className="font-mono text-xs font-bold text-em-amber">{currentPct}%</span>
      </div>

      <div className="relative h-2 bg-em-panel rounded-sm overflow-hidden mb-3">
        <div
          className="absolute inset-y-0 left-0 bg-em-amber transition-all duration-700"
          style={{ width: `${currentPct}%` }}
        />
      </div>

      <div className="flex items-start justify-between gap-1">
        {WORKFLOW_STEPS.map((step, i) => {
          const done = currentPct >= step.pct;
          return (
            <div key={step.key} className="flex flex-col items-center gap-1 flex-1">
              <div className={`flex h-5 w-5 items-center justify-center rounded-full border text-2xs font-bold transition-colors ${
                done ? 'border-em-amber bg-em-amber text-white' : 'border-em-line bg-em-panel text-em-muted'
              }`}>
                {done ? <CheckCircle2 className="h-3 w-3" /> : <span>{i + 1}</span>}
              </div>
              <span className={`text-center text-2xs leading-tight ${done ? 'text-em-graphite font-semibold' : 'text-em-muted'}`}>
                {step.label}
              </span>
              <span className="text-2xs text-em-muted">{step.pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DiagnoseSidePanel() {
  const [lastDiagnosis, setLastDiagnosis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isDiagnosedToday = (diag) => {
      if (!diag) return false;
      const today = new Date().toISOString().slice(0, 10);
      const diagDate = (diag.created_at || '').slice(0, 10);
      return diagDate === today;
    };

    const fetch = () => {
      // Only show results if user ran a diagnosis in THIS browser session
      const activeSession = sessionStorage.getItem('active_session_diagnosed') === 'true';
      if (!activeSession) {
        setLastDiagnosis(null);
        setLoading(false);
        return;
      }

      // Read only from sessionStorage (cleared on tab close)
      const stored = sessionStorage.getItem('latest_diagnosis');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setLastDiagnosis(parsed);
        } catch (e) { setLastDiagnosis(null); }
      } else {
        setLastDiagnosis(null);
      }
      setLoading(false);
    };

    fetch();
    const interval = setInterval(fetch, 5000);

    const handleUpdate = (e) => {
      sessionStorage.setItem('active_session_diagnosed', 'true');
      if (e?.detail && isDiagnosedToday(e.detail)) {
        setLastDiagnosis(e.detail);
        sessionStorage.setItem('latest_diagnosis', JSON.stringify(e.detail));
        setLoading(false);
      }
    };
    window.addEventListener('diagnosis_updated', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('diagnosis_updated', handleUpdate);
    };
  }, []);

  const componentId = lastDiagnosis?.component_id || (
    lastDiagnosis?.affected_component?.toLowerCase().includes('accumulator') ? 'comp_accumulator'
    : lastDiagnosis?.affected_component?.toLowerCase().includes('pump') ? 'comp_pump'
    : lastDiagnosis?.affected_component?.toLowerCase().includes('cooler') ? 'comp_cooler'
    : lastDiagnosis?.affected_component?.toLowerCase().includes('filter') ? 'comp_filter'
    : lastDiagnosis?.affected_component?.toLowerCase().includes('valve') ? 'comp_valve'
    : lastDiagnosis?.affected_component?.toLowerCase().includes('tank') || lastDiagnosis?.affected_component?.toLowerCase().includes('oil') ? 'comp_oil'
    : lastDiagnosis?.affected_component?.toLowerCase().includes('engine') ? 'comp_engine'
    : lastDiagnosis?.affected_component?.toLowerCase().includes('arm') ? 'comp_arm'
    : lastDiagnosis?.affected_component?.toLowerCase().includes('boom') ? 'comp_boom'
    : lastDiagnosis?.affected_component?.toLowerCase().includes('bucket') ? 'comp_bucket'
    : lastDiagnosis?.affected_component?.toLowerCase().includes('swing') ? 'comp_swing'
    : lastDiagnosis?.affected_component?.toLowerCase().includes('travel') ? 'comp_travel'
    : null
  );

  return (
    <div className="flex flex-col bg-em-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-em-line bg-em-navyTint shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center bg-em-navy">
            <Wrench className="h-3.5 w-3.5 text-em-amber" />
          </span>
          <span className="font-mono text-2xs font-bold uppercase tracking-[0.16em] text-em-navy">
            Live Diagnosis
          </span>
        </div>
        <Link to="/diagnose" className="flex items-center gap-1 text-2xs font-semibold text-em-amberDark hover:underline">
          Open <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 3D Viewer */}
      <div className="border-b border-em-line shrink-0">
        <MachineScene
          highlightedComponentId={componentId}
          machineState={componentId ? 'faulted' : 'normal'}
          showSubsystemBar={true}
          defaultViewMode="original"
          machineLabel="EX200"
          autoFocus={true}
          showCallout={false}
          className="h-[300px] w-full"
        />
      </div>

      {/* Diagnosis result — only shown after a real diagnosis */}
      {!loading && lastDiagnosis && (
        <div className="px-3 py-3 border-b border-em-line shrink-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="tech-label">Last Diagnosis</span>
              <span className={`chip ${lastDiagnosis.evidence_sufficiency === 'sufficient' ? 'chip-success' : 'chip-amber'}`}>
                {lastDiagnosis.evidence_sufficiency}
              </span>
            </div>
            <p className="text-sm font-bold text-em-graphite">{lastDiagnosis.affected_component}</p>
            <div className="flex items-center gap-2 text-2xs text-em-steel">
              <ShieldCheck className="h-3 w-3 text-em-amber" />
              <span>{lastDiagnosis.machine_id}</span>
              {lastDiagnosis.confidence_score && (
                <span className="ml-auto font-mono text-em-graphite font-bold">
                  {(lastDiagnosis.confidence_score * 100).toFixed(0)}% conf.
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-2xs text-em-muted">
              <Clock className="h-3 w-3" />
              {lastDiagnosis.created_at?.slice(0, 10) || 'recent'}
            </div>
          </div>
        </div>
      )}

      {/* Placeholder when no diagnosis yet */}
      {!loading && !lastDiagnosis && (
        <div className="px-3 py-3 border-b border-em-line shrink-0">
          <p className="text-2xs text-em-muted">No diagnosis run yet.</p>
          <Link to="/diagnose" className="mt-1 inline-block text-2xs font-semibold text-em-amberDark hover:underline">
            Run first diagnosis →
          </Link>
        </div>
      )}


      {/* Workflow progress bar */}
      <WorkflowBar diagnosis={lastDiagnosis} />
    </div>
  );
}
