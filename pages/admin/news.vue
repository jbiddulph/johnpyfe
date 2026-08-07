<template>
  <div class="container mx-auto p-4 my-8">
    <Breadcrumbs :items="breadcrumbItems" />
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-4xl font-bold">News articles</h1>
      <UButton color="green" icon="i-heroicons-plus" label="New Article" @click="openCreateModal" />
    </div>

    <p v-if="loading" class="text-gray-600">Loading…</p>
    <p v-else-if="errorMessage" class="text-red-600">{{ errorMessage }}</p>

    <div v-else>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div 
          v-for="article in articles" 
          :key="article.id" 
          class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
        >
          <div v-if="article.imageUrl" class="h-48 bg-cover bg-center" :style="{ backgroundImage: `url(${article.imageUrl})` }"></div>
          <div v-else class="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span class="text-gray-500">No image</span>
          </div>
          <div class="p-4">
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-xl font-semibold flex-1">{{ article.title }}</h3>
              <UBadge v-if="article.isFeatured" color="amber" variant="soft">Featured</UBadge>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{{ article.excerpt }}</p>
            <div class="text-xs text-gray-500 mb-3">
              <p>By {{ article.authorName }}</p>
              <p>Published: {{ formatDate(article.publishedAt) }}</p>
              <p>Slug: {{ article.slug }}</p>
            </div>
            <div class="flex gap-2">
              <UButton size="xs" color="blue" label="Edit" @click="openEditModal(article)" />
              <UButton size="xs" color="red" variant="soft" label="Delete" @click="openDeleteModal(article)" />
              <UButton size="xs" color="gray" variant="ghost" label="View" :to="`/news/${article.slug}`" target="_blank" />
            </div>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="flex justify-center items-center gap-4 mt-8">
        <UButton label="Previous" :disabled="page <= 1" @click="changePage(page - 1)" />
        <span class="text-sm text-gray-600">Page {{ page }} of {{ totalPages }}</span>
        <UButton label="Next" :disabled="page >= totalPages" @click="changePage(page + 1)" />
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <UModal v-model="isModalOpen" :prevent-close="isSaving">
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold">{{ editingArticle ? 'Edit Article' : 'Create Article' }}</h3>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" @click="closeModal" :disabled="isSaving" />
          </div>
        </template>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Title *</label>
            <UInput v-model="formData.title" placeholder="Article title" :disabled="isSaving" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Slug</label>
            <UInput v-model="formData.slug" placeholder="article-slug (auto-generated if empty)" :disabled="isSaving" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Excerpt *</label>
            <UTextarea v-model="formData.excerpt" placeholder="Brief summary (max 500 chars)" :rows="3" :disabled="isSaving" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Content * (HTML)</label>
            <UTextarea v-model="formData.content" placeholder="Full article content (HTML supported)" :rows="10" :disabled="isSaving" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Image URL</label>
            <UInput v-model="formData.imageUrl" placeholder="https://..." :disabled="isSaving" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Author Name *</label>
            <UInput v-model="formData.authorName" placeholder="Author name" :disabled="isSaving" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Published Date *</label>
            <UInput v-model="formData.publishedAt" type="datetime-local" :disabled="isSaving" />
          </div>

          <div>
            <label class="flex items-center gap-2">
              <UCheckbox v-model="formData.isFeatured" :disabled="isSaving" />
              <span class="text-sm font-medium">Featured article</span>
            </label>
          </div>

          <p v-if="saveError" class="text-sm text-red-600">{{ saveError }}</p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" label="Cancel" @click="closeModal" :disabled="isSaving" />
            <UButton color="green" :label="editingArticle ? 'Update' : 'Create'" @click="saveArticle" :loading="isSaving" />
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="isDeleteModalOpen" :prevent-close="isDeleting">
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold">Delete Article</h3>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" @click="closeDeleteModal" :disabled="isDeleting" />
          </div>
        </template>

        <div>
          <p class="mb-4">Are you sure you want to delete this article?</p>
          <p class="font-semibold">{{ deletingArticle?.title }}</p>
          <p v-if="deleteError" class="text-sm text-red-600 mt-4">{{ deleteError }}</p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" label="Cancel" @click="closeDeleteModal" :disabled="isDeleting" />
            <UButton color="red" label="Delete" @click="deleteArticle" :loading="isDeleting" />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const { $supabase } = useNuxtApp()
const requestFetch = useRequestFetch()
const { user, isAdmin, initializeAuth } = useAuth()

interface Article {
  id: string
  title: string
  slug: string
  excerpt: string
  imageUrl: string | null
  authorName: string
  isFeatured: boolean
  publishedAt: string
  createdAt: string
  updatedAt: string
}

const loading = ref(true)
const errorMessage = ref('')
const articles = ref<Article[]>([])
const page = ref(1)
const totalPages = ref(1)

const isModalOpen = ref(false)
const isSaving = ref(false)
const saveError = ref('')
const editingArticle = ref<Article | null>(null)

const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)
const deleteError = ref('')
const deletingArticle = ref<Article | null>(null)

const formData = ref({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  imageUrl: '',
  authorName: '',
  isFeatured: false,
  publishedAt: '',
})

const breadcrumbItems = [
  { label: 'Home', to: '/' },
  { label: 'Admin', to: '/admin/dashboard' },
  { label: 'News' },
]

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

async function loadArticles() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await $supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Not authenticated')

    const response = await requestFetch(`/api/admin/news?page=${page.value}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    articles.value = response.articles
    totalPages.value = response.totalPages
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; message?: string }
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Failed to load articles'
  } finally {
    loading.value = false
  }
}

function changePage(newPage: number) {
  page.value = newPage
  loadArticles()
  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function openCreateModal() {
  editingArticle.value = null
  formData.value = {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    imageUrl: '',
    authorName: '',
    isFeatured: false,
    publishedAt: new Date().toISOString().slice(0, 16),
  }
  isModalOpen.value = true
  saveError.value = ''
}

function openEditModal(article: Article) {
  editingArticle.value = article
  formData.value = {
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: '',
    imageUrl: article.imageUrl || '',
    authorName: article.authorName,
    isFeatured: article.isFeatured,
    publishedAt: new Date(article.publishedAt).toISOString().slice(0, 16),
  }
  
  // Load full article content
  loadFullArticle(article.id)
  isModalOpen.value = true
  saveError.value = ''
}

async function loadFullArticle(id: string) {
  try {
    const { data } = await $supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return

    const article = await requestFetch(`/api/admin/news/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    formData.value.content = article.content
  } catch (error) {
    console.error('Failed to load full article:', error)
  }
}

function closeModal() {
  if (!isSaving.value) {
    isModalOpen.value = false
    editingArticle.value = null
  }
}

async function saveArticle() {
  if (!formData.value.title || !formData.value.excerpt || !formData.value.content || !formData.value.authorName) {
    saveError.value = 'Please fill in all required fields'
    return
  }

  isSaving.value = true
  saveError.value = ''

  try {
    const { data } = await $supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Not authenticated')

    const payload = {
      title: formData.value.title,
      slug: formData.value.slug || undefined,
      excerpt: formData.value.excerpt,
      content: formData.value.content,
      imageUrl: formData.value.imageUrl || null,
      authorName: formData.value.authorName,
      isFeatured: formData.value.isFeatured,
      publishedAt: formData.value.publishedAt,
    }

    if (editingArticle.value) {
      await requestFetch(`/api/admin/news/${editingArticle.value.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      })
    } else {
      await requestFetch('/api/admin/news', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      })
    }

    closeModal()
    await loadArticles()
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; message?: string }
    saveError.value = err?.data?.statusMessage || err?.message || 'Failed to save article'
  } finally {
    isSaving.value = false
  }
}

function openDeleteModal(article: Article) {
  deletingArticle.value = article
  isDeleteModalOpen.value = true
  deleteError.value = ''
}

function closeDeleteModal() {
  if (!isDeleting.value) {
    isDeleteModalOpen.value = false
    deletingArticle.value = null
  }
}

async function deleteArticle() {
  if (!deletingArticle.value) return

  isDeleting.value = true
  deleteError.value = ''

  try {
    const { data } = await $supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Not authenticated')

    await requestFetch(`/api/admin/news/${deletingArticle.value.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    closeDeleteModal()
    await loadArticles()
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; message?: string }
    deleteError.value = err?.data?.statusMessage || err?.message || 'Failed to delete article'
  } finally {
    isDeleting.value = false
  }
}

watchEffect(() => {
  if (!isAdmin.value && user.value !== null) {
    navigateTo('/')
  }
})

onMounted(async () => {
  await initializeAuth()
  if (isAdmin.value) await loadArticles()
})

watch(isAdmin, (admin) => {
  if (admin) loadArticles()
})

useSiteSeo({
  title: 'Admin — news articles',
  description: 'Manage news articles.',
  path: '/admin/news',
})
</script>
