<template>
  <div class="overflow-y-scroll">
    <h3 v-if="props.venue">
      Add Event for {{ venue.venuename }}
    </h3>
    <h3 v-else>Add Event for venue: {{selected.concatenatedName}} <button v-if="selected !== []" class="rounded-full p-0 m-0 flex w-4 h-4 bg-red-500" @click="clear">&nbsp;</button></h3>
    <div v-if="!props.venue">
      <USelectMenu
        v-model="selected"
        :loading="loading"
        :searchable="search"
        placeholder="Search for a venue..."
        option-attribute="concatenatedName"
        option-id-attribute="id"
        trailing
        by="id"
      />
    </div>
    <form @submit.prevent="submitForm(user.id)" enctype="multipart/form-data" class="m-2">
      <h2>{{ formData.event_title }}</h2>
      <div>
        <UInput v-model="user.id" type="hidden" id="user_id" name="user_id" disabled />
      </div>
      <div>
        <p for="event_title">Event Name:</p>
        <UInput v-model="formData.event_title" type="text" id="event_title" name="event_title" />
      </div>  
      <div>
        <p for="description">Description (max 20 chars):</p>
        <UTextarea v-model="formData.description" id="description" name="description" rows="4" cols="50"></UTextarea>
      </div>
      <div class="flex flex-row">
        <div class="w-1/2 mr-4">
          <p for="cost">Cost:</p>
          <UInput v-model="formData.cost" type="text" id="cost" name="cost" step="0.01" required />
        </div>
        <div class="w-1/2">
          <p for="duration">Duration (in minutes):</p>
          <UInput v-model="formData.duration" type="text" id="duration" name="duration" required />
        </div>
      </div>
      <div class="flex flex-row">
        <div class="w-1/2 mr-4">
          <p for="event_date">Event Date:</p>
          <UInput v-model="eventDate" type="date" id="event_date" name="event_date" required />
        </div>
        <div class="w-1/2">
          <p for="event_time">Event Time:</p>
          <UInput v-model="eventTime" type="time" id="event_time" name="event_time" required />
        </div>
      </div>
      <div>
        <p for="category">Category:</p>
        <UInput v-model="formData.category" type="text" id="category" name="category" />
      </div>
      <div>
        <p for="photo">Photo URL:</p>
        <UInput v-model="formData.photo" type="file" id="photo" name="photo" accept="image/*" @change="handleFileUpload" />
      </div>
      <div>
        <p for="website">Website URL:</p>
        <UInput v-model="formData.website" type="text" id="website" name="website" />
      </div>
      <UButton
        type="submit"
        icon="i-heroicons-pencil-square"
        size="sm"
        color="primary"
        variant="solid"
        label="Add Event"
        :trailing="false"
      />
    </form>
  </div>
</template>


<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from "@/store/auth.js";
import { useEventStore } from "@/store/event.js";
const authStore = useAuthStore();
const eventStore = useEventStore();
const emits = defineEmits(['closeModal']);
const props = defineProps({
  venue: Object,
  venueid: Number
})
const venueid = ref(0);
const loading = ref(false)
const selected = ref([])
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const userId = ref(user.value.id); // Initialize userId with the current user's ID
const clear = () => {
  selected.value = []
}
async function search(q: string) {
  loading.value = true;
  const response = await $fetch<any[]>(`${useRuntimeConfig().public.baseURL}/api/venues/search/`, { params: { q } });
  loading.value = false;
  response.forEach(venue => {
    venue.concatenatedName = `${venue.venuename}, of ${venue.town} (${venue.id})`;
  });
  return response;
}

const eventDate = ref('');
const eventTime = ref('');
const formData = ref({
  venue_id: parseInt(props.venueid),
  user_id: userId.value, // Set user_id to the initialized userId
  listingId: parseInt(props.venueid),
  event_title: null,
  description: null,
  cost: null,
  duration: null,
  event_start: '',
  category: null,
  photo: null,
  website: null,
});

const formattedEventStart = computed(() => {
  if (eventDate.value && eventTime.value) {
    return new Date(`${eventDate.value}T${eventTime.value}:00.000Z`).toISOString();
  }
  return '';
});

watch([eventDate, eventTime], () => {
  formData.value.event_start = formattedEventStart.value;
});

const handleFileUpload = (event: { target: { files: any[]; }; }) => {
  const file = event.target.files[0];
  formData.photo = file;
};

const submitForm = async (curuser: string) => {
  userId.value = curuser; // Update userId with the current user's ID passed to the function
  const fileName = Math.floor(Math.random() * 10000000000000000);
  if (formData.value.photo) {
    const { data, error } = await supabase.storage.from("event_images").upload("public/" + fileName, formData.photo)
    if (error) {
      console.error("Failed to upload photo:", error.message);
      return;
    }
    try {
      let venueIdValue;
      if (props.venueid) {
        venueIdValue = parseInt(props.venueid);
      } else {
        venueIdValue = venueid.value;
      }
      const formDataObj = {
        venue_id: venueIdValue,
        user_id: userId.value, // Use the updated userId for the form data
        listingId: venueIdValue,
        event_title: formData.value.event_title,
        description: formData.value.description,
        cost: formData.value.cost,
        duration: formData.value.duration,
        event_start: formData.value.event_start,
        category: formData.value.category,
        website: formData.value.website,
        created_at: new Date(),
        photo: data.path
      };
      
      await eventStore.addEvent(formDataObj);
      
      console.log("Event added successfully:", formDataObj);
      emits('closeModal');
    } catch (error) {
      console.error("Failed to add event:", error);
      await supabase.storage.from("event_images").remove(data.path);
    }
  } else {
    console.error("No photo to upload");
  }
};

onMounted(() => {
  if(props.venueid) {
    venueid.value = props.venueid;
  }
});

watch(selected, (newValue: { id: number }) => {
  console.log("selected:", selected);
  console.log("newValue:", newValue);
  if (newValue && newValue.id) {
    venueid.value = parseInt(newValue.id);
    formData.value.venue_id = parseInt(newValue.id);
    formData.value.listingId = parseInt(newValue.id);
  } else if (!isNaN(props.venueid)) {
    // If no venue is selected or selected venue doesn't have a valid id,
    // and props.venueid is a valid number, fallback to props.venueid
    formData.value.venue_id = parseInt(props.venueid);
    formData.value.listingId = props.venueid;
  } else {
    // If neither newValue.id nor props.venueid is a valid number, set venue_id to null or a default value
    formData.value.venue_id = null; // Or provide a default value like 0
    formData.value.listingId = null; // Or provide a default value like 0
  }
});
</script>

<style scoped>

</style>
