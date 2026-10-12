import * as Select from '@radix-ui/react-select';
import { Icon } from './Icon';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  value?: string;
  defaultValue?: string;
  options: SelectOption[];
  onValueChange?: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  className?: string;
};

const emptyOptionValue = '__select-field-empty__';

export function SelectField({
  value,
  defaultValue,
  options,
  onValueChange,
  ariaLabel,
  placeholder,
  disabled = false,
  name,
  required = false,
  className = '',
}: Props) {
  return (
    <Select.Root
      value={value === undefined ? undefined : value || emptyOptionValue}
      defaultValue={defaultValue === undefined ? undefined : defaultValue || emptyOptionValue}
      onValueChange={(selected) => onValueChange?.(selected === emptyOptionValue ? '' : selected)}
      disabled={disabled}
      name={name}
      required={required}
    >
      <Select.Trigger className={`select-field-trigger ${className}`} aria-label={ariaLabel}>
        <Select.Value placeholder={placeholder} />
        <Select.Icon asChild><Icon name="chevron" size={14} /></Select.Icon>
      </Select.Trigger>
      <Select.Portal container={document.querySelector<HTMLElement>('.app-root') ?? undefined}>
        <Select.Content className="select-field-content" position="popper" sideOffset={5}>
          <Select.Viewport className="select-field-viewport">
            {options.map((option) => (
              <Select.Item
                className="select-field-item"
                key={option.value || emptyOptionValue}
                value={option.value || emptyOptionValue}
                disabled={option.disabled}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator><Icon name="check" size={14} /></Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
