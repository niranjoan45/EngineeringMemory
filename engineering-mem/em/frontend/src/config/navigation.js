import {
  Wrench,
  Truck,
  Layers,
  BookOpen,
  FileText,
  Activity,
  Settings,
  Radar,
  ClipboardCheck,
  Upload,
} from 'lucide-react';

export const ROLES = { TECHNICIAN: 'TECHNICIAN', ENGINEER: 'ENGINEER', ADMIN: 'ADMIN' };

export const NAV_DIVIDER = { divider: true };

const DIAGNOSE      = { to: '/diagnose',          label: 'Run Diagnosis',      icon: Wrench };
const INVESTIGATIONS= { to: '/investigations',     label: 'Investigations',     icon: Radar };
const MACHINES      = { to: '/machines',           label: 'Machines',           icon: Truck };
const MEMORY        = { to: '/engineering-memory', label: 'Memory Search',    icon: Layers };
const CASES         = { to: '/cases',              label: 'Historical Cases',   icon: BookOpen };
const EVIDENCE      = { to: '/evidence',           label: 'Evidence / Manuals', icon: FileText };
const SENSORS       = { to: '/sensors',            label: 'Condition Analysis', icon: Activity };
const ADMIN         = { to: '/admin',              label: 'Administration',     icon: Settings };
const REVIEW        = { to: '/review',             label: 'Review Queue',       icon: ClipboardCheck };
const INGESTION     = { to: '/ingestion',          label: 'Ingestion',          icon: Upload };

export const NAV_BY_ROLE = {
  [ROLES.TECHNICIAN]: [
    DIAGNOSE, INVESTIGATIONS, MACHINES,
  ],
  [ROLES.ENGINEER]: [
    DIAGNOSE, INVESTIGATIONS, MACHINES,
    NAV_DIVIDER,
    MEMORY, CASES, EVIDENCE, SENSORS,
    NAV_DIVIDER,
    REVIEW,
  ],
  [ROLES.ADMIN]: [
    DIAGNOSE, INVESTIGATIONS, MACHINES,
    NAV_DIVIDER,
    MEMORY, CASES, EVIDENCE, SENSORS,
    NAV_DIVIDER,
    REVIEW, INGESTION,
    NAV_DIVIDER,
    ADMIN,
  ],
};

export const ACCESS_BY_ROLE = {
  [ROLES.TECHNICIAN]: ['/diagnose', '/investigations', '/machines'],
  [ROLES.ENGINEER]:   ['/diagnose', '/investigations', '/machines', '/engineering-memory', '/cases', '/evidence', '/sensors', '/review'],
  [ROLES.ADMIN]:      ['/diagnose', '/investigations', '/machines', '/engineering-memory', '/cases', '/evidence', '/sensors', '/review', '/ingestion', '/admin'],
};

export const HOME_BY_ROLE = {
  [ROLES.TECHNICIAN]: '/diagnose',
  [ROLES.ENGINEER]:   '/diagnose',
  [ROLES.ADMIN]:      '/diagnose',
};

export const canAccess = (role, path) => {
  const allowed = ACCESS_BY_ROLE[role];
  if (!allowed) return false;
  return allowed.some((base) => path === base || path.startsWith(`${base}/`));
};

export const navFor = (role) => NAV_BY_ROLE[role] || [];
