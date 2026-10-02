import React from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldAlert, CircleAlert } from 'lucide-react';
import Sidebar from './TopNav';
import useSystemStatus from '../../hooks/useSystemStatus';
import DiagnoseSidePanel from '../DiagnoseSidePanel';

import ThemeToggle from '../ThemeToggle';

function PageHeading({ title, purpose }) {
  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-em-line pb-3 mb-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-bold uppercase tracking-[0.12em] text-em-graphite">{title}</h1>
        {purpose && <p className="max-w-3xl text-xs leading-relaxed text-em-steel">{purpose}</p>}
      </div>
      <div className="shrink-0 pt-0.5">
        <ThemeToggle />
      </div>
    </div>
  );
}

const PAGE_META = {
  '/diagnose':            { title: 'Diagnosis Workstation',  purpose: 'Report every observed symptom. The system retrieves comparable historical repairs, engineering documentation and condition evidence, then states the most likely cause and what to inspect next.' },
  '/machines':            { title: 'Machine Overview',       purpose: 'Fleet registry with recorded operating hours, service status and accumulated maintenance history.' },
  '/engineering-memory':  { title: 'Memory Search',     purpose: 'Semantic search across the accumulated maintenance case archive and indexed engineering documentation.' },
  '/cases':               { title: 'Historical Cases',       purpose: 'Dense archive of recorded maintenance interventions, including provenance of every record.' },
  '/evidence':            { title: 'Evidence / Manuals',     purpose: 'Indexed engineering documents and the passages retrieved to support a diagnosis.' },
  '/sensors':             { title: 'Condition Analysis',     purpose: 'Hydraulic test-rig condition classification. This is a public condition-monitoring dataset used as supporting evidence and is not live machine telemetry.' },
  '/admin':               { title: 'Administration',         purpose: 'Operators, document ingestion and platform state.' },
  '/investigations':      { title: 'Investigations',         purpose: 'Fault investigations in progress. Every finding re-runs evidence retrieval, and failed attempts are preserved as engineering evidence rather than discarded.' },
  '/review':              { title: 'Review Queue',           purpose: 'Extractions and technician submissions that need an engineer decision. Nothing is embedded into the vector index before it is approved here.' },
  '/ingestion':           { title: 'Ingestion',              purpose: 'Multimodal document intake: classification, extraction, structuring and confidence assessment, then human review before indexing.' },
};

export default function AppShell({ children }) {
  const location = useLocation();
  const { warnings } = useSystemStatus();
  const meta = PAGE_META[location.pathname] || {};
  const isMachineDetail =
    location.pathname.startsWith('/machines/') || location.pathname.startsWith('/investigations/');

  return (
    <div className="flex min-h-screen bg-em-paper">
      {/* Left sidebar nav — fixed */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Warning banner */}
        {warnings.length > 0 && (
          <div className="border-b border-em-line bg-em-faultSoft px-5 py-2 flex items-center gap-2">
            <CircleAlert className="h-3.5 w-3.5 shrink-0 text-em-fault" />
            <span className="text-2xs font-semibold uppercase tracking-wider text-em-fault">
              {warnings.join(' ')}
            </span>
          </div>
        )}

        {/* Content row */}
        <div className="flex flex-1 min-h-0">
          {/* Page content */}
          <main className="flex-1 min-w-0 overflow-y-auto px-6 py-5">
            {!isMachineDetail && meta.title && (
              <PageHeading title={meta.title} purpose={meta.purpose} />
            )}
            {children}
          </main>

          {/* Right: DiagnoseSidePanel — centered in the first view (viewport) without scrolling */}
          <aside
            className="w-[320px] shrink-0 pr-6 pl-2 self-start sticky z-10"
            style={{ top: 'max(1.25rem, calc((100vh - 480px) / 2))' }}
          >
            <div className="border border-em-line bg-em-surface shadow-sm overflow-hidden rounded-sm">
              <DiagnoseSidePanel />
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="border-t border-em-line bg-em-surface px-5 py-2.5 flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-em-warning" />
            <p className="text-2xs leading-relaxed text-em-steel">
              <span className="font-semibold uppercase tracking-label text-em-ink">Safety advisory — </span>
              Engineering decision support only. Verify every diagnosis against the approved OEM service procedure and apply lockout/tagout before any physical intervention.
            </p>
          </div>
          <p className="text-2xs uppercase tracking-label text-em-muted shrink-0">
            Runs entirely on this machine · No cloud services
          </p>
        </footer>
      </div>
    </div>
  );
}
