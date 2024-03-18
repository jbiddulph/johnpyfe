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
      try {
        const token = localStorage.getItem("userToken");
        const csrfToken = useCookie("csrftoken");
        const requestData = {
          user: userId,
          venue: venueId,
          text: note
        };
    
        const response = await fetch(`http://127.0.0.1:8000/api/notes/venue/${venueId}/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${token}`,
            "X-CSRFToken": csrfToken
          },
          credentials: "include",
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
    }    
  }  
});