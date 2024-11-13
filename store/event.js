// store/event.js
import { defineStore } from 'pinia'; // Import defineStore from 'pinia'

export const useEventStore = defineStore({
  id: 'event',
  state: () => ({
    events: [],
    event: {}
  }),
  actions: {
    async addEvent(newEvent) {
      // console.log("VenueID: ", venueID);
      try {
        let requestBody;
        if (newEvent instanceof FormData) {
          requestBody = {};
          newEvent.forEach((value, key) => {
            requestBody[key] = value;
          });
        } else {
          requestBody = newEvent;
        }
        
        // Ensure venueID is a number
        // const venueIdNumber = parseInt(venueID);
        // if (isNaN(venueIdNumber)) {
        //   throw new Error("venueID must be a number");
        // }

        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/events/add/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
        
        console.log("response: ", response);
        console.log("Event created successfully");
        await navigateTo({ path: '/events' });
      } catch (error) {
        console.error("Error creating event:", error);
      }
    },
    async fetchVenueEvents(id) {
      try {
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/events/venue/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          }
        });
        const content = await response.json();
        console.log("events: ", content);
        return content;
      } catch (error) {
        console.error("Error fetching event:", error);
      }
    },
    // async fetchAllEvents() {
    //   try {
    //     const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/events/all/`, {
    //       headers: {
    //         "Content-Type": "application/json",
    //         "Accept": "application/json",
    //       }
    //     });
    //     const content = await response.json();
    //     this.events = content;
    //   } catch (error) {
    //     console.error("Error fetching event:", error);
    //   }
    // },
    async deleteEvent(id) {
      try {
        await fetch(`${useRuntimeConfig().public.baseURL}/api/events/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });
        console.log("Event deleted successfully");
        // fetchAllEvents();
        await navigateTo({ path: '/events' });
      } catch (error) {
        console.error("Error deleting event:", error);
      }
    }
  }  
});
