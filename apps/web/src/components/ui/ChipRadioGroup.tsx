import { RadioGroup } from 'radix-ui';
import { useId, type Ref } from 'react';
import { LABEL_CLASS } from './fieldParts';

type ChipRadioGroupProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  /** Aponta para o grupo; ao receber foco, o Radix o repassa para a opção marcada. */
  ref?: Ref<HTMLDivElement>;
  onBlur?: () => void;
};

export function ChipRadioGroup({ label, options, ref, onBlur, ...props }: ChipRadioGroupProps) {
  const labelId = useId();

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id={labelId} className={LABEL_CLASS}>
        {label}
      </span>
      <RadioGroup.Root
        {...props}
        ref={ref}
        aria-labelledby={labelId}
        onBlur={(event) => {
          // O `blur` também acontece ao passar de um chip para outro: esse não conta.
          if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.();
        }}
        className="flex flex-wrap gap-2"
      >
        {options.map((option) => (
          <RadioGroup.Item
            key={option.value}
            value={option.value}
            className="h-11 min-w-11 cursor-pointer rounded-sm border border-line-strong px-4 text-sm font-semibold text-fg-soft enabled:hover:bg-surface-hover-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-livre data-[state=checked]:bg-livre/12 data-[state=checked]:text-livre"
          >
            {option.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
}
