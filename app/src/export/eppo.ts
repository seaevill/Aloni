/**
 * EPPO codes (EPPO Global Database) for the crops of the catalog. ONLY the ones I am sure of are listed; every other crop stays EMPTY and the export warns «fill in». A wrong code in a legal record is worse than none.
 * (The EPPO site could not be reached from the build environment, so these come from knowledge, not from a lookup: Bora or the agronomist should check them once against gd.eppo.int.)
 */
export const EPPO_CODES: Readonly<Record<string, string>> = {
  spinach: 'SPQOL',    // Spinacia oleracea
  rocket: 'ERUSA',     // Eruca vesicaria subsp. sativa
  parsley: 'PYWCR',    // Petroselinum crispum
  dill: 'ANGGR',       // Anethum graveolens
  coriander: 'CORSA',  // Coriandrum sativum
  endive: 'CICEN',     // Cichorium endivia
  onion: 'ALLCE',      // Allium cepa (spring onion)
  leek: 'ALLPO',       // Allium ampeloprasum var. porrum
  cabbage: 'BRSOL',    // Brassica oleracea
  radish: 'RAPSN',     // Raphanus sativus
  celery: 'APUGR',     // Apium graveolens
  // left empty on purpose (not sure): chicory (wild), chard, beet, vlita, kaukalithra, myroni
};
