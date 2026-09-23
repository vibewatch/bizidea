import { describe, expect, it } from 'vitest';
import {
  financialModelStageSchema,
  reportIndexSchema,
} from '../website/src/lib/stage-schemas';
import { financialModelFixture, reportIndexFixture } from './fixtures/stage-files';

describe('stage schemas', () => {
  it('parses website index fixtures', () => {
    expect(reportIndexSchema.parse(reportIndexFixture).slug).toBe('fixture-ai-workflow');
  });

  it('normalizes Date values in stage files', () => {
    const parsed = financialModelStageSchema.parse(financialModelFixture);
    expect(parsed.date).toBe('2026-05-08');
  });

  it('rejects missing required report index fields', () => {
    expect(() => reportIndexSchema.parse({ ...reportIndexFixture, slug: undefined })).toThrow();
  });
});
