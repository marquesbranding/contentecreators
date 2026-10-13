/** Placeholder versions only exist in local fixtures, never in hosted data. */
export function isOfficialLegalVersion(versionLabel: string): boolean {
  return !versionLabel.toUpperCase().includes("PLACEHOLDER");
}
