import * as LucideIcons from 'lucide-react-native';
import { ComponentProps } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';

/**
 * Mapeo de nombres de SF Symbols a iconos de Lucide (Regla 6 del Style Guide).
 * Lucide ofrece el estilo 'Outline, trazo 2px' que Xpogo requiere.
 */
const MAPPING = {
  'house.fill': 'House',
  'paperplane.fill': 'Send',
  'chevron.left.forwardslash.chevron.right': 'Code2',
  'chevron.right': 'ChevronRight',
} as const;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * Un componente de iconos unificado que utiliza la librería oficial Lucide React Native.
 * Esto asegura consistencia visual y cumple estrictamente con el sistema de diseño Xpogo.
 * Estilo: Outline, trazo 2px (especificado por la Regla 6).
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  const IconComponent = LucideIcons[MAPPING[name]];
  
  if (!IconComponent) {
    console.warn(`Icon ${name} (mapped to ${MAPPING[name]}) not found in LucideIcons`);
    return null;
  }
  
  return (
    <IconComponent 
      color={color} 
      size={size} 
      strokeWidth={2} 
      style={style} 
    />
  );
}
