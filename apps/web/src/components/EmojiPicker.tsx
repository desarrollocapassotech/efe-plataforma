import { cn } from '@/lib/utils';

/** Emojis frecuentes para finanzas personales. Liviano: sin librería de emojis. */
const EMOJIS = [
  '🏠',
  '🛒',
  '🚗',
  '💡',
  '🏥',
  '🎬',
  '🍷',
  '📚',
  '👕',
  '🎁',
  '🧾',
  '🐾',
  '📦',
  '💼',
  '🧑‍💻',
  '🏘️',
  '🏷️',
  '➕',
  '🍔',
  '☕',
  '🍕',
  '🥦',
  '🍺',
  '🚌',
  '⛽',
  '🚕',
  '✈️',
  '🏖️',
  '📱',
  '💻',
  '📺',
  '🎮',
  '🎵',
  '💊',
  '🦷',
  '💇',
  '👶',
  '🎓',
  '⚽',
  '🏋️',
  '🧹',
  '🔧',
  '🌳',
  '🎉',
  '💳',
  '🏦',
  '💵',
  '📈',
  '💰',
  '🪙',
  '🛍️',
  '❤️',
  '⭐',
  '🔥',
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  return (
    <div role="radiogroup" aria-label="Ícono" className="grid grid-cols-8 gap-1">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          role="radio"
          aria-checked={value === emoji}
          aria-label={emoji}
          onClick={() => onChange(emoji)}
          className={cn(
            'flex aspect-square items-center justify-center rounded-md text-xl transition hover:bg-accent',
            value === emoji && 'bg-primary/10 ring-2 ring-primary',
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
