/**
 * EPPO codes (EPPO Global Database) for the crops of the catalog, checked by the team on gd.eppo.int (2026-11-19). A crop without a code stays EMPTY and the export warns «fill in»:
 * a wrong code in a legal record is worse than none. Every code has its source page: https://gd.eppo.int/taxon/<CODE> (see `eppoUrl`); a test locks the list.
 */
export const EPPO_CODES: Readonly<Record<string, string>> = {
  spinach: 'SPQOL',     // Spinacia oleracea
  endive: 'CICEN',      // Cichorium endivia
  coriander: 'CORSA',   // Coriandrum sativum
  onion: 'ALLCE',       // Allium cepa (spring onion)
  leek: 'ALLPO',        // Allium ampeloprasum var. porrum
  cabbage: 'BRSOL',     // Brassica oleracea (var. capitata)
  dill: 'AFEGR',        // Anethum graveolens   (corrected from ANGGR)
  parsley: 'PARCR',     // Petroselinum crispum (corrected from PYWCR)
  rocket: 'ERUVE',      // Eruca vesicaria      (corrected from ERUSA)
  radish: 'RAPSR',      // Raphanus sativus     (corrected from RAPSN)
  chicory: 'CICIN',     // Cichorium intybus (wild chicory)
  chard: 'BEAVV',       // Beta vulgaris var. vulgaris (σέσκουλα)
  beet: 'BEAVD',        // Beta vulgaris var. conditiva (παντζάρια)
  kaukalithra: 'TORAP', // Torilis arvensis / related (Καυκαλήθρα)
  // left EMPTY on purpose (the team found no safe code): celery (σέλινο, leaves), myroni (μυρώνι), vlita (βλήτα)
};

/** The page that proves a code. */
export const eppoUrl = (code: string): string => `https://gd.eppo.int/taxon/${code}`;
