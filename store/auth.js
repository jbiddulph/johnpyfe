// store/auth.js
import { defineStore } from 'pinia'; // Import defineStore from 'pinia'

export const useAuthStore = defineStore({
  id: 'auth',
  state: () => ({
    user: {}
  }),
  actions: {
    async submit({ name, email, password }) {
      try {
        await fetch("http://localhost:8000/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name, email, password })
        });
        console.log("User registered successfully");
        await navigateTo({ path: '/login' });
      } catch (error) {
        console.error("Error registering user:", error);
      }
    },
    async login({ email, password }) {
      try {
        await fetch("http://localhost:8000/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ email, password })
        });
        console.log("User logged in successfully");
        await this.fetchUser(); // Update user object after login
        await navigateTo({ path: '/' });
      } catch (error) {
        console.error("Error logging in user:", error);
      }
    },
    async fetchUser() {
      try {
        const response = await fetch("http://localhost:8000/api/user", {
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
        });
        const content = await response.json();
        this.user = content;
      } catch (error) {
        console.error("Error fetching user:", error);
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