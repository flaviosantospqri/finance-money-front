import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

type Props = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
};

const monthNames = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2020, month, 1)),
);
const monthShortNames = monthNames.map((name) => name.slice(0, 3));
const toPeriod = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;
const parsePeriod = (value: string) => {
  const [year, month] = value.split('-').map(Number);
  return { year, month: month - 1 };
};
const shiftPeriod = (value: string, amount: number) => {
  const { year, month } = parsePeriod(value);
  const shifted = new Date(year, month + amount, 1);
  return toPeriod(shifted.getFullYear(), shifted.getMonth());
};

export function MonthNavigator({ value, onChange, ariaLabel, min, max, disabled = false, className = '' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => parsePeriod(value).year);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = parsePeriod(value);
  const minimum = min ? parsePeriod(min) : null;
  const maximum = max ? parsePeriod(max) : null;
  const previousPeriod = shiftPeriod(value, -1);
  const nextPeriod = shiftPeriod(value, 1);
  const canGoPrevious = !minimum || previousPeriod >= `${minimum.year}-${String(minimum.month + 1).padStart(2, '0')}`;
  const canGoNext = !maximum || nextPeriod <= `${maximum.year}-${String(maximum.month + 1).padStart(2, '0')}`;
  const label = `${monthNames[current.month].charAt(0).toLocaleUpperCase('pt-BR')}${monthNames[current.month].slice(1)} ${current.year}`;

  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  function chooseMonth(month: number) {
    const period = toPeriod(pickerYear, month);
    if ((!min || period >= min) && (!max || period <= max)) {
      onChange(period);
      setIsOpen(false);
    }
  }

  return (
    <div className={`month-navigator ${className}`} ref={rootRef}>
      <button type="button" className="month-navigator-arrow" aria-label="Mês anterior" disabled={disabled || !canGoPrevious} onClick={() => onChange(previousPeriod)}>
        <Icon name="chevron-left" size={16} />
      </button>
      <button type="button" className="month-navigator-label" aria-label={ariaLabel} aria-haspopup="dialog" aria-expanded={isOpen} disabled={disabled} onClick={() => { setPickerYear(current.year); setIsOpen((open) => !open); }}>
        <Icon name="calendar" size={15} />
        <span>{label}</span>
        <Icon name="chevron" size={13} />
      </button>
      <button type="button" className="month-navigator-arrow" aria-label="Próximo mês" disabled={disabled || !canGoNext} onClick={() => onChange(nextPeriod)}>
        <Icon name="chevron-right" size={16} />
      </button>
      {isOpen && (
        <div className="month-navigator-popover" role="dialog" aria-label="Selecionar mês e ano">
          <header>
            <button type="button" className="month-navigator-arrow" aria-label="Ano anterior" disabled={pickerYear <= 1900} onClick={() => setPickerYear((year) => year - 1)}><Icon name="chevron-left" size={15} /></button>
            <strong>{pickerYear}</strong>
            <button type="button" className="month-navigator-arrow" aria-label="Próximo ano" disabled={pickerYear >= 2100} onClick={() => setPickerYear((year) => year + 1)}><Icon name="chevron-right" size={15} /></button>
          </header>
          <div className="month-navigator-grid">
            {monthNames.map((name, month) => {
              const period = toPeriod(pickerYear, month);
              const selected = period === value;
              const unavailable = (min && period < min) || (max && period > max);
              return <button key={name} type="button" className={selected ? 'selected' : ''} aria-label={`${name} ${pickerYear}`} aria-pressed={selected} disabled={Boolean(unavailable)} onClick={() => chooseMonth(month)}>{monthShortNames[month]}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
