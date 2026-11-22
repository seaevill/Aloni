import type { Row } from '../db/schema';
import { formatDateTime, lang, t } from '../i18n';
import { formatQty } from '../i18n/format';
import { NOT_ON_LABEL, signedUseOf } from '../labels/label-use';
import { effectiveSprays } from '../spray/spray';
import { balanceOf } from '../stock/stock';
import el from '../content/product-source/el.json';
import en from '../content/product-source/en.json';
import hi from '../content/product-source/hi.json';
import tr from '../content/product-source/tr.json';
import { Card, Chip, DetailSheet, ListRow, SheetFact } from './ds';
import type { I18nKey } from '../i18n';
import { registerSheet, type SheetProps } from './sheets';
import { nameOf } from './screens';
import { useRows } from './useRows';

const copy = { el, en, hi, tr };
const GENERAL: Readonly<Record<string, I18nKey>> = { fungicide: 'ui.product.general.fungicide', insecticide: 'ui.product.general.insecticide', herbicide: 'ui.product.general.herbicide', fertiliser: 'ui.product.general.fertiliser', other: 'ui.product.general.other' };
const text = (value: unknown): string | undefined => typeof value === 'string' && value.trim() ? value : undefined;
const labelNumber = (value: unknown): string | undefined => value === NOT_ON_LABEL
  ? t('labeluse.notOnLabel')
  : typeof value === 'number' && Number.isFinite(value) ? String(value) : text(value);

export function ProductSheet({ product, onClose }: { product: Row; onClose: () => void }) {
  const labels = useRows('label_uses');
  const crops = useRows('crops');
  const moves = useRows('stock_movements');
  const sprays = useRows('job_spray');
  const words = copy[lang.value];
  const ownRows = (rows: Row[] | null) => (rows ?? []).filter((row) => row.farm_id === product.farm_id && !row.deleted_at);
  const uses = ownRows(labels.rows).filter((row) => row.product_id === product.id);
  const movements = ownRows(moves.rows).filter((row) => row.product_id === product.id);
  const balance = movements.length ? balanceOf(movements) : undefined;
  const unit = text(product.unit);
  const stock = balance !== undefined && unit
    ? [formatQty(balance), unit].join('\u00a0')
    : undefined;
  const type = text(product.type);
  const kind = type !== undefined && Object.hasOwn(GENERAL, type) ? GENERAL[type] : undefined;
  const last = effectiveSprays(ownRows(sprays.rows)).filter((row) => row.product_id === product.id)
    .sort((a, b) => (text(b.sprayed_at) ?? '').localeCompare(text(a.sprayed_at) ?? ''));
  return <DetailSheet heading={nameOf(product)} onClose={onClose} testid="product-source">
    <Card testid="product-purpose">
      <SheetFact name={t('ui.product.purpose')} value={[...new Set(uses.map((u) => text(u.target)).filter((x): x is string => x !== undefined))].join(', ') || undefined} unknown={t('ui.product.purpose.none')} />
    </Card>
    <Card testid="product-general">
      <h4>{t('ui.product.general')}</h4>
      {kind === undefined ? <p>{t('ui.product.general.none')}</p> : <p>{t(kind)}</p>}
      <p class="ds-muted">{t('ui.product.general.note')}</p>
    </Card>
    <Card>
      <SheetFact name={t('product.regNo')} value={text(product.reg_no)} unknown={words.missingLabel} />
      <SheetFact name={words.active} value={text(product.active)} unknown={words.missingLabel} />
      <span data-testid="product-stock"><SheetFact name={t('stock.title')} value={stock} unknown={words.missingStock} /></span>
    </Card>
    <h3>{t('labeluse.title')}</h3>
    {uses.length === 0 && <p>{words.missingLabel}</p>}
    {uses.map((use) => {
      const crop = ownRows(crops.rows).find((row) => row.id === use.crop_id);
      const signed = signedUseOf(use).known;
      return <Card key={use.id}>
        <h4>{crop ? nameOf(crop) : words.missingCrop}</h4>
        <Chip tone={signed ? 'info' : 'unsigned'}>{signed ? words.signed : t('labeluse.status.unsigned')}</Chip>
        <SheetFact name={t('labeluse.target')} value={text(use.target)} unknown={words.missingLabel} />
        <SheetFact name={t('labeluse.phi')} value={labelNumber(use.phi_days)} unknown={words.missingLabel} />
        <SheetFact name={t('labeluse.rei')} value={labelNumber(use.rei_hours)} unknown={words.missingLabel} />
        <SheetFact name={t('labeluse.maxApps')} value={labelNumber(use.max_apps)} unknown={words.missingLabel} />
      </Card>;
    })}
    <div data-testid="product-link"><h4>{t('ui.product.link')}</h4><p>{words.missingRegistry}</p></div>
    <h3>{t('spray.title')}</h3>
    {last.length ? last.map((row) => {
      const at = text(row.sprayed_at);
      return <ListRow key={row.id} heading={at ? formatDateTime(at) : t('value.unknown')} />;
    }) : <p>{t('spray.empty')}</p>}
  </DetailSheet>;
}

function ProductSheetById({ id, close }: SheetProps) {
  const products = useRows('products');
  const product = (products.rows ?? []).find((p) => p.id === id);
  if (!products.rows) return null;
  if (!product) return <DetailSheet heading={t('ui.sheet.notfound.head')} onClose={close} testid="sheet-notfound"><p class="ds-muted">{t('ui.sheet.notfound.body')}</p></DetailSheet>;
  return <ProductSheet product={product} onClose={close} />;
}
registerSheet('product', ProductSheetById);
