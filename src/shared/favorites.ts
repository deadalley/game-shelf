/**
 * Recognises a "favorites" collection in common languages so it can be pinned to the top of the
 * shelf and marked with a star: "Favorites", "My favourites", "Favoritos", "Mes favoris",
 * "Meine Favoriten", "Preferiti", "お気に入り"… A name only counts when the favorites word is all it
 * says, so "Favorite shooters" stays an ordinary collection.
 */
const FAVORITE_WORD = new RegExp(
  '^(' +
    [
      'favs?',
      'faves?',
      'fav(o|ou)rites?', // en
      'favorit(o|a)s', // es, pt
      'favoris', // fr
      'favoriten', // de
      'favoriti', // it
      'favorieten', // nl
      'favorit(t)?er', // da, no, sv
      'favorit(y|ai)?', // id, cs, lt
      'preferit[ie]', // it
      'preferid[oa]s', // es, pt
      'preferes', // fr "préférés"
      'ulubione', // pl
      'oblibene', // cs
      'kedvencek', // hu
      'suosikit', // fi
      'sevilenler' // tr
    ].join('|') +
    ')$'
)

/** Possessives and articles that may come before the word ("my", "mis", "mes", "meine", "i miei"…). */
const FILLER = new Set([
  'my',
  'our',
  'mis',
  'mes',
  'meine',
  'mijn',
  'mine',
  'meus',
  'minhas',
  'i',
  'miei',
  'le',
  'les',
  'os',
  'as',
  'moje',
  'moi',
  'de',
  'los',
  'las'
])

const FAVORITE_SCRIPTS = [
  'お気に入り',
  '즐겨찾기',
  '收藏',
  '收藏夹',
  '最爱',
  '最愛',
  'избранное',
  'избранные',
  'обране',
  'المفضلة',
  'מועדפים',
  'รายการโปรด',
  'αγαπημένα'
]

export function isFavoritesCollection(name: string): boolean {
  const raw = name.trim().toLowerCase()
  if (!raw) return false
  const compact = raw.replace(/^(我的|私の|내)\s*/, '').replace(/\s+/g, '')
  if (FAVORITE_SCRIPTS.includes(compact)) return true
  const words = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !FILLER.has(w))
  // "yêu thích" is two words in Vietnamese.
  const joined = words.join('')
  return (words.length === 1 && FAVORITE_WORD.test(words[0])) || joined === 'yeuthich'
}

export function isFavorite(collections: string[]): boolean {
  return collections.some(isFavoritesCollection)
}
