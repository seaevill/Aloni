import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Icon, type IconName } from '../icons/Icon';

// Surfaces (design sprint §1.1–1.2, D3). Two elevations only: the sage page and the white Card. Rows inside a card are FLAT (a hairline divider, 56 px minimum height). Cards never nest.

/** The white card: 22 px corners, one shadow, 16 px padding. Never put a Card inside a Card (the gallery e2e looks for `.ds-card .ds-card`). */
export function Card({ children, testid }: { children: ComponentChildren; testid?: string }) {
  return <div class="ds-card" data-testid={testid}>{children}</div>;
}

/** The ONLY forest surface below the header, at most one per screen: white text, an optional lime pill (a label, never a status). */
export function HeroCard({ pill, heading, children }: { pill?: string; heading: string; children?: ComponentChildren }) {
  return (
    <section class="ds-hero" data-testid="ds-hero">
      {pill !== undefined && <span class="ds-hero-pill">{pill}</span>}
      <h2 class="ds-hero-title">{heading}</h2>
      {children}
    </section>
  );
}

/** A flat row: icon slot · title · meta · trailing (a Chip, a number or the chevron). A row that goes somewhere is a button and says so with the chevron. */
export function ListRow({ icon, heading, meta, trailing, onClick, testid }: { icon?: ComponentChildren; heading: string; meta?: string; trailing?: ComponentChildren; onClick?: () => void; testid?: string }) {
  const body = (
    <>
      {icon !== undefined && <span class="ds-row-icon">{icon}</span>}
      <span class="ds-row-text"><span class="ds-row-title">{heading}</span>{meta !== undefined && <span class="ds-row-meta">{meta}</span>}</span>
      {trailing !== undefined && <span class="ds-row-trailing">{trailing}</span>}
      {onClick !== undefined && <span class="ds-row-chevron"><Icon name="chevron" /></span>}
    </>
  );
  return onClick === undefined
    ? <div class="ds-row" data-testid={testid}>{body}</div>
    : <button type="button" class="ds-row" data-testid={testid} onClick={onClick}>{body}</button>;
}

/** A 56 px lime-soft tile with one icon (menus, empty rows). Decorative: the word is always beside it. */
export function IconTile({ name }: { name: IconName }) {
  return <span class="ds-tile"><Icon name={name} /></span>;
}

/** Page title on the sage page (30/800), an optional subtitle and a back row. After the page scrolls 8 px a glass bar with the small title appears (never on top of the big one). */
export function PageHead({ heading, subtitle, back, backText }: { heading: string; subtitle?: string; back?: () => void; backText?: string }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY >= 8);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header class="ds-head">
      <div class="ds-topbar" data-shown={scrolled ? 'yes' : 'no'} aria-hidden={scrolled ? undefined : 'true'} data-testid="ds-topbar"><span>{heading}</span></div>
      {back !== undefined && <button type="button" class="ds-back" onClick={back}><Icon name="back" /><span>{backText}</span></button>}
      <h1 class="ds-title">{heading}</h1>
      {subtitle !== undefined && <p class="ds-subtitle">{subtitle}</p>}
    </header>
  );
}

/** A section heading inside a screen (22/800), optionally with a short note. */
export function SectionHead({ heading, note }: { heading: string; note?: string }) {
  return <div class="ds-section"><h2>{heading}</h2>{note !== undefined && <p>{note}</p>}</div>;
}
