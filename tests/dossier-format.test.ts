import { describe, expect, it } from 'vitest';
import {
  formatMoneyK,
  formatSignedMoneyK,
  localizeFinancialText,
  localizeFinancialVariable,
  scenarioLabel,
  uiLabel,
} from '../website/src/lib/dossier-format';

describe('dossier-format', () => {
  it('formats K and M values consistently', () => {
    expect(formatMoneyK(999)).toBe('$999K');
    expect(formatMoneyK(1500)).toBe('$1.50M');
    expect(formatMoneyK(-2500)).toBe('$-2.50M');
    expect(formatSignedMoneyK(-2500)).toBe('-$2.50M');
  });

  it('localizes UI and scenario labels with fallback', () => {
    expect(uiLabel('Funding ask', 'zh')).toBe('融资需求');
    expect(uiLabel('Unmapped label', 'zh')).toBe('Unmapped label');
    expect(scenarioLabel('downside', 'zh')).toBe('下行');
    expect(scenarioLabel('base', 'en')).toBe('Base');
  });

  it('localizes financial variables and financial text snippets', () => {
    expect(localizeFinancialVariable('gross margin', 'zh')).toBe('毛利率');
    expect(localizeFinancialText('USD per month', 'zh')).toBe('美元/月');
    expect(localizeFinancialText('annualized logos', 'zh')).toBe('年化 客户数');
    expect(localizeFinancialText('USD per month', 'en')).toBe('USD per month');
  });
});
