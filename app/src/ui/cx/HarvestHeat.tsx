import { useId } from 'preact/hooks';
import './crop-views-v2.css';

export interface HarvestHeatCell {
  readonly week: string;
  readonly crates?: number;
  readonly excluded?: boolean;
}
export interface HarvestHeatRow {
  readonly parcel: string;
  readonly cells: readonly HarvestHeatCell[];
}

export function HarvestHeat({ heading, weeks, rows, unknown, empty, onOpen }: {
  heading: string;
  weeks: readonly string[];
  rows: readonly HarvestHeatRow[];
  unknown: string;
  empty: string;
  onOpen?: (parcel: string, week: string) => void;
}) {
  const captionId = useId();
  const highest = Math.max(1, ...rows.flatMap((row) => row.cells.flatMap((cell) => cell.crates !== undefined && !cell.excluded ? [cell.crates] : [])));
  return <section class="cx-crop-heat" data-testid="harvest-heat" tabIndex={0} aria-labelledby={captionId}>
    <table>
      <caption id={captionId}>{heading}</caption>
      <thead><tr><th scope="col">{empty}</th>{weeks.map((week) => <th key={week} scope="col">{week}</th>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row.parcel}>
        <th scope="row">{row.parcel}</th>
        {weeks.map((week) => <HeatCell key={week} parcel={row.parcel} week={week} cell={row.cells.find((cell) => cell.week === week)}
          highest={highest} unknown={unknown} onOpen={onOpen} />)}
      </tr>)}</tbody>
    </table>
  </section>;
}


function HeatCell({ parcel, week, cell, highest, unknown, onOpen }: {
  parcel: string;
  week: string;
  cell?: HarvestHeatCell;
  highest: number;
  unknown: string;
  onOpen?: (parcel: string, week: string) => void;
}) {
  const value = cell?.crates;
  const mark = cell?.excluded ? unknown : value === undefined ? '–' : value;
  const fill = value === undefined || cell?.excluded ? undefined : value > highest * .75 ? 'deep' :
    value > highest * .5 ? 'forest' : value > highest * .25 ? 'lime' : 'sage';
  return <td data-level={fill} data-excluded={cell?.excluded}>
    {cell && onOpen ? <button type="button" onClick={() => onOpen(parcel, week)}>{mark}</button> : <span>{mark}</span>}
  </td>;
}
