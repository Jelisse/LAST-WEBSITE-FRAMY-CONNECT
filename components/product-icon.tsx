import {
  CreditCard,
  KeyRound,
  Tag,
  Sticker,
  Watch,
  Badge,
  Utensils,
  Star,
  BookOpen,
} from 'lucide-react';
export function ProductIcon({
  type,
  size = 52,
}: {
  type: string;
  size?: number;
}) {
  const Icon =
    (
      {
        card: CreditCard,
        key: KeyRound,
        tag: Tag,
        sticker: Sticker,
        watch: Watch,
        badge: Badge,
        menu: Utensils,
        star: Star,
        book: BookOpen,
      } as const
    )[type as 'card'] ?? CreditCard;
  return <Icon size={size} strokeWidth={1.2} aria-hidden="true" />;
}
