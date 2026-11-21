import { BigNum } from '../ds';
import { Icon } from '../icons/Icon';
import { SourceLine } from './SourceLine';
import { UNKNOWN_REASONS, UnknownWhy } from './UnknownWhy';
import './source-v2.css';

type NumberSource =
  | { value: string; count?: number; last?: string }
  | { value?: undefined; reason: keyof typeof UNKNOWN_REASONS };

export function TapNum({ caption, unit, source, onOpen }: {
  caption: string;
  unit?: string;
  source: NumberSource;
  onOpen: () => void;
}) {
  return <button type="button" class="cx-tapnum" data-testid="tap-number" onClick={onOpen}>
    <span class="cx-tapnum-body">
      <BigNum value={source.value} unit={unit} caption={caption} size="small" />
      {source.value === undefined ? <UnknownWhy reason={source.reason} /> : <SourceLine count={source.count} last={source.last} />}
    </span>
    <Icon name="chevron" />
  </button>;
}
