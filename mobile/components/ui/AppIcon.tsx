import React from 'react';
import {
  Wine,
  History,
  Settings,
  Camera,
  Image,
  Scan,
  ArrowLeft,
  Share,
  RefreshCw,
  Check,
  CircleAlert,
  Sparkles,
  Search,
  X,
  Trash2,
  Circle,
  CircleCheck,
  Star,
  UtensilsCrossed,
  ChevronLeft,
  Ellipsis,
  Menu,
  Heart,
  Bookmark,
  ChefHat,
  Grape,
  Plus,
  Pencil,
  DollarSign,
  QrCode,
  Download,
  FileText,
} from 'lucide-react-native';
import { colors, iconSize } from '../../theme';

const iconMap = {
  wine: Wine,
  history: History,
  settings: Settings,
  camera: Camera,
  image: Image,
  scan: Scan,
  back: ArrowLeft,
  share: Share,
  refresh: RefreshCw,
  check: Check,
  alert: CircleAlert,
  sparkle: Sparkles,
  search: Search,
  close: X,
  trash: Trash2,
  circle: Circle,
  'circle-check': CircleCheck,
  star: Star,
  utensils: UtensilsCrossed,
  'chevron-left': ChevronLeft,
  ellipsis: Ellipsis,
  menu: Menu,
  heart: Heart,
  bookmark: Bookmark,
  'chef-hat': ChefHat,
  grape: Grape,
  plus: Plus,
  pencil: Pencil,
  'dollar-sign': DollarSign,
  'qr-code': QrCode,
  download: Download,
  'file-text': FileText,
} as const;

export type IconName = keyof typeof iconMap;

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function AppIcon({
  name,
  size = iconSize.md,
  color = colors.textPrimary,
  strokeWidth = 1.9,
}: AppIconProps) {
  const IconComponent = iconMap[name];
  if (!IconComponent) return null;
  return (
    <IconComponent
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
}
