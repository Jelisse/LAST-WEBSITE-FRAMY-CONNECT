import { MessageCircle, MapPin, ShoppingBag, Inbox, Languages, ChartNoAxesCombined, Users, Globe, Link2, FileText, UserRound, Mail, Palette, Share2, ContactRound, RefreshCw, CreditCard, Settings, Package, Paintbrush, Receipt, Check } from 'lucide-react';
import type { FeatureKey } from '@/lib/plan-features';
export const featureIcons = { whatsapp: MessageCircle, location: MapPin, showcase: ShoppingBag, enquiries: Inbox, english: Languages, analytics: ChartNoAxesCombined, teams: Users, domain: Globe };
export function PlanFeatureIcon({ feature }: { feature: FeatureKey }) {
  const Icon = featureIcons[feature];
  return <Icon size={18} aria-hidden="true" />;
}
export const basePlanIcons = [Link2, FileText, UserRound, Mail, Palette, Globe, Share2, ContactRound, RefreshCw, CreditCard];
export const corporatePlanIcons = [Users, Settings, Package, Paintbrush, Receipt];
export function BasePlanIcon({ index, corporate = false }: { index: number; corporate?: boolean }) {
  const Icon = (corporate ? corporatePlanIcons : basePlanIcons)[index] ?? Check;
  return <Icon size={18} aria-hidden="true" />;
}
