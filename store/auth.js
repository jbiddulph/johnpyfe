// store/auth.js
import { defineStore } from 'pinia'; // Import defineStore from 'pinia'
import Cookies from "js-cookie";

export const useAuthStore = defineStore({
  id: 'auth',
  state: () => ({
    user: {}
  }),
  actions: {
    async signup({ username, email, password }) {
      try {
        // const BASE_URL = useRuntimeConfig().public.apiURL;
        await fetch(`${useRuntimeConfig().public.baseURL}/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ username, email, password })
        });
        console.log("User registered successfully");
        await navigateTo({ path: '/login' });
      } catch (error) {
        console.error("Error registering user:", error);
      }
    },
    async login({ username, password }) {
      try {
        // const BASE_URL = useRuntimeConfig().public.apiURL;
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ username, password })
        });
        // Parse and log the response body as JSON
        const content = await response.json();
        console.log('check entire response object: ', content);
        localStorage.setItem("userToken", content.token);
        console.log("User logged in successfully");
        Cookies.set('userToken', content.token);
        // Update user object after login
        await this.fetchUser();
        await navigateTo({ path: '/' });
      } catch (error) {
        console.error("Error logging in user:", error);
      }
    },
    async fetchUser() {
      try {
        // const token = localStorage.getItem("userToken");
        const token = Cookies.get('userToken');
        // const csrfToken = useCookie("csrftoken");
        // const BASE_URL = useRuntimeConfig().public.apiURL;
        const response = await fetch(`${useRuntimeConfig().public.baseURL}/get_user`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${token}`,
            // "X-CSRFToken": csrfToken
          },
          // credentials: "include",
        });
        const content = await response.json();
        console.log("Content: ", content);
        this.user = content;
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    },    
    async logoutUser() {
      try {
        console.log("here I am logging out");
        const token = localStorage.getItem("userToken");
        Cookies.remove('userToken');
        const csrfToken = useCookie("csrftoken");
        // const BASE_URL = useRuntimeConfig().public.apiURL;
        await fetch(`${useRuntimeConfig().public.baseURL}/logout`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            "Authorization": `Token ${token}`,
            "X-CSRFToken": csrfToken
          },
          credentials: "include",  
        });
        this.user = null;
        localStorage.removeItem("userToken");
        await navigateTo({ path: '/login' });
      } catch (error) {
        console.error("Error logging out user:", error);
      }
    }
  }  
});