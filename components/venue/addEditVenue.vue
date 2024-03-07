<template>
  <div class="modal-content">
    <h1 class="text-2xl mb-4">{{ editing ? 'Edit Venue' : 'Add Venue' }}</h1>
    <form @submit.prevent="submitVenue" enctype="multipart/form-data">
      <div>
        <label for="Name">Name</label>
        <UInput v-model="venue.venuename" label="Venue Name" name="venuename" required />
      </div>
      <div>
        <label for="Name">Type</label>
        <USelect v-model="venue.venuetype" :options="types" name="venuetype" />
      </div>
      <div>
        <label for="Name">Address</label>
        <UInput v-model="venue.address" label="Address" name="venueaddress" />
      </div>
      <div>
        <label for="Name">Town</label>
        <UInput v-model="venue.town" label="Town" name="town" />
      </div>
      <div>
        <label for="Name">County</label>
        <UInput v-model="venue.county" label="County" name="county" />
      </div>
      <div>
        <label for="Name">Post Code</label>
        <UInput v-model="venue.postcode" label="Postcode" name="postcode" />
      </div>
      <!-- <div>
        <label for="Name">Photo</label>
        <UInput v-model="venue.photo" @change="onFileChange" type="file" size="sm" label="Photo" name="photo" />
      </div> -->
      <UButton type="submit">{{ editing ? 'Save Changes' : 'Add Venue' }}</UButton>
    </form>
  </div>
</template>
<script setup>
import { useVenueStore } from "@/store/venue.js";
const venueStore = useVenueStore();
const props = defineProps({
  editing: Boolean,
  venueid: Number
})
const emits = defineEmits(['closeModal']);
const types = ['pub', 'restaurant', 'cafe', 'bar'];
const venue = ref({
  venuename: '',
  slug: '',
  venuetype: 'pub',
  address: '',
  town: '',
  county: '',
  postcode: '',
  photo: null, // Initialize photo property as null
  created_at: '',
  updated_at: ''
});
// Fetch venue details if in edit mode
onMounted(async () => {
  if (props.editing && props.venueid > 0) {
    try {
      const venueDetails = await venueStore.fetchVenueDetails(props.venueid);
      if (venueDetails) {
        venue.value = venueDetails;
      } else {
        console.error("Failed to fetch venue details: Venue details are null or undefined.");
      }
    } catch (error) {
      console.error("Error fetching venue details:", error);
    }
  }
});


const submitVenue = async () => {
  try {
    event.preventDefault();
    console.log("Selected photo:", venue.value.photo); // Add this line
    const formData = new FormData();
    formData.append('venuename', venue.value.venuename);
    formData.append('slug', generateSlug(venue.value.venuename));
    formData.append('venuetype', venue.value.venuetype);
    formData.append('address', venue.value.address);
    formData.append('town', venue.value.town);
    formData.append('county', venue.value.county);
    formData.append('postcode', venue.value.postcode);
    formData.append('created_at', new Date().toISOString());
    formData.append('updated_at', new Date().toISOString());

    console.log("FormData:", formData); // Check FormData object before sending
    const venueData = {};
    const formDataEntries = [...formData.entries()];
    for (const [key, value] of formDataEntries) {
      // if (value instanceof File && key === "photo") {
      //   venueData[key] = value;
      // } else {
      // Map the key names to match the structure of the venue object
      switch (key) {
        case 'venuename':
        case 'slug':
        case 'venuetype':
        case 'address':
        case 'town':
        case 'county':
        case 'postcode':
        case 'created_at':
        case 'updated_at':
          venueData[key] = value.toString();
          break;
        default:
          break; // Handle other keys as needed
      }
      // }
    }
    if (props.venueid !== null) {
      venueData.id = props.venueid; // Add venueId to the venueData if it's available
      console.log("venue Data: ", venueData);
      await venueStore.editVenue(venueData.id, venueData); // Pass formData to addVenue function
      console.log("Venue edited successfully:", venueData);
      emits('closeModal');
    } else {
      await venueStore.addVenue(venueData); // Pass formData to addVenue function
      console.log("Venue added successfully:", venueData);
      emits('closeModal');
    }

  } catch (error) {
    console.error("Error adding venue:", error);
  }
  return false
};
const generateSlug = (venueName) => {
  let slug = venueName.toLowerCase().replace(/\s+/g, '-');
  slug = slug.replace(/[^\w-]+/g, '');
  return slug;
};

// const onFileChange = (event) => {
//   const file = event.target.files[0];
//   console.log("file: ", file);
//   venue.photo = file;
// };
</script>

<style scoped>
.modal-content {
  min-height: 600px; /* Example max height for scrollbar */
  overflow-y: auto; /* Enable vertical scrollbar if content exceeds max height */
  padding: 20px; /* Example padding */
}
form div {
  flex-direction: column;
  display: flex;
  margin-bottom: 10px;
}
</style>