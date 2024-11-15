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
      try {
        let requestBody;
    
        // Handle FormData or plain objects
        if (newEvent instanceof FormData) {
          requestBody = {};
          newEvent.forEach((value, key) => {
            requestBody[key] = value;
          });
        } else {
          requestBody = { ...newEvent }; // Clone the object to avoid mutation
        }
    
        // Ensure `venue_id` is a valid number
        if (requestBody.venue_id) {
          requestBody.venue_id = parseInt(requestBody.venue_id, 10);
        }
    
        // Ensure `listingId` is also a valid number, if present
        if (requestBody.listingId) {
          requestBody.listingId = parseInt(requestBody.listingId, 10);
        }
    
        console.log("Request Body for Add Event:", requestBody);
    
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/events/add/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
    
        if (!response.ok) {
          const errorDetails = await response.json();
          console.error("Error creating event:", errorDetails);
          throw new Error(`Failed to create event: ${response.statusText}`);
        }
    
        console.log("Event created successfully");
        await navigateTo({ path: "/events" });
      } catch (error) {
        console.error("Error creating event:", error);
      }
    },
    async updateEvent(eventId, eventData) {
      try {
        let requestBody;
    
        if (eventData instanceof FormData) {
          requestBody = {};
          eventData.forEach((value, key) => {
            requestBody[key] = value;
          });
        } else {
          requestBody = { ...eventData };
        }
    
        // Ensure numeric fields
        requestBody.id = parseInt(eventId, 10);
        if (requestBody.venue_id) {
          requestBody.venue_id = parseInt(requestBody.venue_id, 10);
        }
        if (requestBody.listingId) {
          requestBody.listingId = parseInt(requestBody.listingId, 10);
        }
    
        console.log("Request Body for Update Event:", requestBody);
    
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/events/edit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
    
        if (!response.ok) {
          const errorDetails = await response.json();
          console.error("Error updating event:", errorDetails);
          throw new Error(`Failed to update event: ${response.statusText}`);
        }
    
        console.log("Event updated successfully");
        await navigateTo({ path: "/events" });
      } catch (error) {
        console.error("Error updating event:", error);
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
