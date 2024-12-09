<template>
  <div>
    <h1 class="font-100">{{ venue.venuename }}</h1>
    <p>{{ venue.description }}</p>
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
useHead({
  title: venue.value.venuename, // Optional: Set the page title
  meta: [
    { name: 'keywords', content: `Events, Pubs, venues, UK in ${venue.value.town}` },
    { name: 'description', content: `Events at ${venue.value.venuename} ${venue.value.town}, venues and pubs in ${venue.value.town} UK` }
  ]
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