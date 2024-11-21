// store/venue.js
import { defineStore } from 'pinia'; // Import defineStore from 'pinia'

export const useVenueStore = defineStore({
  id: 'venue',
  state: () => ({
    venues: [],
    towns: [],
    counties: [],
    names: [],
    venue: {}
  }),
  actions: {
    async addVenue(newVenue) {
      console.log("newVenue: ", newVenue);
      try {
        this.venue = newVenue
        console.log('The Venue: ', JSON.stringify(newVenue));
        // const BASE_URL = useRuntimeConfig().public.apiURL;
        await fetch(`${useRuntimeConfig().public.baseURL}/api/venues/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(newVenue)
        });
        console.log("Venue created successfully");
        await navigateTo({ path: '/venues' });
      } catch (error) {
        console.error("Error creating venue:", error);
      }
    },
    // async fetchVenues() {
    //   try {
    //     const BASE_URL = useRuntimeConfig().public.apiURL;
    //     const response = await fetch(BASE_URL+"/api/venues/all", {
    //       headers: {
    //         "Content-Type": "application/json"
    //       },
    //       credentials: "include",
    //     });
    //     const content = await response.json();
    //     this.venues = content;
    //   } catch (error) {
    //     console.error("Error fetching venue:", error);
    //   }
    // },
    async fetchTowns() {
      try {
        // const BASE_URL = useRuntimeConfig().public.apiURL;
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/venues/towns`, {
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
        });
        const content = await response.json();
        this.towns = content;
      } catch (error) {
        console.error("Error fetching towns:", error);
      }
    },
    async fetchCounties() {
      try {
        // const BASE_URL = useRuntimeConfig().public.apiURL;
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/venues/counties`, {
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
        });
        const content = await response.json();
        this.counties = content;
      } catch (error) {
        console.error("Error fetching counties:", error);
      }
    },
    async fetchNames(order) {
      try {
        // const order = "-venue_count"
        // const BASE_URL = useRuntimeConfig().public.apiURL;
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/venues/names?ordering=${order}`, {
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
        });
        const content = await response.json();
        this.names = content;
      } catch (error) {
        console.error("Error fetching counties:", error);
      }
    },
    async fetchVenueDetails(id) {
      try {
        // const BASE_URL = useRuntimeConfig().public.apiURL;
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/venues/${id}`, {
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error('Failed to fetch venue details');
        }
        const content = await response.json();
        this.venue = content;
        return content;
      } catch (error) {
        console.error("Error fetching venue details:", error);
        throw error;
      }
    },
    async fetchVenueFSADetails(fsa_id) {
      try {
        // const BASE_URL = useRuntimeConfig().public.apiURL;
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/venues/fsa/${fsa_id}`, {
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error('Failed to fetch venue details');
        }
        console.log("response: ", response);
        const content = await response.json();
        this.venue = content;
        return content;
      } catch (error) {
        console.error("Error fetching venue details:", error);
        throw error;
      }
    },
    async editVenueCoords(id, data) {
      try {
        console.log("Editing ID IS: ", id)
        // const BASE_URL = useRuntimeConfig().public.apiURL;
        await fetch(`${useRuntimeConfig().public.baseURL}/api/venues/coords/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data),
        });
        console.log("Venue saved successfully");
        await navigateTo({ path: '/venues' });
      } catch (error) {
        console.error("Error saving venue details:", error);
        throw error;
      }
    },
    async deleteVenue(id) {
      console.log("deleting: ", id);
      try {
        // const BASE_URL = useRuntimeConfig().public.apiURL;
        await fetch(`${useRuntimeConfig().public.baseURL}/api/venues/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });
        console.log("Venue deleted successfully");
        await navigateTo({ path: '/venues' });
      } catch (error) {
        console.error("Error creating venue:", error);
      }
    }
  }  
});