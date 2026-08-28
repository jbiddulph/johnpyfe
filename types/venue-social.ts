export type ReviewAuthor = {
  displayName: string
  username: string | null
}

export type SerializedReview = {
  id: string
  userId: string
  venueId: number
  rating: number
  comment: string
  createdAt: string
  updatedAt: string
  author: ReviewAuthor
}

export type ReviewSummary = {
  average: number | null
  count: number
  ratingCounts: Record<1 | 2 | 3 | 4 | 5, number>
}

export type VenueReviewsPayload = {
  summary: ReviewSummary
  reviews: SerializedReview[]
  myReview: SerializedReview | null
  isFavorite: boolean | null
}
