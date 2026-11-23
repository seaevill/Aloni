import './crop-views-v2.css';

export function MonthRing({ heading, months, recorded, empty }: {
  heading: string;
  months: readonly string[];
  recorded: readonly number[];
  empty: string;
}) {
  const marked = new Set(recorded.filter((month) => Number.isInteger(month) && month >= 1 && month <= 12));
  const recordedText = marked.size > 0 ? months.filter((_month, i) => marked.has(i + 1)).join(' · ') : empty;
  return <section class="cx-month-ring" data-testid="month-ring">
    <h2>{heading}</h2>
    <ol>{months.slice(0, 12).map((month, i) =>
      <li key={month} data-recorded={marked.has(i + 1)}>{month}</li>,
    )}</ol>
    <p>{recordedText}</p>
  </section>;
}
