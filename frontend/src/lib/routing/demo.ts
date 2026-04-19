export function isDemoSearch(search: string): boolean {
  return new URLSearchParams(search).get('demo') === 'true';
}

export function buildDemoPath(
  path: string,
  currentSearch: string,
  isAnonymous = false
): string {
  const currentParams = new URLSearchParams(currentSearch);
  const demoActive = isAnonymous || currentParams.get('demo') === 'true';

  if (!demoActive) {
    return path;
  }

  const [pathWithoutHash, hashFragment] = path.split('#', 2);
  const [pathname, rawSearch = ''] = pathWithoutHash.split('?', 2);
  const nextParams = new URLSearchParams(rawSearch);
  nextParams.set('demo', 'true');

  const venueId = currentParams.get('venue');
  if (venueId && !nextParams.has('venue')) {
    nextParams.set('venue', venueId);
  }

  const nextSearch = nextParams.toString();
  const hash = hashFragment ? `#${hashFragment}` : '';
  return `${pathname}${nextSearch ? `?${nextSearch}` : ''}${hash}`;
}
