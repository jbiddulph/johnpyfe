import { prisma } from './prisma'

export async function createNotification(input: {
  userId: string
  type: string
  title: string
  body?: string | null
  link?: string | null
  crawlId?: string | null
}) {
  return prisma.ukpubsNotification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      crawlId: input.crawlId ?? null,
    },
  })
}

export function serializeNotification(row: {
  id: string
  userId: string
  type: string
  title: string
  body: string | null
  link: string | null
  crawlId: string | null
  readAt: Date | null
  createdAt: Date
}) {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    crawlId: row.crawlId,
    readAt: row.readAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
  }
}
