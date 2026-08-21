/**
 * GILD Preview — Content Schema
 * Zod validation for edition-no-01.json
 * Source of truth: src/content/edition-no-01.json
 */

import { z } from 'zod';

/* ── Sponsor ── */
const SponsorSchema = z.object({
  name: z.string(),
  logoSrc: z.string(),
  url: z.string().url(),
});

/* ── Cover ── */
const CoverSchema = z.object({
  eyebrow: z.string(),
  titleLines: z.array(z.string()).min(1),
  metadataLines: z.array(z.string()).min(1),
  sponsorLine: z.string(),
  ctaLabel: z.string(),
  photoSrc: z.string(),
  photoAlt: z.string(),
});

/* ── Meta ── */
const MetaSchema = z.object({
  editionNumber: z.string(),
  title: z.string(),
  tagline: z.string(),
  eventName: z.string(),
  location: z.string(),
  date: z.string(),
  organizer: z.string(),
  sponsor: SponsorSchema,
});

/* ── Signal ── */
const SignalSchema = z.object({
  number: z.string(),
  title: z.string(),
  body: z.string(),
});

/* ── Briefing ── */
const BriefingSchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  body: z.string(),
  ctaLabel: z.string(),
  ctaUrl: z.string(),
});

/* ── Room in Aggregate ── */
const RoomInAggregateSchema = z.object({
  eyebrow: z.string(),
  lines: z.array(z.string()).min(1),
});

/* ── Voice ── */
const VoiceSchema = z.object({
  quote: z.string(),
  attribution: z.string(),
});

/* ── Colophon ── */
const ColophonSchema = z.object({
  photographerName: z.string(),
  photoRemovalEmail: z.string().email(),
  partnershipsEmail: z.string().email(),
});

/* ── Gallery Photo ── */
const GalleryPhotoSchema = z.object({
  src: z.string(),
  alt: z.string(),
  aspect: z.enum(['portrait', 'wide', 'square']),
});

/* ── Gallery ── */
const GallerySchema = z.object({
  eyebrow: z.string(),
  photos: z.array(GalleryPhotoSchema).min(1),
});

/* ── Full Edition Schema ── */
export const EditionSchema = z.object({
  meta: MetaSchema,
  cover: CoverSchema,
  noteFromTheRoom: z.array(z.string()).min(1),
  signals: z.array(SignalSchema).min(1),
  briefing: BriefingSchema,
  gallery: GallerySchema,
  roomInAggregate: RoomInAggregateSchema,
  voices: z.array(VoiceSchema).min(1),
  shareCaption: z.string(),
  colophon: ColophonSchema,
});

/* ── Inferred type ── */
export type Edition = z.infer<typeof EditionSchema>;
