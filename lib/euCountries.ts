// EU member states, used to identify "import from EU" in trade_data rows
// (which store individual country names, not an "EU" aggregate).
export const EU_COUNTRIES = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic", "Czechia",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
  "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands",
  "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden",
];

export function isEuCountry(name: string): boolean {
  return EU_COUNTRIES.some((c) => c.toLowerCase() === name.trim().toLowerCase());
}
