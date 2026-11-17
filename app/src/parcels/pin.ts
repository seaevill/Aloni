import { known, unknown, type Known } from '@aloni/rules-core';
import type { Pin } from './parcel';

/** One GPS reading for the parcel's pin. Only while the farmer taps the button: never tracking. Denied or no signal = unknown, the form still works. */
export function readPin(geo: Pick<Geolocation, 'getCurrentPosition'> | undefined = navigator.geolocation): Promise<Known<Pin>> {
  return new Promise((resolve) => {
    if (!geo) { resolve(unknown('missing')); return; }
    geo.getCurrentPosition(
      (p) => resolve(known({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy_m: p.coords.accuracy })),
      () => resolve(unknown('missing')),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}
