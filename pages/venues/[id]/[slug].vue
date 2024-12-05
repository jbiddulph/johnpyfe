<template>
  <div>
    <h1 class="font-100">{{ venue.venuename }}</h1>
    <p>{{ venue.description }}</p>
    <p>xxxx</p>
    <!-- Add more venue details here -->
  </div>
</template>

<script lang="ts" setup>

const route = useRoute();
const venue = ref({});

onMounted(async () => {
  const { id, slug } = route.params;
  try {
    const response = await axios.get(`/api/venues/${id}`);
    venue.value = response.data;
    setPageMeta();
  } catch (error) {
    console.error('Error fetching venue:', error);
  }
});

const setPageMeta = () => {
  usePageMeta({
    title: venue.value.venuename,
    meta: [
      {
        name: 'keywords',
        content: venue.value.town || ''
      }
    ]
  });
};

watch(venue, setPageMeta);
</script>