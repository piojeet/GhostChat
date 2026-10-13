export const snapFilters = [
  { id: 'original', label: 'Original', tint: 'transparent' },
  { id: 'warm', label: 'Warm', tint: 'rgba(255, 164, 72, 0.22)' },
  { id: 'cool', label: 'Cool', tint: 'rgba(66, 151, 255, 0.3)' },
  { id: 'mono', label: 'Mono', tint: 'rgba(110, 110, 110, 0.45)' },
  { id: 'vivid', label: 'Vivid', tint: 'rgba(255, 190, 30, 0.22)' },
  { id: 'rose', label: 'Rose', tint: 'rgba(246, 92, 172, 0.27)' },
] as const;

export type SnapFilter = (typeof snapFilters)[number]['id'];

export const snapFilter = (id: SnapFilter | undefined) =>
  snapFilters.find(filter => filter.id === id) ?? snapFilters[0];
