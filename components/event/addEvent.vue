<template>
  <div>
    <h3>Add Event</h3>
    <form @submit.prevent="submitForm" enctype="multipart/form-data">
      <div>
        <UInput v-model="formData.venue" type="hidden" id="venue" required disabled />
      </div>
      <div>
        <UInput v-model="formData.userId" type="hidden" id="user" name="user" required disabled />
      </div>
      <div>
        <label for="event">Event Name:</label>
        {{ formData.event }}
        <UInput v-model="formData.event" type="text" id="event" name="event" required />
      </div>  
      <div>
        <label for="description">Description:</label><br />
        {{ formData.description }}
        <UTextarea v-model="formData.description" id="description" name="description" rows="4" cols="50"></UTextarea>
      </div>
      <div>
        <label for="cost">Cost:</label>
        {{ formData.cost }}
        <UInput v-model="formData.cost" type="text" id="cost" name="cost" step="0.01" required />
      </div>
      <div>
        <label for="duration">Duration (in minutes):</label>
        {{ formData.duration }}
        <UInput v-model="formData.duration" type="text" id="duration" name="duration" required />
      </div>
      <div>
        <label for="event_date">Event Date:</label>
        {{ formData.event_date }}
        <!-- <UInput v-model="formData.event_date" type="text" id="event_date" name="event_date" required /> -->
        <UInput v-model="formattedEventDate" type="date" id="event_date" name="event_date" required />
      </div>
      <div>
        <label for="time_start">Start Time:</label>
        {{ formData.time_start }}
        <UInput v-model="formData.time_start" type="time" id="time_start" name="time_start" required />
      </div>
      <div>
        <label for="time_end">End Time:</label>
        {{ formData.time_end }}
        <UInput v-model="formData.time_end" type="time" id="time_end" name="time_end" required />
      </div>
      <div>
        <label for="category">Category:</label>
        {{ formData.category }}
        <UInput v-model="formData.category" type="text" id="category" name="category" />
      </div>
      <div>
        <label for="photo">Photo URL:</label>
        {{ formData.photo }}
        <!-- <u-input v-model="formData.photo" id="photo" name="photo" type="file" /> -->
        <UInput v-model="formData.photo" type="file" id="photo" name="photo" accept="image/*" @change="handleFileUpload" />
      </div>
      <div>
        <label for="website">Website URL:</label>
        {{ formData.website }}
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
const formData = ref({
  venue: props.venueid,
  userId: authStore.user.id,
  event: null,
  description: null,
  cost: null,
  duration: null,
  event_date: null,
  time_start: null,
  time_end: null,
  category: null,
  photo: null,
  website: null,
});
// const handleFileUpload = (event: { target: { files: any[]; }; }) => {
//   const file = event.target.files[0];
//   formData.value.photo = file;
// };
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  formData.photo = file;
};
const submitForm = async () => {
  try {
    console.log("formattedEventDate: ", formattedEventDate);

    const formDataObj = new FormData();

    // Append form fields to FormData
    formDataObj.append('venue', props.venueid);
    formDataObj.append('userId', authStore.user.id);
    formDataObj.append('event', formData.event);
    formDataObj.append('description', formData.description);
    formDataObj.append('cost', formData.cost);
    formDataObj.append('duration', formData.duration);
    formDataObj.append('event_date', formattedEventDate.value);
    formDataObj.append('time_start', formData.time_start);
    formDataObj.append('time_end', formData.time_end);
    formDataObj.append('category', formData.category);
    formDataObj.append('website', formData.website);
    
    // Append file to FormData
    formDataObj.append('photo', formData.photo);
    // formDataObj.append('photo', formData.value.photo);

    await eventStore.addEvent(formDataObj, props.venueid); // Pass formDataObj to addEvent function
    // console.log("Event added successfully:", formDataObj);
    console.log("Formatted Event Date:", formattedEventDate.value);
    emits('closeModal');
    console.log(formDataObj.get('event_date'))
    console.log("form: ", formDataObj);
    console.log("form data: ", formData);
  } catch (error) {
    console.log("error: ", error);
  }
};
const formattedEventDate = computed(() => {
  // Check if formData.event_date is defined and not null
  console.log("formData.event_date:", formData.event_date); // Log the value of formData.event_date
  if (formData.event_date != null) {
    // Assuming formData.event_date is in "dd/mm/yyyy" format
    const dateParts = formData.event_date.split('/');
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
    // Handle case where formData.event_date is undefined or null
    return '';
  }
});

</script>

<style scoped>

</style>