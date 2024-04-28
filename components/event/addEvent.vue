<template>
  <div>
    <h3>Add Event for venue: {{venueid}}</h3>
    <div v-if="venueid === null">
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
    <form @submit.prevent="submitForm" enctype="multipart/form-data">
      <!-- <div>
        <UInput v-model="formData.venue" type="text" id="venue" required disabled />
      </div> -->
      <h2>{{ formData.event_title }}</h2>
      <div>
        <UInput v-model="user.id" type="hidden" id="use_id" name="user_id" disabled />
      </div>
      <div>
        <p for="event_title">Event Name:</p>
        <UInput v-model="formData.event_title" type="text" id="event_title" name="event_title" />
      </div>  
      <div>
        <p for="description">Description (max 20 chars):</p><br />
        <UTextarea v-model="formData.description" id="description" name="description" rows="4" cols="50"></UTextarea>
      </div>
      <div>
        <p for="cost">Cost:</p>
        <UInput v-model="formData.cost" type="text" id="cost" name="cost" step="0.01" required />
      </div>
      <div>
        <p for="duration">Duration (in minutes):</p>
        <UInput v-model="formData.duration" type="text" id="duration" name="duration" required />
      </div>
      <div>
        <p for="event_start">Event Date:</p>
        <UInput v-model="formData.event_start" type="text" id="event_start" name="event_start" required />
        <!-- <UInput v-model="event_start" type="date" id="event_start" name="event_start" required /> -->
      </div>
      <!-- <div>
        <p for="time_start">Start Time:</p>
        {{ formData.time_start }}
        <UInput v-model="formData.time_start" type="time" id="time_start" name="time_start" required />
      </div>
      <div>
        <p for="time_end">End Time:</p>
        {{ formData.time_end }}
        <UInput v-model="formData.time_end" type="time" id="time_end" name="time_end" required />
      </div> -->
      <div>
        <p for="category">Category:</p>
        <UInput v-model="formData.category" type="text" id="category" name="category" />
      </div>
      <div>
        <p for="photo">Photo URL:</p>
        <!-- <u-input v-model="formData.photo" id="photo" name="photo" type="file" /> -->
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
import { useAuthStore } from "@/store/auth.js";
import { useEventStore } from "@/store/event.js";
const authStore = useAuthStore();
const eventStore = useEventStore();
const emits = defineEmits(['closeModal']);
const props = defineProps({
  venueid: Number
})
const loading = ref(false)
const selected = ref([])
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const userId = user && user.id ? user.id.toString() : '';
async function search(q: string) {
  loading.value = true;
  const BASE_URL = useRuntimeConfig().public.apiURL;
  const response = await $fetch<any[]>(BASE_URL + `/api/venues/search/`, { params: { q } });
  loading.value = false;
  response.forEach(venue => {
    venue.concatenatedName = `${venue.venuename}, of ${venue.town} (${venue.id})`;
  });
  return response;
}
const date = new Date();
const formattedDate = date.toISOString().slice(0, 19) + ".000Z";
const formData = ref({
  venue_id: parseInt(props.venueid),
  user_id: "",
  // listingId: parseInt(props.venueid),
  event_title: null,
  description: null,
  cost: null,
  duration: null,
  event_start: formattedDate,
  category: null,
  photo: null,
  website: null,
});
console.log("Formdata: ", formData);
const handleFileUpload = (event: { target: { files: any[]; }; }) => {
  const file = event.target.files[0];
  formData.photo = file;
};

const submitForm = async () => {
  console.log("form is being submitted");
  const fileName = Math.floor(Math.random() * 10000000000000000);
  const { data, error } = await supabase.storage.from("event_images").upload("public/" + fileName, formData.photo)
  try {
    const formDataObj = {
      venue_id: parseInt(props.venueid),
      user_id: user.id.toString(),
      listingId: parseInt(props.venueid),
      event_title: formData.value.event_title,
      description: formData.value.description,
      cost: formData.value.cost,
      duration: formData.value.duration,
      event_start: formData.value.event_start,
      category: formData.value.category,
      website: formData.value.website,
      created_at: new Date(),
      photo: data.path // Assuming data.path is the URL of the uploaded photo
    };
    
    await eventStore.addEvent(formDataObj, props.venueid);
    
    console.log("Event added successfully:", formDataObj);
    emits('closeModal');
  } catch (error) {
    await supabase.storage.from("event_images").remove(data.path)  
  }
};


const formattedEventDate = computed(() => {
  // Check if formData.event_start is defined and not null
  console.log("formData.event_start:", formData.event_start); // Log the value of formData.event_start
  if (formData.event_start != null) {
    // Assuming formData.event_start is in "dd/mm/yyyy" format
    const dateParts = formData.event_start.split('/');
    console.log("dateParts:", dateParts); // Log the value of dateParts
    if (dateParts.length === 3) {
      const [day, month, year] = dateParts;
      // Reformat the date to "yyyy-mm-dd" format
      const formattedDate = `${year}-${month}-${day}`;
      console.log("formattedDate:", formattedDate); // Log the formatted date
      return formattedDate;
    } else {
      // Handle invalid date format
      return '';
    }
  } else {
    // Handle case where formData.event_start is undefined or null
    return '';
  }
});
watch(selected, (newValue: { id: number }) => {
  if (newValue && newValue.id) {
    formData.value.venue_id = newValue.id;
  } else if (!isNaN(props.venueid)) {
    // If no venue is selected or selected venue doesn't have a valid id,
    // and props.venueid is a valid number, fallback to props.venueid
    formData.value.venue_id = props.venueid;
    formData.value.listingId =props.venueidx;
  } else {
    // If neither newValue.id nor props.venueid is a valid number, set venue_id to null or a default value
    formData.value.venue_id = null; // Or provide a default value like 0
    formData.value.listingId = null; // Or provide a default value like 0
  }
});

</script>

<style scoped>

</style>