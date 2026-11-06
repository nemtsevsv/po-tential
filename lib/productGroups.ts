// Product Group for a trade row is always taken from the HS Codes settings,
// not from whatever text was stored on the row when it was loaded/imported.
// Renaming or regrouping a code in HS Codes therefore updates every chart.
//
// Matching is by HS-code prefix, longest match wins: a configured 6-digit
// code "900510" covers rows stored as "900510" or as the 8-digit CN
// "90051000"; a configured 4-digit "9005" covers everything under it.

export type HsCodeSetting = { hs_code: string; product_group: string; product: string };

export const OTHER_GROUP = "Other";

function digits(code: string | null | undefined): string {
  return (code ?? "").replace(/\D/g, "");
}

export function buildGroupResolver(hsCodes: HsCodeSetting[]) {
  const sorted = hsCodes
    .map((h) => ({ code: digits(h.hs_code), group: (h.product_group ?? "").trim() || OTHER_GROUP }))
    .filter((h) => h.code.length > 0)
    .sort((a, b) => b.code.length - a.code.length);

  return (rowHsCode: string | null | undefined): string => {
    const code = digits(rowHsCode);
    if (!code) return OTHER_GROUP;
    const match = sorted.find((h) => code.startsWith(h.code) || h.code.startsWith(code));
    return match ? match.group : OTHER_GROUP;
  };
}

// Groups in the order they are configured in HS Codes settings (alphabetical),
// so filters and colors stay stable regardless of which data is loaded.
export function configuredGroups(hsCodes: HsCodeSetting[]): string[] {
  return Array.from(new Set(hsCodes.map((h) => (h.product_group ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

// Valid HS / CN code: 2, 4, 6 or 8 digits.
export function isValidHsCode(code: string): boolean {
  return /^(\d{2}|\d{4}|\d{6}|\d{8})$/.test(code.trim());
}
