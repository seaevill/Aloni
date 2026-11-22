import type { ComponentType } from 'preact';

// The registry of detail sheets. «Every number and every card opens a sheet that says where it comes from» (docs/plan/bora-feedback-2026-11-21.md §1). A screen registers ONE component per kind
// (`registerSheet('crop', CropSheet)`); the host (App) renders the one whose kind is in the address. The component receives the id and a `close`; it renders a <DetailSheet>.
export interface SheetProps { id: string; close: () => void }
const registry = new Map<string, ComponentType<SheetProps>>();
export function registerSheet(kind: string, component: ComponentType<SheetProps>): void { registry.set(kind, component); }
export const sheetComponent = (kind: string): ComponentType<SheetProps> | undefined => registry.get(kind);

// A sheet whose code is big or rarely opened registers a LOADER instead: the module is fetched the first time its address is opened (it calls `registerSheet` itself), so it is not in the first load.
const loaders = new Map<string, () => Promise<unknown>>();
export function registerLazySheet(kind: string, loader: () => Promise<unknown>): void { loaders.set(kind, loader); }
export const sheetLoader = (kind: string): (() => Promise<unknown>) | undefined => loaders.get(kind);
