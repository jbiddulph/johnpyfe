// store/venue.js
import { defineStore } from 'pinia'; // Import defineStore from 'pinia'

export const useNoteStore = defineStore({
  id: 'note',
  state: () => ({
    notes: [],
    note: {},
    successMsg: "",
    errorMsg: ""
  }),
  actions: {
    async addVenueNote(userId, venueId, note) {
      this.successMsg = ""
      this.errorMsg = ""
      console.log("userId: ", userId)
      console.log("venueId: ", venueId)
      console.log("note: ", note)
      try {
        const requestData = {
          user_id: userId.toString(),
          venue_id: venueId,
          text: note,
          created_at: new Date(),
          listingId: venueId,
        };
        // const BASE_URL = useRuntimeConfig().public.apiURL;
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/notes/venue`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });
        
        if (response.ok) {
          console.log("Note added successfully");
          this.successMsg = "Note added successfully!"
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
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/notes/venue/${venueId}/`, {
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