/** A calendar day `offset` days from `today` (YYYY-MM-DD, Athens day as given). */
export const dayAt = (today: string, offset: number): string => new Date(Date.parse(`${today}T12:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
