export type CatalogModel = { id: string; kit: string; name: string; file: string; thumb: string; scale?: number };
export type CatalogKit = { id: string; label: string; scale: number };
export type Catalog = { kits: CatalogKit[]; models: CatalogModel[] };
