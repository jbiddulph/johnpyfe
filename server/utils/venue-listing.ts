import Joi from 'joi'
import { slugifyPlace } from '../../utils/format-venue'

export const ownerVenueListingSchema = Joi.object({
  venuename: Joi.string().trim().min(1).max(255).required(),
  town: Joi.string().trim().max(120).allow('', null).optional(),
  county: Joi.string().trim().max(120).allow('', null).optional(),
  postcode: Joi.string().trim().max(20).allow('', null).optional(),
  address: Joi.string().trim().max(500).allow('', null).optional(),
  address2: Joi.string().trim().max(500).allow('', null).optional(),
  telephone: Joi.string().trim().max(50).allow('', null).optional(),
  website: Joi.string().trim().max(500).allow('', null).optional(),
  description: Joi.string().trim().max(5000).allow('', null).optional(),
  latitude: Joi.string().trim().max(50).allow('', null).optional(),
  longitude: Joi.string().trim().max(50).allow('', null).optional(),
})

export function normalizePostcodeSearch(postcode: string | null | undefined): string {
  return String(postcode || '').replace(/\s+/g, '').toUpperCase()
}

export function venueSlugFromName(venuename: string, venueId: number): string {
  return slugifyPlace(venuename) || `venue-${venueId}`
}

export function parseCoord(value: string | null | undefined): string | null {
  const raw = String(value || '').trim()
  if (!raw) return null
  const n = Number.parseFloat(raw)
  if (!Number.isFinite(n)) return null
  return String(n)
}
