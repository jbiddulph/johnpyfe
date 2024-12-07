// store/event.js
import { defineStore } from 'pinia'; // Import defineStore from 'pinia'

export const useEventStore = defineStore({
  id: 'event',
  state: () => ({
    events: [],
    event: {},
    cities: [],
    categories: [],
    venues: [],
    towns: [],
    currentPage: 1,
    totalPages: 1,
    paginatedEvents: [],
    itemsPerPage: 104,
    totalItems: 0,
    PAGE_SIZE: 104
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
        this.fetchAllEvents();
        // await navigateTo({ path: "/events" });
      } catch (error) {
        console.error("Error updating event:", error);
      }
    },
    async fetchCities() {
      try {
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/cities`);
        const data = await response.json();
        if (Array.isArray(data)) {
          this.cities = data;
        } else {
          console.error("Unexpected data format:", data);
          this.cities = []; // Assign an empty array to avoid further errors
        }
      } catch (error) {
        console.error('Error loading events:', error);
        this.cities = [];
      }
    },
    async fetchCategories() {
      try {
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/categories`);
        const data = await response.json();
        if (Array.isArray(data)) {
          this.categories = data;
        } else {
          console.error("Unexpected data format:", data);
          this.categories = []; // Assign an empty array to avoid further errors
        }
      } catch (error) {
        console.error('Error loading events:', error);
        this.cities = [];
      }
    },
    async fetchAllEvents() {
      try {
        const skip = (this.currentPage - 1) * this.itemsPerPage;
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/events?skip=${skip}&take=${this.itemsPerPage}`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
          this.events = data;
        } else {
          console.error("Unexpected data format:", data);
          this.events = []; // Assign an empty array to avoid further errors
        }
    
        console.log("events.value: ", this.events);
        this.totalItems = data.length;
        const totalPagesCount = Math.ceil(this.totalItems / this.itemsPerPage);
        this.totalPages = this.totalPagesCount;
      } catch (error) {
        console.error('Error loading events:', error);
        this.events = []; // Assign an empty array on error
      }
    },
    async fetchAllEventsTopten() {
      try {
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/events/top-ten`);
        const data = await response.json();
    
        if (data.limitedVenues && data.limitedTowns) {
          this.venues = data.limitedVenues;  // Store the venues data
          this.towns = data.limitedTowns;    // Store the towns data
        } else {
          console.error("Unexpected data format:", data);
          this.venues = [];
          this.towns = [];
        }
      } catch (error) {
        console.error('Error loading events:', error);
        this.venues = [];
        this.towns = [];
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
    async fetchEventDetails(eventId) {
      try {
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/api/events/${eventId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Failed to fetch event details:", error);
        throw error;
      }
    },
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
