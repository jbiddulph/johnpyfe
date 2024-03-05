// store/venue.js
import { defineStore } from 'pinia'; // Import defineStore from 'pinia'

export const useVenueStore = defineStore({
  id: 'venue',
  state: () => ({
    venues: [],
    venue: {}
  }),
  actions: {
    async addVenue(newVenue) {
      console.log("newVenue: ", newVenue);
      try {
        this.venue = newVenue
        console.log('The Venue: ', JSON.stringify(newVenue));
        await fetch("http://127.0.0.1:8000/api/venues/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(newVenue)
        });
        console.log("Venue created successfully");
        await navigateTo({ path: '/' });
      } catch (error) {
        console.error("Error creating venue:", error);
      }
    },
    async fetchVenues() {
      try {
        const response = await fetch("http://localhost:8000/api/venues/all", {
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
        });
        const content = await response.json();
        this.venues = content;
      } catch (error) {
        console.error("Error fetching venue:", error);
      }
    },
    async fetchVenueDetails(id) {
      try {
        const response = await fetch(`http://localhost:8000/api/venues/${id}`, {
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error('Failed to fetch venue details');
        }
        const content = await response.json();
        return content;
      } catch (error) {
        console.error("Error fetching venue details:", error);
        throw error;
      }
    },
    async editVenue(id, data) {
      try {
        console.log("The ID IS: ", id)
        await fetch(`http://localhost:8000/api/venues/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data),
        });
        console.log("Venue saved successfully");
        await navigateTo({ path: '/' });
      } catch (error) {
        console.error("Error saving venue details:", error);
        throw error;
      }
    },
    async logoutUser() {
      try {
        await fetch("http://localhost:8000/api/logout", {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          credentials: "include",  
        });
        this.user = null;
        await navigateTo({ path: '/login' });
      } catch (error) {
        console.error("Error logging out user:", error);
      }
    }
  }  
});