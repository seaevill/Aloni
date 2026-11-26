// DEMO SEASON (queue item 31): seven FICTIONAL parcels on the Megara plain, hand-drawn general field shapes — NOT copied from any cadastre, NOT real plots.
// The typed area (στρέμματα) is the authority; each outline was scaled to that area (the unit test checks the drawn area is within 3 %). The ΚΑΕΚ numbers are FICTIONAL: 12 digits, all start with «99» so they can never equal a real one; the screen labels them «Επίδειξη».
// Coordinates are [longitude, latitude]. Nothing here is ever written to a real farm: the loader of the Demo season writes with the Demo farm id only.
export interface SeasonParcel { id: string; name: string; locality: string; area_str: string; lat: number; lng: number; kaek: string; boundary: { type: 'Polygon'; coordinates: number[][][] } }

export const SEASON_PARCELS: readonly SeasonParcel[] = [
  { id: 'S1', name: "Μεγάλος Κάμπος", locality: 'Πεδιάδα Μεγάρων (φανταστικό χωράφι)', area_str: '25', lat: 37.98587, lng: 23.31879, kaek: '990100001301',
    boundary: { type: 'Polygon', coordinates: [[[23.318, 37.985], [23.319822, 37.985262], [23.319856, 37.986126], [23.319185, 37.98654], [23.318109, 37.986495], [23.317748, 37.985787], [23.318, 37.985]]] } },
  { id: 'S2', name: "Λάκκα", locality: 'Πεδιάδα Μεγάρων (φανταστικό χωράφι)', area_str: '12', lat: 37.99632, lng: 23.33706, kaek: '990200002004',
    boundary: { type: 'Polygon', coordinates: [[[23.336, 37.996], [23.338121, 37.995964], [23.337853, 37.996618], [23.336267, 37.99668], [23.336, 37.996]]] } },
  { id: 'S3', name: "Πευκάκια", locality: 'Πεδιάδα Μεγάρων (φανταστικό χωράφι)', area_str: '10.5', lat: 38.0046, lng: 23.34943, kaek: '990300002707',
    boundary: { type: 'Polygon', coordinates: [[[23.349, 38.004], [23.350152, 38.004267], [23.3501, 38.004826], [23.349632, 38.005057], [23.348943, 38.004969], [23.348771, 38.004494], [23.349, 38.004]]] } },
  { id: 'S4', name: "Ανατολικό", locality: 'Πεδιάδα Μεγάρων (φανταστικό χωράφι)', area_str: '9', lat: 37.9913, lng: 23.36267, kaek: '990400003410',
    boundary: { type: 'Polygon', coordinates: [[[23.362, 37.991], [23.363096, 37.990796], [23.363338, 37.991316], [23.362872, 37.991783], [23.362069, 37.991594], [23.362, 37.991]]] } },
  { id: 'S5', name: "Κοντά στο Ρέμα", locality: 'Πεδιάδα Μεγάρων (φανταστικό χωράφι)', area_str: '7', lat: 38.01239, lng: 23.32965, kaek: '990500004113',
    boundary: { type: 'Polygon', coordinates: [[[23.329, 38.012], [23.330174, 38.012082], [23.330161, 38.012738], [23.329272, 38.012751], [23.329, 38.012]]] } },
  { id: 'S6', name: "Ράχη", locality: 'Πεδιάδα Μεγάρων (φανταστικό χωράφι)', area_str: '4', lat: 38.00638, lng: 23.37245, kaek: '990600004816',
    boundary: { type: 'Polygon', coordinates: [[[23.372, 38.006], [23.373112, 38.006407], [23.372764, 38.006693], [23.371922, 38.006407], [23.372, 38.006]]] } },
  { id: 'S7', name: "Μικρό Περιβόλι", locality: 'Πεδιάδα Μεγάρων (φανταστικό χωράφι)', area_str: '2.5', lat: 37.98118, lng: 23.34543, kaek: '990700005519',
    boundary: { type: 'Polygon', coordinates: [[[23.345, 37.981], [23.345703, 37.980961], [23.345772, 37.981349], [23.345249, 37.981423], [23.345, 37.981]]] } },
];
