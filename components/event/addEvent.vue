<template>
  <div class="overflow-y-scroll">
    <div v-if="isSaving" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="spinner"></div>
    </div>
    <h3 v-if="isEditMode">
      Edit Event: {{ formData.event_title }}
    </h3>
    <h3 v-else>
      Add Event for {{ props.venue ? props.venue.venuename : selected.concatenatedName }}
      <button v-if="selected.length" class="rounded-full p-0 m-0 flex w-4 h-4 bg-red-500" @click="clear">&nbsp;</button>
    </h3>
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
    <form @submit.prevent="submitEventForm(user.id)" enctype="multipart/form-data" class="m-2">
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
        <UTextarea v-model="formData.description" id="description" name="description" :rows="4" cols="50"></UTextarea>
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
        <div v-if="isEditMode && currentPhotoUrl">
          <p>Current Photo:</p>
          <img :src="`${useRuntimeConfig().public.eventImgFolder}/` + currentPhotoUrl" alt="Event Photo" class="w-32 h-32 object-cover" />
        </div>
        <p for="photo">Photo URL:</p>
        <UInput
          ref="fileInput"
          type="file"
          id="photo"
          name="photo"
          accept="image/*"
          @change="handleFileUpload"
        />
      </div>
      <div>
        <p for="website">Website URL:</p>
        <UInput v-model="formData.website" type="text" id="website" name="website" />
      </div>
      <UButton
        type="submit"
        icon="i-heroicons-pencil-square"
        size="sm"
        :color="isEditMode ? 'blue' : 'green'"
        variant="solid"
        :label="isEditMode ? 'Save Changes' : 'Add Event'"
        :trailing="false"
      />
    </form>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/store/auth.js";
import { useEventStore } from "@/store/event.js";
import { useVenueStore } from "@/store/venue.js";

const authStore = useAuthStore();
const eventStore = useEventStore();
const venueStore = useVenueStore();
const emits = defineEmits(["closeModal"]);

const props = defineProps({
  event: Object,
  venue: Object,
  venueid: Number,
});

const fileInput = ref(null);
const venueid = ref(props.venueid || 0);
const isSaving = ref(false);
const loading = ref(false);
const selected = ref([]);
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const userId = ref(user.value.id);

const formData = ref({
  venue_id: props.venueid || null,
  user_id: userId.value || null,
  listingId: props.venueid || null,
  event_title: props.event?.event_title || "",
  description: props.event?.description || "",
  cost: props.event?.cost || "",
  duration: props.event?.duration || "",
  event_start: props.event?.event_start || "",
  category: props.event?.category || "",
  photo: props.event?.photo || "",
  website: props.event?.website || "",
});

const clearFileInput = () => {
  if (fileInput.value) {
    fileInput.value.value = ""; // Reset the file input
  }
};
const clear = () => {
  selected.value = [];
};
async function search(q: string) {
  loading.value = true;
  const response = await $fetch<any[]>(`${useRuntimeConfig().public.baseURL}/api/venues/search/`, { params: { q } });
  loading.value = false;
  response.forEach(venue => {
    venue.concatenatedName = `${venue.venuename} - ${venue.town}`;
  });
  return response;
}
const currentPhotoUrl = computed(() => {
  return isEditMode.value ? props.event.photo : "";
});

const eventDate = ref("");
const eventTime = ref("");

const isEditMode = computed(() => props.event && Object.keys(props.event).length > 0);

if (isEditMode.value && props.event.event_start) {
  const [date, time] = props.event.event_start.split("T");
  eventDate.value = date || "";
  eventTime.value = time?.slice(0, 5) || ""; // Extract HH:MM
}

const formattedEventStart = computed(() => {
  if (eventDate.value && eventTime.value) {
    const dateTimeString = `${eventDate.value}T${eventTime.value}:00`; // Combine date and time
    const dateObject = new Date(dateTimeString);

    if (isNaN(dateObject.getTime())) {
      console.error("Invalid date or time:", eventDate.value, eventTime.value);
      return ""; // Return empty string if invalid
    }

    return dateObject.toISOString(); // Return ISO 8601 formatted string
  }

  return ""; // Return empty string if date or time is missing
});

watch([eventDate, eventTime], () => {
  formData.value.event_start = formattedEventStart.value;
});

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    formData.value.photo = file;
  }
};

const submitEventForm = async (curuser) => {
  isSaving.value = true;
  try {
    userId.value = curuser;

    // Validate venue_id and listingId
    if (!formData.value.venue_id || !formData.value.listingId) {
      if (selected.value && selected.value.id) {
        formData.value.venue_id = parseInt(selected.value.id, 10);
        formData.value.listingId = parseInt(selected.value.id, 10);
      } else if (props.event && props.event.venue_id) {
        formData.value.venue_id = parseInt(props.event.venue_id, 10);
        formData.value.listingId = parseInt(props.event.listingId, 10);
      } else {
        throw new Error("No valid venue selected or fallback available");
      }
    }

    // Validate event_start
    const eventStartValue = formattedEventStart.value;
    if (!eventStartValue) {
      throw new Error("Invalid event_start value");
    }
    formData.value.event_start = eventStartValue;

    // Log the final form data
    console.log("Final Event Data to Send:", formData.value);

    let photoPath = formData.value.photo;
    if (formData.value.photo instanceof File) {
      const fileName = Date.now().toString();
      const { data, error } = await supabase.storage
        .from("event_images")
        .upload(`public/${fileName}`, formData.value.photo);

      if (error) throw error;
      photoPath = data.path;
    } else if (isEditMode.value) {
      photoPath = props.event.photo;
    }

    const eventData = {
      ...formData.value,
      photo: photoPath,
      created_at: new Date().toISOString(),
    };

    if (isEditMode.value) {
      await eventStore.updateEvent(props.event.id, eventData);
      console.log("Event updated successfully");
    } else {
      await eventStore.addEvent(eventData);
      console.log("Event added successfully");
    }

    emits("closeModal");
  } catch (error) {
    console.error("Failed to save event:", error);
  } finally {
    isSaving.value = false;
  }
};

onMounted(async () => {
  if (props.venueid) {
    venueid.value = props.venueid;
  }

  if (isEditMode.value && props.event.venue_id) {
    const venues = await search(""); // Fetch all venues
    const venueDetails = await venueStore.fetchVenueDetails(props.event.venue_id);

    selected.value = venueDetails.venuename; // Set the dropdown to the selected venue
    venueid.value = venueDetails.id;
  }
});

watch(selected, (newValue) => {
  if (newValue && newValue.id) {
    venueid.value = parseInt(newValue.id, 10);
    formData.value.venue_id = parseInt(newValue.id, 10);
    formData.value.listingId = parseInt(newValue.id, 10);
  } else if (!isNaN(props.venueid)) {
    formData.value.venue_id = parseInt(props.venueid, 10);
    formData.value.listingId = parseInt(props.venueid, 10);
  } else {
    formData.value.venue_id = null;
    formData.value.listingId = null;
  }
});
</script>

<style scoped>
.spinner {
  border: 8px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
