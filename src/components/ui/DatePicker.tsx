import { useEffect, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'react-day-picker/locale'
import { Icon } from './Icon'

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  mode?: 'date' | 'month'
  ariaLabel: string
  disabled?: boolean
}

const firstAvailableMonth = new Date(1900, 0, 1)
const lastAvailableMonth = new Date(2100, 11, 1)

function parseLocalDate(value: string, mode: 'date' | 'month') {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, mode === 'month' ? 1 : day)
}

function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatSelectedDate(date: Date, mode: 'date' | 'month') {
  const formatted = new Intl.DateTimeFormat('pt-BR', mode === 'month'
    ? { month: 'long', year: 'numeric' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)

  return mode === 'month' ? formatted.charAt(0).toLocaleUpperCase('pt-BR') + formatted.slice(1) : formatted
}

export function DatePicker({ value, onChange, mode = 'date', ariaLabel, disabled = false }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => parseLocalDate(value, mode))
  const pickerRef = useRef<HTMLDivElement>(null)
  const selectedDate = parseLocalDate(value, mode)

  useEffect(() => {
    if (!isOpen) return

    function handleOutsideClick(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  function handleSelect(date: Date | undefined) {
    if (!date) return
    onChange(mode === 'month' ? toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1)).slice(0, 7) : toIsoDate(date))
    setIsOpen(false)
  }

  return (
    <div className={`date-picker${mode === 'month' ? ' date-picker-month' : ''}`} ref={pickerRef}>
      <button
        type="button"
        className="date-picker-trigger"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => {
          if (!isOpen) setVisibleMonth(parseLocalDate(value, mode))
          setIsOpen(!isOpen)
        }}
      >
        <Icon name="calendar" size={15} />
        <span>{formatSelectedDate(selectedDate, mode)}</span>
        <Icon name="chevron" size={13} />
      </button>
      {isOpen && (
        <div className="date-picker-popover" role="dialog" aria-label={`Selecionar ${mode === 'month' ? 'mês' : 'data'}`}>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            month={visibleMonth}
            onMonthChange={setVisibleMonth}
            captionLayout="dropdown"
            navLayout="around"
            startMonth={firstAvailableMonth}
            endMonth={lastAvailableMonth}
            reverseYears
            locale={ptBR}
            showOutsideDays
            fixedWeeks
          />
        </div>
      )}
    </div>
  )
}
