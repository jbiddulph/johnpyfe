// store/venue.js
import { defineStore } from 'pinia'; // Import defineStore from 'pinia'

export const useNoteStore = defineStore({
  id: 'note',
  state: () => ({
    notes: [],
    note: {}
  }),
  actions: {
    async addVenueNote(userId, venueId, note) {
      console.log("userId: ", userId)
      try {
        const requestData = {
          user_id: userId.toString(),
          venue_id: venueId,
          text: note,
          created_at: new Date(),
          listingId: venueId,
        };
        console.log("request data: ", requestData);
        // const BASE_URL = useRuntimeConfig().public.apiURL;
        // const response = await fetch(BASE_URL+`/api/notes/venue/${venueId}/`, {
        const response = await fetch(`http://lookwhatfound.me:3000/api/notes/venue`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });
    
        if (response.ok) {
          console.log("Note added successfully");
          await navigateTo({ path: '/venues' });
        } else {
          // Handle the case when the server returns an error response
          const errorMessage = await response.text();
          throw new Error(`Failed to add note: ${errorMessage}`);
        }
      } catch (error) {
        console.error("Error adding note for venue:", error);
      }
    },
    async getVenueNotes(venueId) {
      try {
        const token = localStorage.getItem("userToken");
        const csrfToken = useCookie("csrftoken");
        // const BASE_URL = useRuntimeConfig().public.apiURL;
        // const response = await fetch(BASE_URL+`/api/notes/venue/${venueId}/`, {
        const response = await fetch(`http://lookwhatfound.me:3000/api/notes/venue/${venueId}/`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${token}`,
            "X-CSRFToken": csrfToken
          },
          credentials: "include",
        });
        const content = await response.json();
        this.notes = content;
      } catch (error) {
        console.error("Error adding note for venue:", error);
      }
    }    
  }  
});