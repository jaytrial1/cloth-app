# Virtual Clothing Try-On App

A simple web application that allows users to:
1. Select a model by gender and age group
2. Upload clothing images (upper and lower garments)
3. Generate an image of the selected model wearing the uploaded clothes using Gemini AI

## Features

- Select models by gender and age group
- Upload upper and lower garment images
- Preview selections before generating the final image
- Generate AI-created images using Google's Gemini API

## How to Use

1. Open `index.html` in a web browser
2. Select a gender and age group for the model
3. Click on a model from the displayed options
4. Upload at least one garment image (upper and/or lower)
5. Click the "Generate Image" button
6. Wait for the AI to generate the final image

## Directory Structure

- `img/models/` - Contains model images organized by gender and age group
  - `male/` - Male models subfolder with age group categories
  - `female/` - Female models subfolder with age group categories
- `index.html` - Main application HTML
- `styles.css` - Application styling
- `script.js` - Application functionality

## Requirements

- Modern web browser with JavaScript enabled
- Internet connection (for API calls)

## Note About the API Key

The application uses a Google Gemini API key. For security reasons, in a production environment, you should:
1. Store API keys in environment variables
2. Implement backend API proxying
3. Add rate limiting to prevent excessive API usage

## License

This project is for demonstration purposes only. 