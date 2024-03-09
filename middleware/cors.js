import cors from 'cors';

// Configure CORS middleware
export default cors({
  origin: 'http://127.0.0.1:3000', // Allow requests from your frontend application
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific HTTP methods
  allowedHeaders: ['Content-Type'], // Allow specific headers
});