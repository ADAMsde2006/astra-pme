const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface OverviewData {
  snapshot_month: string;
  total_projects_monitored: number;
  total_distinct_projects: number;
  longitudinal_core_projects: number;
  monthly_snapshots: Record<string, number>;
  risk_summary: {
    critical_risk_count: number;
    high_risk_count: number;
    moderate_risk_count: number;
    low_risk_count: number;
    avg_overall_risk: number;
    avg_cost_risk: number;
    avg_schedule_risk: number;
    avg_implementation_risk: number;
  };
  trajectory_summary: {
    total_tracked: number;
    rapidly_deteriorating: number;
    deteriorating: number;
    stable: number;
    improving: number;
  };
  audit_summary: {
    total_audit_issues: number;
    errors: number;
    warnings: number;
    infos: number;
    average_confidence: number;
    high_confidence_projects: number;
    medium_confidence_projects: number;
    low_confidence_projects: number;
  };
  contradiction_summary: {
    total_contradictions: number;
    critical_count: number;
    warning_count: number;
    info_count: number;
    affected_projects_count: number;
    by_rule: Record<string, number>;
  };
  exit_summary: {
    total_evaluated: number;
    exit_candidates: number;
    review_required: number;
    active_projects: number;
  };
  state_breakdown: Array<{
    state: string;
    project_count: number;
    total_cost_cr: number;
    total_exp_cr: number;
    avg_risk: number;
  }>;
  agency_breakdown: Array<{
    agency_raw: string;
    project_count: number;
    avg_risk: number;
  }>;
  sector_breakdown: Array<{
    table_section: string;
    project_count: number;
    avg_risk: number;
  }>;
}

export interface ProjectListItem {
  project_code: number;
  project_name: string;
  state: string;
  agency_raw: string;
  table_section: string;
  cost_revised_cr: number;
  expenditure_cum_cr: number;
  physical_progress_pct: number;
  overall_risk: number;
  cost_risk: number;
  schedule_risk: number;
  implementation_risk: number;
  overall_risk_band: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  trajectory: 'STABLE' | 'IMPROVING' | 'DETERIORATING' | 'RAPIDLY DETERIORATING';
  data_confidence: number;
}

export interface ProjectDetailData {
  project_info: {
    project_code: number;
    project_name: string;
    state: string;
    agency_raw: string;
    table_section: string;
    legacy_ocms_code?: string;
    pmgid?: string;
    cost_original_cr: number;
    cost_revised_cr: number;
    expenditure_cum_cr: number;
    physical_progress_pct: number;
    approval_month?: string;
    start_month?: string;
    doc_original?: string;
    doc_revised?: string;
    parse_flags?: string;
  };
  risk: {
    overall_risk: number;
    cost_risk: number;
    schedule_risk: number;
    implementation_risk: number;
    overall_risk_band: string;
    cost_risk_band: string;
    schedule_risk_band: string;
    implementation_risk_band: string;
    anomaly_score: number;
  };
  trajectory: {
    current_risk: number;
    current_velocity: number;
    current_acceleration: number;
    trajectory_state: string;
    months: string[];
    overall_risks: number[];
    cost_risks?: number[];
    schedule_risks?: number[];
    implementation_risks?: number[];
    velocities?: number[];
    accelerations?: number[];
  };
  early_warning: {
    horizon_3m: { forecast_score: number; forecast_band: string; uncertainty_band: [number, number]; confidence_level: string };
    horizon_6m: { forecast_score: number; forecast_band: string; uncertainty_band: [number, number]; confidence_level: string };
    horizon_12m: { forecast_score: number; forecast_band: string; uncertainty_band: [number, number]; confidence_level: string };
    risk_trigger_factors: string[];
  };
  drivers: {
    drivers: Array<{
      feature: string;
      display_name: string;
      importance_weight: number;
      feature_value: number;
      direction: string;
      impact: string;
    }>;
  };
  benchmarks: {
    peer_count: number;
    current_project: {
      cost_escalation_pct: number;
      expenditure_ratio: number;
      physical_progress_pct: number;
      overall_risk: number;
    };
    cohort_benchmarks: {
      cost_escalation_pct: { mean: number; median: number; p25: number; p75: number };
      expenditure_ratio: { mean: number; median: number; p25: number; p75: number };
      physical_progress_pct: { mean: number; median: number; p25: number; p75: number };
      overall_risk: { mean: number; median: number; p25: number; p75: number };
    };
    relative_position: {
      cost_escalation_percentile: number;
      progress_percentile: number;
      risk_percentile: number;
    };
  };
  data_trust: {
    confidence_score: number;
    audits: Array<{
      snapshot_month: string;
      field: string;
      issue: string;
      observed_value: string;
      expected_condition: string;
      severity: string;
      status: string;
    }>;
    contradictions: Array<{
      id: string;
      rule_id: string;
      field: string;
      observed_value: string;
      expected_condition: string;
      severity: string;
      category: string;
    }>;
    anomaly_score: number;
  };
  longitudinal_history: Array<{
    snapshot_month: string;
    cost_revised_cr: number;
    expenditure_cum_cr: number;
    physical_progress_pct: number;
    progress_velocity: number;
    expenditure_velocity: number;
    doc_revised?: string;
    overall_risk: number;
    cost_risk: number;
    schedule_risk: number;
    implementation_risk: number;
  }>;
  exit_status?: {
    status: string;
    exit_condition: string;
    evidence: string[];
  };
  administrative_attention: {
    priority: string;
    reasons: string[];
  };
}

export interface WatchlistItem {
  rank: number;
  project_code: number;
  project_name: string;
  state: string;
  agency_raw: string;
  table_section: string;
  cost_revised_cr: number;
  expenditure_cum_cr: number;
  physical_progress_pct: number;
  overall_risk: number;
  cost_risk: number;
  schedule_risk: number;
  implementation_risk: number;
  trajectory: string;
  risk_velocity: number;
  risk_acceleration: number;
  data_confidence: number;
  priority_score: number;
  priority: string;
}

export const api = {
  getOverview: async (): Promise<OverviewData> => {
    const res = await fetch(`${API_BASE_URL}/overview`);
    if (!res.ok) throw new Error(`Failed to load overview: ${res.statusText}`);
    return res.json();
  },

  getProjects: async (params: { search?: string; state?: string; agency?: string; section?: string; risk_band?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.state) query.set('state', params.state);
    if (params.agency) query.set('agency', params.agency);
    if (params.section) query.set('section', params.section);
    if (params.risk_band) query.set('risk_band', params.risk_band);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    
    const res = await fetch(`${API_BASE_URL}/projects?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to load projects: ${res.statusText}`);
    return res.json();
  },

  getProjectDetail: async (projectCode: number): Promise<ProjectDetailData> => {
    const res = await fetch(`${API_BASE_URL}/projects/${projectCode}`);
    if (!res.ok) throw new Error(`Failed to load project detail for ${projectCode}: ${res.statusText}`);
    return res.json();
  },

  getWatchlist: async (filters?: { state?: string; priority?: string; trajectory?: string }): Promise<WatchlistItem[]> => {
    const query = new URLSearchParams();
    if (filters?.state) query.set('state', filters.state);
    if (filters?.priority) query.set('priority', filters.priority);
    if (filters?.trajectory) query.set('trajectory', filters.trajectory);

    const res = await fetch(`${API_BASE_URL}/watchlist?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to load watchlist: ${res.statusText}`);
    return res.json();
  },

  getEarlyWarning: async (horizon: string = '3m', band?: string) => {
    const query = new URLSearchParams({ horizon });
    if (band) query.set('band', band);
    const res = await fetch(`${API_BASE_URL}/early-warning?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to load early warning: ${res.statusText}`);
    return res.json();
  },

  getDrivers: async (projectCode: number, target: string = 'overall') => {
    const res = await fetch(`${API_BASE_URL}/drivers/${projectCode}?target=${target}`);
    if (!res.ok) throw new Error(`Failed to load drivers for ${projectCode}`);
    return res.json();
  },

  getBenchmark: async (projectCode: number) => {
    const res = await fetch(`${API_BASE_URL}/benchmark/${projectCode}`);
    if (!res.ok) throw new Error(`Failed to load benchmark for ${projectCode}`);
    return res.json();
  },

  getAudits: async (params: { snapshot_month?: string; severity?: string; project_code?: number; state?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.snapshot_month) query.set('snapshot_month', params.snapshot_month);
    if (params.severity) query.set('severity', params.severity);
    if (params.project_code) query.set('project_code', params.project_code.toString());
    if (params.state) query.set('state', params.state);
    
    const res = await fetch(`${API_BASE_URL}/audit?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to load field audits: ${res.statusText}`);
    return res.json();
  },

  getContradictions: async (params: { severity?: string; snapshot_month?: string; project_code?: number; rule_id?: string; state?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.severity) query.set('severity', params.severity);
    if (params.snapshot_month) query.set('snapshot_month', params.snapshot_month);
    if (params.project_code) query.set('project_code', params.project_code.toString());
    if (params.rule_id) query.set('rule_id', params.rule_id);
    if (params.state) query.set('state', params.state);

    const res = await fetch(`${API_BASE_URL}/contradictions?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to load contradictions: ${res.statusText}`);
    return res.json();
  },

  getExits: async (params: { status?: string; state?: string; agency?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.state) query.set('state', params.state);
    if (params.agency) query.set('agency', params.agency);

    const res = await fetch(`${API_BASE_URL}/exits?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to load exit ledger: ${res.statusText}`);
    return res.json();
  },

  getModelCard: async () => {
    const res = await fetch(`${API_BASE_URL}/model-card`);
    if (!res.ok) throw new Error(`Failed to load model card: ${res.statusText}`);
    return res.json();
  },

  queryAssistant: async (query: string, projectCode?: number) => {
    const res = await fetch(`${API_BASE_URL}/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, project_code: projectCode })
    });
    if (!res.ok) throw new Error(`Failed to query assistant: ${res.statusText}`);
    return res.json();
  }
};
