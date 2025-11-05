// frontend/src/config.js
const isProduction = process.env.NODE_ENV === 'production';
const apiUrl = isProduction 
  ? `https://${process.env.REACT_APP_API_ID}.execute-api.${process.env.REACT_APP_REGION}.amazonaws.com/${process.env.REACT_APP_STAGE}`
  : 'http://localhost:3000'; // or your local development URL

export const API_ENDPOINT = apiUrl;