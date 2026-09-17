import {
  clampPubAssistantLimit,
  collectAssistantLinks,
  isSafeSitePath,
  normalisePubQuestion,
  venueAssistantHref,
} from '../server/utils/ai/pub-assistant-format'

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

assert(normalisePubQuestion('  dog pubs \n in Brighton ') === 'dog pubs in Brighton', 'normalise whitespace')
assert(clampPubAssistantLimit(99, 8, 12) === 12, 'clamp upper bound')
assert(clampPubAssistantLimit('0', 8, 12) === 1, 'clamp lower bound')
assert(isSafeSitePath('/venues/12/the-hop'), 'safe venue path')
assert(!isSafeSitePath('https://evil.example'), 'reject absolute url')
assert(!isSafeSitePath('//evil.example/phish'), 'reject protocol-relative url')
assert(venueAssistantHref(12, 'the hop') === '/venues/12/the%20hop', 'encode venue slug')

const links = collectAssistantLinks([
  {
    links: [
      { type: 'venue', label: 'The Hop', href: '/venues/1/the-hop' },
      { type: 'venue', label: 'Dup', href: '/venues/1/the-hop' },
      { type: 'news', label: 'Bad', href: 'https://example.com' },
    ],
  },
])
assert(links.length === 1 && links[0].href === '/venues/1/the-hop', 'dedupe and sanitise links')

console.log('pub-assistant format checks passed')
