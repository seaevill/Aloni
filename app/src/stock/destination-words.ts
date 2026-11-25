// Pure words for where a harvest went. The server column (SQL 0036) says 'store' or 'direct' (EMPTY = unknown, never defaulted); the phone's own word for a direct dispatch is 'dispatch'.
export type PhoneDestination = 'store' | 'dispatch';
export const serverDestination = (d: PhoneDestination): 'store' | 'direct' => (d === 'dispatch' ? 'direct' : 'store');
export const isDispatch = (v: unknown): boolean => v === 'dispatch' || v === 'direct';
