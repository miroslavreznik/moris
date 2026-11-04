export const MORIS_COLORS = [
  { id: 'tangerine', label: 'Tangerine', body: '#eb6b36', shade: '#b65331', highlight: '#f7a36e', infinite: '#ef9945' },
  { id: 'moss', label: 'Moss', body: '#81a878', shade: '#4e7858', highlight: '#bbd2a3', infinite: '#9abb83' },
  { id: 'lilac', label: 'Lilac', body: '#b69bd3', shade: '#80639d', highlight: '#d9c6ea', infinite: '#c5abdf' },
  { id: 'lagoon', label: 'Lagoon', body: '#66aaa5', shade: '#367e7e', highlight: '#a0d2c6', infinite: '#85c0b3' },
  { id: 'rose', label: 'Rose', body: '#df8c99', shade: '#ad586d', highlight: '#f2bdc2', infinite: '#e8a5ac' },
] as const;
export const MORIS_DETAILS = [
  { id: 'freckles', label: 'Freckles', description: 'A little constellation on one cheek.' },
  { id: 'tuft', label: 'Little tuft', description: 'Permanently having a good bad-hair day.' },
  { id: 'antenna', label: 'Crooked antenna', description: 'Picking up something wonderfully odd.' },
] as const;
export type MorisColor = typeof MORIS_COLORS[number]['id'];
export type MorisDetail = typeof MORIS_DETAILS[number]['id'];
export type Appearance = { morisColor: MorisColor; morisDetail: MorisDetail };
export const DEFAULT_APPEARANCE: Appearance = { morisColor: 'tangerine', morisDetail: 'freckles' };
export function appearanceOf(value?: Partial<Appearance>): Appearance {
  return {
    morisColor: MORIS_COLORS.some(color => color.id === value?.morisColor) ? value!.morisColor! : DEFAULT_APPEARANCE.morisColor,
    morisDetail: MORIS_DETAILS.some(detail => detail.id === value?.morisDetail) ? value!.morisDetail! : DEFAULT_APPEARANCE.morisDetail,
  };
}
