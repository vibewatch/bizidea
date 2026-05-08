import { describe, expect, it } from 'vitest';
import { linkifyCitations, splitCitationText } from '../website/src/lib/citations';

describe('citations', () => {
  it('splits comma-grouped citation tokens into individual citation parts', () => {
    expect(splitCitationText('Control requirements [20,21, 22].')).toEqual([
      'Control requirements ',
      { id: '20' },
      { id: '21' },
      { id: '22' },
      '.',
    ]);
  });

  it('linkifies grouped citations and preserves HTML escaping', () => {
    expect(linkifyCitations('Use <controls> [20,21].', 'zh')).toBe(
      'Use &lt;controls&gt; <a class="bz-cite" href="#cite-20" aria-label="引用 20">[20]</a><a class="bz-cite" href="#cite-21" aria-label="引用 21">[21]</a>.',
    );
  });
});