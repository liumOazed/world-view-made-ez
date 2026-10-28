import { flagEmoji, type CountryProfile } from '../data/countries';

export function Flag({ country, size = 'md' }: { country: CountryProfile; size?: 'sm' | 'md' | 'lg' }) {
  const emoji = flagEmoji(country.iso2);
  return (
    <span className={`flag flag-${size}`} aria-hidden="true">
      {emoji ?? country.display.slice(0, 2).toUpperCase()}
    </span>
  );
}
