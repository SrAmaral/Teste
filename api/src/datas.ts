/** SQLite `datetime('now')` → ISO 8601 UTC ("2026-10-09 18:28:38" → "2026-10-09T18:28:38Z"), aceito por qualquer navegador. */
export function paraIsoUtc(dataSqlite: string): string {
  return `${dataSqlite.replace(' ', 'T')}Z`;
}
