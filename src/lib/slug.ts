const SUFFIX_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || 'business';
}

export function randomSuffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let output = '';
  for (const byte of bytes) output += SUFFIX_CHARS[byte % SUFFIX_CHARS.length];
  return output;
}

export function makeSlug(name: string, suffix: () => string = randomSuffix): string {
  return `${slugify(name)}-${suffix()}`;
}
