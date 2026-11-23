import type { ComponentChildren } from 'preact';
import './crop-views-v2.css';

/** Its caller passes the reviewed Z2 record returned by cropContent(). */
export function TipsCard({ heading, banner, content, children }: {
  heading: string;
  banner: string;
  content: { readonly tips: string; readonly strength: string; readonly weakness: string; readonly problems: readonly string[] };
  children?: ComponentChildren;
}) {
  return <section class="cx-tips-card" data-testid="tips-card">
    <h2>{heading}</h2>
    <p>{banner}</p>
    <p>{content.tips}</p>
    <ul><li>{content.strength}</li><li>{content.weakness}</li>
      {content.problems.map((value) => <li key={value}>{value}</li>)}
    </ul>
    {children}
  </section>;
}
