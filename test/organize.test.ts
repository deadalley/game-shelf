import { describe, expect, it } from 'vitest'
import { isFavorite, isFavoritesCollection } from '@shared/favorites'
import { DEFAULT_SETTINGS, type Game } from '@shared/types'
import { groupGames, sortGames } from '../src/renderer/lib/organize'

describe('favorites collections', () => {
  it.each([
    'Favorites',
    'favorite',
    'FAVOURITES',
    'My Favorites',
    'my favourites',
    'Favoritos',
    'Mis favoritos',
    'Favoritas',
    'Mes favoris',
    'Meine Favoriten',
    'I miei preferiti',
    'Favorieten',
    'Favoritter',
    'Favoriter',
    'Préférés',
    'Ulubione',
    'Oblíbené',
    'Suosikit',
    'お気に入り',
    '즐겨찾기',
    '我的收藏',
    'Избранное',
    'Yêu thích',
    '  favs '
  ])('recognises %s', (name) => expect(isFavoritesCollection(name)).toBe(true))

  it.each(['Favorite shooters', 'Strategy', 'Cozy', 'Uncategorized', 'Not favorites', '', 'Prefab'])(
    'ignores %s',
    (name) => expect(isFavoritesCollection(name)).toBe(false)
  )

  it('checks a game collection list', () => {
    expect(isFavorite(['RPG', 'Mis favoritos'])).toBe(true)
    expect(isFavorite(['RPG'])).toBe(false)
  })
})

const game = (id: string, name: string, extra: Partial<Game> = {}): Game => ({
  id,
  service: 'steam',
  name,
  installed: true,
  collections: [],
  hidden: false,
  ...extra
})

describe('organizing', () => {
  const games = [
    game('a', 'Alpha', { collections: ['Strategy'], playtimeMinutes: 10, lastPlayed: 3 }),
    game('b', 'Bravo', { collections: ['Favoritos', 'Strategy'], playtimeMinutes: 500, lastPlayed: 1 }),
    game('c', 'Charlie', { playtimeMinutes: 50 }),
    game('d', 'Delta', { collections: ['Action'] })
  ]

  it('puts favorites first and Uncategorized last when grouping by collection', () => {
    const groups = groupGames(games, { ...DEFAULT_SETTINGS, group: 'collection' })
    expect(groups.map((g) => g.title)).toEqual(['Favoritos', 'Action', 'Strategy', 'Uncategorized'])
    expect(groups[0].favorite).toBe(true)
    expect(groups[1].favorite).toBe(false)
  })

  it('sorts by playtime and last played, games without data last', () => {
    expect(sortGames(games, 'playtime').map((g) => g.id)).toEqual(['b', 'c', 'a', 'd'])
    expect(sortGames(games, 'lastPlayed').map((g) => g.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})
