import { useEffect, useState } from 'preact/hooks';
import { DEMO_FARM_ID } from '../config';
import { activeFarm, db } from '../db';
import { DEMO_PHOTOS, sourceLine } from '../db/demo-season/photos';
import { t } from '../i18n';

// The ten open-licence photos of the Demo season (docs/content/photo-credits.md), shown on Άλλα → Φωτογραφίες ONLY while the season Demo is the active farm. Lazy: the files are fetched when they scroll into view,
// not at start-up. Each photo carries its source line (author · licence · Wikimedia Commons) and a link to its Commons page.
export function DemoPhotos() {
  const [on, setOn] = useState(false);
  const farm = activeFarm.value;
  useEffect(() => { void db.settings.get(`demo_season:${DEMO_FARM_ID}`).then((r) => setOn(farm === DEMO_FARM_ID && r?.value === true)); }, [farm]);
  if (!on) return null;
  return (
    <section data-testid="demo-photos">
      <h2>{t('ui.demophotos.title')}</h2>
      {DEMO_PHOTOS.map((p) => (
        <figure class="demo-photo" key={p.file} data-testid="demo-photo">
          <img src={`/demo-photos/${p.file}`} alt="" loading="lazy" decoding="async" />
          <figcaption><strong>{p.caption}</strong><small data-testid="demo-photo-source">{sourceLine(p)}</small><a href={p.page} rel="noopener noreferrer" target="_blank">{t('ui.demophotos.link')}</a></figcaption>
        </figure>
      ))}
    </section>
  );
}
