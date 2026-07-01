import { colors } from './colors';

export function getWineAccent(type: string): string {
  switch (type) {
    case 'rosso': return colors.accentRed;
    case 'bianco': return colors.accentYellow;
    case 'rosè': return colors.accentRose;
    default: return colors.textPrimary;
  }
}

export function getWineSoftBg(type: string): string {
  switch (type) {
    case 'rosso': return '#FBECEE';
    case 'bianco': return '#FEF7E8';
    case 'rosè': return '#FDF0F3';
    default: return colors.surfaceSoft;
  }
}
