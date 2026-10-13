import { Appearance, StyleSheet } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

type ThemeColorRole =
  | 'backgroundColor'
  | 'borderColor'
  | 'color'
  | 'shadowColor';
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

const parseHexColor = (value: string): [number, number, number] | null => {
  const normalized = value.replace('#', '');
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) return null;
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map(char => char + char)
          .join('')
      : normalized;
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
};

export const adaptThemeColor = (
  value: string,
  role: ThemeColorRole,
  colorScheme = Appearance.getColorScheme(),
): string => {
  if (!value.startsWith('#')) return value;
  const channels = parseHexColor(value);
  if (!channels) return value;
  const [red, green, blue] = channels;
  if (Math.max(red, green, blue) - Math.min(red, green, blue) > 24)
    return value;

  const isDark = colorScheme === 'dark';
  if (role === 'backgroundColor') {
    const brightness = (red + green + blue) / 3;
    if (brightness < 32)
      return isDark
        ? brightness < 12
          ? '#080808'
          : '#191B1E'
        : brightness < 12
        ? '#FFFFFF'
        : '#F2F4F5';
    if (brightness > 220) return isDark ? '#080808' : '#FFFFFF';
    return isDark ? '#202326' : '#F2F4F5';
  }

  if (role === 'borderColor') return isDark ? '#34383C' : '#E1E5E8';
  if (role === 'shadowColor') return isDark ? '#000000' : '#78838A';

  const brightness = (red + green + blue) / 3;
  if (brightness < 32) return '#17191C';
  if (brightness < 86) return isDark ? '#A8AFB8' : '#17191C';
  if (brightness > 218) return isDark ? '#F7F7F8' : '#17191C';
  return isDark ? '#A8AFB8' : '#66747C';
};

export const getSystemStatusBarStyle = (): 'light-content' | 'dark-content' =>
  Appearance.getColorScheme() === 'dark' ? 'light-content' : 'dark-content';

export const adaptThemeClassName = (className: string): string => {
  const isDark = Appearance.getColorScheme() === 'dark';
  return className.replace(
    /\b(bg-black|bg-white|bg-zinc-900|bg-zinc-600|text-white|text-black|text-zinc-400|text-gray-400|(?:bg|text|border)-\[#(?:[0-9a-f]{3}|[0-9a-f]{6})\])/gi,
    token => {
      if (token === 'bg-black') return isDark ? token : 'bg-white';
      if (token === 'bg-white') return isDark ? 'bg-black' : token;
      if (token === 'bg-zinc-900')
        return isDark ? 'bg-gray-900' : 'bg-gray-100';
      if (token === 'bg-zinc-600')
        return isDark ? 'bg-gray-600' : 'bg-gray-300';
      if (token === 'text-zinc-400' || token === 'text-gray-400') {
        return isDark ? 'text-gray-300' : 'text-gray-600';
      }
      const match =
        /^(bg|text|border)-(\[#[0-9a-f]{3}(?:[0-9a-f]{3})?\])$/i.exec(token);
      if (match) {
        const color = match[2].slice(2, -1);
        const channels = parseHexColor(color);
        if (!channels) return token;
        const [red, green, blue] = channels;
        if (Math.max(red, green, blue) - Math.min(red, green, blue) > 24)
          return token;
        const brightness = (red + green + blue) / 3;
        if (match[1] === 'bg') {
          if (brightness < 32) return isDark ? 'bg-black' : 'bg-white';
          if (brightness > 220) return isDark ? 'bg-black' : 'bg-white';
          return isDark ? 'bg-gray-900' : 'bg-gray-100';
        }
        if (match[1] === 'border')
          return isDark ? 'border-gray-700' : 'border-gray-200';
        return brightness < 86 || brightness > 218
          ? isDark
            ? 'text-white'
            : 'text-gray-900'
          : isDark
          ? 'text-gray-300'
          : 'text-gray-600';
      }
      if (token === 'text-white') {
        return isDark ? token : 'text-gray-900';
      }
      if (token === 'text-black') {
        return token;
      }
      return token;
    },
  );
};

const adaptStyle = (
  style: Record<string, unknown>,
  colorScheme: ReturnType<typeof Appearance.getColorScheme>,
): Record<string, unknown> => {
  const result = { ...style };
  Object.keys(result).forEach(property => {
    const role: ThemeColorRole | undefined =
      property === 'backgroundColor'
        ? 'backgroundColor'
        : property === 'color'
        ? 'color'
        : property === 'shadowColor'
        ? 'shadowColor'
        : /^(?:border|outline).*Color$/.test(property)
        ? 'borderColor'
        : /^(?:tint|caret|selection|textDecoration)Color$/.test(property)
        ? 'color'
        : undefined;
    if (role && typeof result[property] === 'string') {
      result[property] = adaptThemeColor(
        result[property] as string,
        role,
        colorScheme,
      );
    }
  });
  return result;
};

export const createAdaptiveStyles = <
  T extends NamedStyles<T> | NamedStyles<any>,
>(
  styles: T & NamedStyles<any>,
): T => {
  const registeredStyles = StyleSheet.create(styles);
  return new Proxy(registeredStyles, {
    get(target, property, receiver) {
      const style = Reflect.get(target, property, receiver);
      if (typeof style !== 'object' || style === null || Array.isArray(style))
        return style;
      return adaptStyle(
        style as Record<string, unknown>,
        Appearance.getColorScheme(),
      );
    },
  });
};
