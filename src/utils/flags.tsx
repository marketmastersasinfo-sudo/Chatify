export function getCountryCode(countryName: string): string {
  if (!countryName) return 'un';
  const name = countryName.toLowerCase().trim();
  if (name.includes('colombia') || name === 'co') return 'co';
  if (name.includes('méxico') || name.includes('mexico') || name === 'mx') return 'mx';
  if (name.includes('perú') || name.includes('peru') || name === 'pe') return 'pe';
  if (name.includes('chile') || name === 'cl') return 'cl';
  if (name.includes('ecuador') || name === 'ec') return 'ec';
  if (name.includes('argentina') || name === 'ar') return 'ar';
  if (name.includes('venezuela') || name === 've') return 've';
  if (name.includes('costa rica') || name === 'cr') return 'cr';
  if (name.includes('guatemala') || name === 'gt') return 'gt';
  if (name.includes('españa') || name.includes('spain') || name === 'es') return 'es';
  if (name.includes('estados unidos') || name.includes('usa') || name === 'us') return 'us';
  return 'un';
}

export function CountryFlag({ country, className = "w-5 h-auto" }: { country: string, className?: string }) {
  const code = getCountryCode(country);
  if (code === 'un') return <span className="text-sm">🌐</span>;
  return (
    <img 
      src={`https://flagcdn.com/w20/${code}.png`} 
      srcSet={`https://flagcdn.com/w40/${code}.png 2x`}
      alt={country}
      className={`inline-block rounded-sm shadow-sm ${className}`}
    />
  );
}
