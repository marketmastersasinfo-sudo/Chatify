export function getCountryFlag(countryName: string): string {
  if (!countryName) return '🌐';
  const name = countryName.toLowerCase();
  if (name.includes('colombia')) return '🇨🇴';
  if (name.includes('méxico') || name.includes('mexico')) return '🇲🇽';
  if (name.includes('perú') || name.includes('peru')) return '🇵🇪';
  if (name.includes('chile')) return '🇨🇱';
  if (name.includes('ecuador')) return '🇪🇨';
  if (name.includes('argentina')) return '🇦🇷';
  if (name.includes('venezuela')) return '🇻🇪';
  if (name.includes('costa rica')) return '🇨🇷';
  if (name.includes('guatemala')) return '🇬🇹';
  if (name.includes('españa') || name.includes('spain')) return '🇪🇸';
  if (name.includes('estados unidos') || name.includes('usa')) return '🇺🇸';
  return '🌐';
}
