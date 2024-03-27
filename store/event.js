// store/event.js
import { defineStore } from 'pinia'; // Import defineStore from 'pinia'

export const useEventStore = defineStore({
  id: 'event',
  state: () => ({
    events: [],
    // towns: [],
    // counties: [],
    // names: [],
    event: {}
  }),
  actions: {
    async addEvent(newEvent, venueID) {
      console.log("newEvent: ", newEvent);
      try {
        const token = localStorage.getItem("userToken");
        console.log('The Event: ', JSON.stringify(newEvent));
        const BASE_URL = useRuntimeConfig().public.apiURL;
        const response = await fetch(BASE_URL+`/api/events/venue/${venueID}/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Token ${token}`,
          },
          body: JSON.stringify(newEvent)
        });
        console.log("response: ", response);
        console.log("Event created successfully");
        await navigateTo({ path: '/venues' });
      } catch (error) {
        console.error("Error creating event:", error);
      }
    },
    async fetchAllEvents() {
      try {
        const token = localStorage.getItem("userToken");
        const BASE_URL = useRuntimeConfig().public.apiURL;
        const response = await fetch(BASE_URL+"/api/events/all/", {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Token ${token}`,
          }
        });
        const content = await response.json();
        this.events = content;
      } catch (error) {
        console.error("Error fetching event:", error);
      }
    },
    // async fetchEventDetails(id) {
    //   try {
    //     const BASE_URL = useRuntimeConfig().public.apiURL;
    //     const response = await fetch(BASE_URL+`/api/events/${id}`, {
    //       headers: {
    //         "Content-Type": "application/json"
    //       },
    //       credentials: "include",
    //     });
    //     if (!response.ok) {
    //       throw new Error('Failed to fetch event details');
    //     }
    //     console.log("response: ", response);
    //     const content = await response.json();
    //     this.event = content;
    //     return content;
    //   } catch (error) {
    //     console.error("Error fetching event details:", error);
    //     throw error;
    //   }
    // },
    // async editEvent(id, data) {
    //   try {
    //     console.log("The ID IS: ", id)
    //     const BASE_URL = useRuntimeConfig().public.apiURL;
    //     await fetch(BASE_URL+`/api/events/${id}`, {
    //       method: "PUT",
    //       headers: {
    //         "Content-Type": "application/json"
    //       },
    //       body: JSON.stringify(data),
    //     });
    //     console.log("Event saved successfully");
    //     await navigateTo({ path: '/venues' });
    //   } catch (error) {
    //     console.error("Error saving event details:", error);
    //     throw error;
    //   }
    // },
    // async deleteEvent(id) {
    //   console.log("deleting: ", id);
    //   try {
    //     const BASE_URL = useRuntimeConfig().public.apiURL;
    //     await fetch(BASE_URL+`/api/events/${id}`, {
    //       method: "DELETE",
    //       headers: {
    //         "Content-Type": "application/json",
    //       },
    //     });
    //     console.log("Event deleted successfully");
    //     await navigateTo({ path: '/events' });
    //   } catch (error) {
    //     console.error("Error creating event:", error);
    //   }
    // }
  }  
});