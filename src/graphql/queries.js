const MEDIA_FIELDS = `
  fragment mediaFields on Media {
    id
    idMal
    title {
      romaji
      english
      native
    }
    description
    genres
    tags {
      name
      rank
      category
    }
    episodes
    duration
    status
    format
    season
    seasonYear
    seasonInt
    averageScore
    meanScore
    popularity
    favourites
    source
    hashtag
    countryOfOrigin
    isAdult
    startDate {
      year
      month
      day
    }
    endDate {
      year
      month
      day
    }
    nextAiringEpisode {
      airingAt
      episode
      timeUntilAiring
    }
    coverImage {
      extraLarge
    }
    bannerImage
    trailer {
      id
      site
      thumbnail
    }
    studios {
      nodes {
        name
      }
    }
    siteUrl
  }
`;

// Relations (SEQUEL/PREQUEL/SIDE_STORY/etc.) are ONLY fetched here, on the
// single-anime detail query — NOT added to the shared mediaFields fragment,
// since that fragment is also reused by MEDIA_PAGE_QUERY for list views
// (top anime, trending, search — 20-25 items per request). Putting
// relations in the shared fragment would pull a full relations edge list
// for every item in every list, inflating payload and cache size for
// pages that never render related anime at all.
export const MEDIA_DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      ...mediaFields
      relations {
        edges {
          relationType
          node {
            id
            type
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              extraLarge
            }
            format
            status
            episodes
            startDate {
              year
            }
          }
        }
      }
    }
  }

  ${MEDIA_FIELDS}
`;

export const MEDIA_PAGE_QUERY = `
  query (
    $page: Int!
    $perPage: Int!
    $search: String
    $sort: [MediaSort]
    $status: MediaStatus
    $status_not: MediaStatus
    $format: MediaFormat
    $season: MediaSeason
    $seasonYear: Int
    $countryOfOrigin: CountryCode
    $genres: [String]
    $averageScore_greater: Int
    $episodes_greater: Int
    $isAdult: Boolean
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        hasNextPage
      }
      media(
        search: $search
        sort: $sort
        type: ANIME
        status: $status
        status_not: $status_not
        format: $format
        season: $season
        seasonYear: $seasonYear
        countryOfOrigin: $countryOfOrigin
        genre_in: $genres
        averageScore_greater: $averageScore_greater
        episodes_greater: $episodes_greater
        isAdult: $isAdult
      ) {
        ...mediaFields
      }
    }
  }

  ${MEDIA_FIELDS}
`;
