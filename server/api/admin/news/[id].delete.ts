import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Article ID is required',
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

    await prisma.ukpubsNews.delete({
      where: { id },
    })

    return { success: true, id }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('[api/admin/news/delete] failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete article',
    })
  }
})
