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

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Article ID is required',
    })
  }

  const body = await readBody(event)
  const { title, slug, excerpt, content, imageUrl, authorName, isFeatured, publishedAt } = body

  if (!title || !excerpt || !content || !authorName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title, excerpt, content, and author name are required',
    })
  }

  try {
    const existingArticle = await prisma.ukpubsNews.findUnique({
      where: { id },
    })

    if (!existingArticle) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Article not found',
      })
    }

    let finalSlug = slug || slugify(title)
    
    // Ensure slug is unique (excluding current article)
    if (finalSlug !== existingArticle.slug) {
      let slugSuffix = 1
      let uniqueSlug = finalSlug
      while (await prisma.ukpubsNews.findFirst({ 
        where: { 
          slug: uniqueSlug,
          id: { not: id }
        } 
      })) {
        uniqueSlug = `${finalSlug}-${slugSuffix}`
        slugSuffix++
      }
      finalSlug = uniqueSlug
    }

    const article = await prisma.ukpubsNews.update({
      where: { id },
      data: {
        title,
        slug: finalSlug,
        excerpt,
        content,
        imageUrl: imageUrl || null,
        authorName,
        isFeatured: isFeatured !== undefined ? isFeatured : existingArticle.isFeatured,
        publishedAt: publishedAt ? new Date(publishedAt) : existingArticle.publishedAt,
      },
    })

    return article
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('[api/admin/news/update] failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update article',
    })
  }
})
