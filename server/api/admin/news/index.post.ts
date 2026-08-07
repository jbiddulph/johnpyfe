import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/require-admin'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { title, excerpt, content, imageUrl, authorName, isFeatured, publishedAt } = body

  if (!title || !excerpt || !content || !authorName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title, excerpt, content, and author name are required',
    })
  }

  let slug = body.slug || slugify(title)
  
  // Ensure slug is unique
  let slugSuffix = 1
  let uniqueSlug = slug
  while (await prisma.ukpubsNews.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${slugSuffix}`
    slugSuffix++
  }

  try {
    const article = await prisma.ukpubsNews.create({
      data: {
        title,
        slug: uniqueSlug,
        excerpt,
        content,
        imageUrl: imageUrl || null,
        authorName,
        isFeatured: isFeatured || false,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      },
    })

    return article
  } catch (error: any) {
    console.error('[api/admin/news/create] failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create article',
    })
  }
})
