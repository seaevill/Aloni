import { useId } from 'preact/hooks';
import { recordSearchCopy } from '../../content/record-search';
import { lang } from '../../i18n';
import './record-search-v2.css';

const greek: Readonly<Record<string, string>> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th',
  ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p',
  ρ: 'r', σ: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
};

const folded = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Mark}/gu, '')
  .replace(/ς/g, 'σ').replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim();
const latin = (s: string) => [...s].map((c) => greek[c] ?? c).join('');

export function matchesRecord(query: string, name: string): boolean {
  const needle = folded(query);
  const candidate = folded(name);
  return candidate.includes(needle) || latin(candidate).includes(latin(needle));
}

export function RecordSearch({ query, onQuery, empty }: { query: string; onQuery: (q: string) => void; empty: boolean }) {
  const id = useId();
  const words = recordSearchCopy[lang.value];
  return <div class="record-search">
    <label for={id}>{words.caption}</label>
    <input id={id} type="search" class="input" data-testid="record-search" value={query}
      onInput={(event) => onQuery(event.currentTarget.value)} />
    {empty && <p role="status">{words.empty}</p>}
  </div>;
}
