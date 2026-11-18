import { db } from '../db';
import { putLocal } from '../repo';
import { session, type Session } from './gotrue';

const KEY = 'auth_session';
/** Keeps the session on THIS phone only (device-local setting, never queued for the server). */
export async function saveSession(s: Session | undefined): Promise<void> { session.value = s; await putLocal(db, KEY, s ?? null); }
export async function loadSession(): Promise<Session | undefined> { return ((await db.settings.get(KEY))?.value as Session | null | undefined) ?? undefined; }
