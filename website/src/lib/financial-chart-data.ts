import {
  localizeFinancialText,
  localizeFinancialVariable,
  scenarioLabel,
} from './dossier-format';
import type { Lang } from './i18n';

interface FinancialPoint {
  label: string;
  revenueK: number;
  ebitdaK: number;
  cashEopK: number;
}

interface UseOfFundsBucket {
  bucket: string;
  pct: number;
  usd: number;
}

interface HeadcountRole {
  role: string;
  values: number[];
}

interface HeadcountQuarter {
  i: number;
  q: QuarterKey;
  total: number;
}

interface SensitivityRow {
  variable: string;
  cashImpactK: number;
  revImpactK: number;
  downside: string;
  upside: string;
}

interface ScenarioRow {
  key: ScenarioKey;
  label: string;
  desc: string;
  revK: number;
  ebitdaK: number;
  cashLowK: number;
}

const QUARTERS = [
  'q1y1', 'q2y1', 'q3y1', 'q4y1',
  'q1y2', 'q2y2', 'q3y2', 'q4y2',
  'q1y3', 'q2y3', 'q3y3', 'q4y3',
] as const;

export const QUARTER_LABELS = [
  'Q1Y1', 'Q2Y1', 'Q3Y1', 'Q4Y1',
  'Q1Y2', 'Q2Y2', 'Q3Y2', 'Q4Y2',
  'Q1Y3', 'Q2Y3', 'Q3Y3', 'Q4Y3',
] as const;

const SCENARIO_KEYS = ['downside', 'base', 'upside'] as const;

type QuarterKey = typeof QUARTERS[number];
type ScenarioKey = typeof SCENARIO_KEYS[number];

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function rowsToPoints(rows: unknown[], labelKey: 'month' | 'quarter'): FinancialPoint[] {
  return rows.map((row: any) => ({
    label: String(row?.[labelKey] ?? ''),
    revenueK: toNumber(row?.revenueK),
    ebitdaK: toNumber(row?.ebitdaK),
    cashEopK: toNumber(row?.cashEopK),
  }));
}

export function normalizeFinancialSeries(fm: any): { monthly: FinancialPoint[]; quarterly: FinancialPoint[]; series: FinancialPoint[] } {
  const monthly = Array.isArray(fm?.y1Monthly) ? rowsToPoints(fm.y1Monthly, 'month') : [];
  const quarterly = Array.isArray(fm?.y2y3Quarterly) ? rowsToPoints(fm.y2y3Quarterly, 'quarter') : [];
  return { monthly, quarterly, series: [...monthly, ...quarterly] };
}

export function niceTicks(min: number, max: number, count = 4): number[] {
  if (max <= min) return [0];
  const raw = (max - min) / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * pow;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(v);
  return ticks;
}

export function normalizeUseOfFunds(fm: any): { buckets: UseOfFundsBucket[]; totalPct: number } {
  const buckets: UseOfFundsBucket[] = Array.isArray(fm?.fundingAsk?.useOfFunds)
    ? fm.fundingAsk.useOfFunds.map((bucket: any) => ({
        bucket: String(bucket?.bucket ?? ''),
        pct: toNumber(bucket?.percentage),
        usd: toNumber(bucket?.amountUsd),
      }))
    : [];
  const totalPct = buckets.reduce((sum, bucket) => sum + bucket.pct, 0) || 100;
  return { buckets, totalPct };
}

export function fillForwardHeadcount(row: Record<string, unknown>): number[] {
  const out: number[] = [];
  let last = 0;
  for (const key of QUARTERS) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') {
      last = toNumber(value);
    }
    out.push(last);
  }
  return out;
}

export function normalizeHeadcount(fm: any): { roles: HeadcountRole[]; quartersWithData: HeadcountQuarter[]; maxTotal: number } {
  const roles: HeadcountRole[] = Array.isArray(fm?.headcount)
    ? fm.headcount.map((row: any) => ({
        role: String(row?.role ?? ''),
        values: fillForwardHeadcount(row ?? {}),
      }))
    : [];

  const quartersWithData = QUARTERS
    .map((q, i) => ({ i, q, total: roles.reduce((sum, role) => sum + (role.values[i] ?? 0), 0) }))
    .filter((quarter) => quarter.total > 0 || roles.some((role) => role.values[quarter.i] !== undefined));

  return {
    roles,
    quartersWithData,
    maxTotal: quartersWithData.reduce((max, quarter) => Math.max(max, quarter.total), 0) || 1,
  };
}

export function normalizeSensitivity(fm: any, lang: Lang = 'en'): { rows: SensitivityRow[]; maxAbs: number } {
  const rows: SensitivityRow[] = Array.isArray(fm?.sensitivity)
    ? fm.sensitivity
        .map((row: any) => ({
          variable: localizeFinancialVariable(row?.variable, lang),
          cashImpactK: toNumber(row?.cashImpactK),
          revImpactK: toNumber(row?.y3RevenueImpactK),
          downside: localizeFinancialText(row?.downsideCase, lang),
          upside: localizeFinancialText(row?.upsideCase, lang),
        }))
        .sort((a: SensitivityRow, b: SensitivityRow) => Math.abs(b.cashImpactK) - Math.abs(a.cashImpactK))
    : [];
  return {
    rows,
    maxAbs: rows.reduce((max, row) => Math.max(max, Math.abs(row.cashImpactK), Math.abs(row.revImpactK)), 0) || 1,
  };
}

export function normalizeScenarios(fm: any, lang: Lang = 'en'): { rows: ScenarioRow[]; maxRev: number; maxAbsCash: number; maxAbsEbitda: number } {
  const rows = SCENARIO_KEYS.map((key) => {
    const scenario = fm?.scenarios?.[key] ?? {};
    return {
      key,
      label: scenarioLabel(key, lang),
      desc: String(scenario?.description ?? ''),
      revK: toNumber(scenario?.y3RevenueK),
      ebitdaK: toNumber(scenario?.y3EbitdaK),
      cashLowK: toNumber(scenario?.cashLowPointK),
    };
  });

  return {
    rows,
    maxRev: rows.reduce((max, row) => Math.max(max, row.revK), 0) || 1,
    maxAbsCash: rows.reduce((max, row) => Math.max(max, Math.abs(row.cashLowK)), 0) || 1,
    maxAbsEbitda: rows.reduce((max, row) => Math.max(max, Math.abs(row.ebitdaK)), 0) || 1,
  };
}
