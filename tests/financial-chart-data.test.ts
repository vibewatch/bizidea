import { describe, expect, it } from 'vitest';
import {
  fillForwardHeadcount,
  niceTicks,
  normalizeFinancialSeries,
  normalizeHeadcount,
  normalizeScenarios,
  normalizeSensitivity,
  normalizeUseOfFunds,
} from '../website/src/lib/financial-chart-data';
import { financialModelFixture } from './fixtures/stage-files';

describe('financial-chart-data', () => {
  it('stitches monthly and quarterly series without losing labels', () => {
    const { monthly, quarterly, series } = normalizeFinancialSeries(financialModelFixture);
    expect(monthly.map((point) => point.label)).toEqual(['M1', 'M2']);
    expect(quarterly.map((point) => point.label)).toEqual(['Q1Y2', 'Q2Y2']);
    expect(series).toHaveLength(4);
  });

  it('generates stable nice ticks', () => {
    expect(niceTicks(0, 100, 4)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceTicks(5, 5)).toEqual([0]);
  });

  it('forward-fills sparse headcount snapshots', () => {
    expect(fillForwardHeadcount({ q1y1: 2, q4y1: 5, q2y2: 7 }).slice(0, 6)).toEqual([2, 2, 2, 5, 5, 7]);
    const { roles, maxTotal } = normalizeHeadcount(financialModelFixture);
    expect(roles[0]?.values.slice(0, 6)).toEqual([2, 2, 2, 5, 5, 7]);
    expect(maxTotal).toBe(10);
  });

  it('normalizes funds, sensitivity, and scenarios for rendering', () => {
    expect(normalizeUseOfFunds(financialModelFixture).totalPct).toBe(100);

    const sensitivity = normalizeSensitivity(financialModelFixture, 'zh');
    expect(sensitivity.rows[0]?.variable).toBe('毛利率');
    expect(sensitivity.rows[1]?.downside).toBe('美元/月');
    expect(sensitivity.maxAbs).toBe(300);

    const scenarios = normalizeScenarios(financialModelFixture, 'zh');
    expect(scenarios.rows.map((row) => row.label)).toEqual(['下行', '基准', '上行']);
    expect(scenarios.maxRev).toBe(4200);
    expect(scenarios.maxAbsEbitda).toBe(900);
  });
});
