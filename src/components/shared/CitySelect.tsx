/**
 * CitySelect – a styled <select> populated from the canonical CITIES constant.
 * Used in every form that asks for a city to ensure consistent UX and eliminate
 * free-text typos.
 */
import { CITIES } from "@/lib/constants";

const inputClass =
  "mt-1 w-full rounded-xl border border-outline bg-white px-3 py-2.5 text-xs font-medium text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

interface CitySelectProps {
  value: string;
  onChange: (city: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export function CitySelect({
  value,
  onChange,
  required = false,
  className = "",
  placeholder = "Select a city",
}: CitySelectProps) {
  return (
    <select
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} ${className}`}
    >
      <option value="">{placeholder}</option>
      {CITIES.map((city) => (
        <option key={city} value={city}>
          {city}
        </option>
      ))}
    </select>
  );
}
