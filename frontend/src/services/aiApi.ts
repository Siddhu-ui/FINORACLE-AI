/**
 * FinOracle AI — Authenticated Backend AI/ML/RAG API Client
 * Attaches the local FastAPI JWT (`Authorization: Bearer <token>`)
 * so every /api/ai/* request is strictly scoped to the verified user_id.
 */
import { HEALTH_URL, apiRequest } from '@/services/api';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, { ...init, requireAuth: true });
}

// ---- Types ----

export interface ClassifyPrediction {
  category: string;
  display_category: string;
  confidence: number;
  model: string;
  source: string;
  top_alternatives: { category: string; display_category: string; confidence: number }[];
}

export interface BatchClassifyItemResult extends ClassifyPrediction {
  id?: string | null;
  description: string;
  current_category?: string | null;
}

export interface BatchClassifyResponse {
  predictions: BatchClassifyItemResult[];
  user_corrections_applied: number;
}

export interface ClassifierEvaluationReport {
  dataset: {
    name: string;
    version: string;
    source: string;
    total_samples: number;
    train_samples: number;
    test_samples: number;
    num_categories: number;
    categories: string[];
  };
  ml_model: {
    name: string;
    accuracy: number;
    macro_precision: number;
    macro_recall: number;
    macro_f1: number;
    weighted_precision: number;
    weighted_recall: number;
    weighted_f1: number;
    cv_5fold_macro_f1_mean: number;
    cv_5fold_macro_f1_std: number;
    confusion_matrix: number[][];
    per_class: { category: string; precision: number; recall: number; f1: number; support: number }[];
  };
  baseline_model: {
    name: string;
    accuracy: number;
    macro_precision: number;
    macro_recall: number;
    macro_f1: number;
    weighted_precision: number;
    weighted_recall: number;
    weighted_f1: number;
    confusion_matrix: number[][];
  };
  improvement_over_baseline: {
    macro_f1_delta: number;
    accuracy_delta: number;
  };
}

export interface ForecastChartPoint {
  month: string;
  actual: number | null;
  predicted: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
}

export interface ExpenseForecastResponse {
  status: 'ok' | 'insufficient_data';
  available: boolean;
  method?: string;
  months_available: number;
  months_required: number;
  months_needed: number;
  reason?: string;
  training_months?: number;
  historical_monthly_average?: number;
  next_month_vs_average_percent?: number;
  mae: number | null;
  rmse: number | null;
  metrics: {
    mae: number | null;
    rmse: number | null;
    validation_split: string | null;
    uncertainty_band?: string;
  };
  historical: { month: string; actual_expense: number; transaction_count: number; is_partial: boolean }[];
  predictions: {
    month: string;
    month_offset: number;
    predicted_expense: number;
    lower_bound: number;
    upper_bound: number;
    confidence_level: string;
  }[];
  chart_series: ForecastChartPoint[];
}

export interface UnusualSpendingAlert {
  transaction_id?: string | null;
  description: string;
  category: string;
  amount: number;
  date: string;
  label: string;
  severity: 'high' | 'medium';
  ratio_to_baseline: number;
  anomaly_score: number;
  explanation: string;
}

export interface AnomalyDetectionResponse {
  status: 'ok' | 'insufficient_data';
  available: boolean;
  method: string | null;
  label: string;
  reason?: string;
  disclaimer?: string;
  total_analyzed?: number;
  alerts: UnusualSpendingAlert[];
}

export interface InsightEvidence {
  metric_key: string;
  metric_source: string;
  timeframe: string;
  primary_value_inr?: number | null;
  comparison_value_inr?: number | null;
  percent_change?: number | null;
  extra: Record<string, unknown>;
}

export interface InsightCardItem {
  id: string;
  category: string;
  severity: 'positive' | 'info' | 'warning' | 'high';
  title: string;
  message: string;
  action_item: string;
  evidence: InsightEvidence;
  llm_enhanced: boolean;
}

export interface MonthlySeriesPoint {
  month: string;
  income: number;
  expenses: number;
  net_savings: number;
  savings_rate: number;
  transaction_count: number;
}

export interface CategoryMomItem {
  category: string;
  current: number;
  previous: number;
  delta: number;
  delta_percent: number | null;
  share_percent: number;
}

export interface SavingsOpportunity {
  id: string;
  kind: 'category_trim' | 'budget_overrun' | 'goal_gap';
  title: string;
  message: string;
  monthly_saving_inr: number;
  annual_saving_inr: number;
  evidence: string;
}

export interface BudgetStatusPayload {
  has_budget: boolean;
  month?: string;
  budget_name?: string;
  total_limit?: number;
  total_spent?: number;
  utilization_percent?: number;
  expected_pace_percent?: number;
  projected_end_of_month_spend?: number;
  burn_rate_status?: string;
  categories?: {
    category: string;
    limit: number;
    spent: number;
    utilization_percent: number;
    exceeded: boolean;
  }[];
}

export interface AIInsightsResponse {
  summary: {
    recorded_income: number;
    recorded_expenses: number;
    net_cash_flow: number;
    savings_rate: number;
    latest_month?: string | null;
    planned_monthly_income?: number;
  };
  category_totals: Record<string, number>;
  monthly_series: MonthlySeriesPoint[];
  category_mom: CategoryMomItem[];
  top_category: { category: string; amount: number; share_percent: number; month: string | null } | null;
  savings_opportunities: SavingsOpportunity[];
  has_transactions: boolean;
  transaction_count: number;
  budget_status: BudgetStatusPayload;
  forecast: ExpenseForecastResponse;
  unusual_spending: AnomalyDetectionResponse;
  insights: InsightCardItem[];
  llm_enhanced: boolean;
  classification_evaluation?: ClassifierEvaluationReport;
}

export interface RagOrganizationStatus {
  organization: string;
  chunk_count: number;
  documents: string[];
}

export interface RagStatusResponse {
  engine: string;
  engine_label: string;
  retrieval_mode: string;
  embedding_provider: string;
  embedding_model: string;
  llm_provider: string;
  llm_model: string;
  llm_configured: boolean;
  chunks_in_db: number;
  embedded_chunks: number;
  total_documents: number;
  similarity_threshold: number;
  organizations: RagOrganizationStatus[];
  sample_questions: string[];
  ready: boolean;
}

export interface RagCitation {
  index?: number;
  chunk_id: string;
  source_title: string;
  title: string;
  organization: string;
  url: string;
  publication_or_retrieval_date: string;
  section: string;
  chunk_text: string;
  similarity: number;
  relevance_score: number;
}

export interface RagQueryResponse {
  query: string;
  sufficient_context: boolean;
  llm_configured: boolean;
  fallback_used?: boolean;
  fallback_reason?: string;
  provider?: string;
  model?: string;
  configuration_error?: string;
  required_env_vars?: string[];
  provider_error?: string;
  retrieval_mode?: string;
  similarity_threshold?: number;
  answer: string | null;
  retrieved_excerpts_summary?: string;
  citations: RagCitation[];
  disclaimer: string;
}

export interface RagSourceDoc {
  source_title: string;
  organization: string;
  url: string;
  publication_or_retrieval_date: string;
  category: string;
  sections: string[];
}

export interface CopilotToolTrace {
  tool_name: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface CopilotChatResponse {
  session_id: string;
  llm_configured: boolean;
  fallback_used?: boolean;
  fallback_reason?: string;
  provider?: string;
  model?: string;
  configuration_error?: string;
  required_env_vars?: string[];
  provider_error?: string;
  response: string;
  tools_used: CopilotToolTrace[];
  sources: RagCitation[];
}

export interface ConversationalScenarioResponse {
  needs_clarification: boolean;
  extraction_mode: string;
  follow_up_questions: string[];
  missing_information: string[];
  parsed_changes: { type: string; label: string; amount: number }[];
  income_loss_months?: number;
  current_position: {
    monthly_income: number;
    monthly_expenses: number;
    monthly_savings: number;
    existing_goal_savings: number;
  };
  assumptions: string[];
  affordability?: {
    purchase_amount: number;
    monthly_surplus: number;
    months_of_surplus_needed: number | null;
    emergency_buffer_3m: number;
    verdict: string;
    reason: string;
    risk_flags: string[];
  } | null;
  simulation?: {
    baseline: {
      income: number;
      expenses: number;
      monthly_savings: number;
      savings_rate: number;
      savings_6m: number;
      savings_12m: number;
    };
    modified: {
      income: number;
      expenses: number;
      one_time_outflow: number;
      income_loss_months: number;
      recurring_savings_allocation: number;
      monthly_savings: number;
      savings_rate: number;
      savings_6m: number;
      savings_12m: number;
      min_cumulative_balance: number;
    };
    impact: {
      monthly_net_delta: number;
      steady_monthly_net_delta: number;
      delta_percent: number;
      annual_net_difference: number;
      runway_months: number | null;
      goal_impact: string;
    };
    risk_flags: { code: string; severity: string; message: string }[];
    comparison_table: { metric: string; current: number; projected: number; delta: number }[];
    projection_12m: { month: string; baseline: number; scenario: number; monthly_scenario_net: number }[];
  } | null;
}

export interface AIStatusResponse {
  authenticated_user: string;
  llm_provider: string;
  llm_model: string;
  llm_configured: boolean;
  embedding_provider: string;
  embedding_configured: boolean;
  database_engine: string;
  auth_engine: string;
  ml_categories: string[];
  ml_category_display_map: Record<string, string>;
}

export interface BackendHealthResponse {
  status: string;
  service: string;
  version: string;
  llm_provider: string;
  llm_configured: boolean;
}

// ---- API Client ----

export const aiApi = {
  checkHealth: async (): Promise<BackendHealthResponse> => {
    const res = await fetch(HEALTH_URL);
    if (!res.ok) throw new Error(`Backend health check failed (${res.status})`);
    return res.json() as Promise<BackendHealthResponse>;
  },

  getStatus: () => apiFetch<AIStatusResponse>('/ai/status'),

  classify: (description: string, categoryHint = '') =>
    apiFetch<ClassifyPrediction>('/ai/classify', {
      method: 'POST',
      body: JSON.stringify({ description, category_hint: categoryHint }),
    }),

  classifyBatch: (transactions: { id?: string; description: string; category?: string }[]) =>
    apiFetch<BatchClassifyResponse>('/ai/classify/batch', {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    }),

  getClassifierEvaluation: () => apiFetch<ClassifierEvaluationReport>('/ai/classify/evaluation'),

  correctCategory: (payload: {
    transaction_id: string;
    corrected_category: string;
    predicted_category?: string;
    confidence?: number;
    confirmed: boolean;
  }) =>
    apiFetch<{ confirmed: boolean; updated: boolean; feedback_saved: boolean }>('/ai/categories/correct', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getForecast: (months = 3) => apiFetch<ExpenseForecastResponse>(`/ai/forecast?months=${months}`),

  getAnomalies: () => apiFetch<AnomalyDetectionResponse>('/ai/anomalies'),

  getInsights: (useLlm = false) => apiFetch<AIInsightsResponse>(`/ai/insights?use_llm=${useLlm}`),

  queryRag: (query: string, topK = 4) =>
    apiFetch<RagQueryResponse>('/ai/rag/query', {
      method: 'POST',
      body: JSON.stringify({ query, top_k: topK }),
    }),

  getRagSources: () => apiFetch<{ sources: RagSourceDoc[] }>('/ai/rag/sources'),

  getRagStatus: () => apiFetch<RagStatusResponse>('/ai/rag/status'),

  copilotChat: (sessionId: string, message: string) =>
    apiFetch<CopilotChatResponse>('/ai/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, message }),
    }),

  converseScenario: (payload: {
    message: string;
    baseline_income?: number;
    baseline_expenses?: number;
  }) =>
    apiFetch<ConversationalScenarioResponse>('/ai/scenarios/converse', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
