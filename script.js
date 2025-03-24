// API Key for Gemini
const API_KEY = "AIzaSyDlg5kB5m8lEQS1-vtfMNZJAfuQ0MsZLoQ";

// Add image cache after API key declaration
const imageCache = new Map();
let preloadedGender = null;
let preloadedAgeGroup = null;

// DOM Elements - using window.onload to ensure elements are available
let genderSelect, ageSelect, modelsContainer, upperGarmentInput, lowerGarmentInput, 
    upperPreview, lowerPreview, selectedModel, selectedUpper, selectedLower, 
    generateBtn, loadingSpinner, resultContainer, generatedImage, stepIndicators;

// Initialize DOM elements
function initDOMElements() {
    genderSelect = document.getElementById('gender-select');
    ageSelect = document.getElementById('age-select');
    modelsContainer = document.getElementById('models-container');
    upperGarmentInput = document.getElementById('upper-garment');
    lowerGarmentInput = document.getElementById('lower-garment');
    upperPreview = document.getElementById('upper-preview');
    lowerPreview = document.getElementById('lower-preview');
    selectedModel = document.getElementById('selected-model');
    selectedUpper = document.getElementById('selected-upper');
    selectedLower = document.getElementById('selected-lower');
    generateBtn = document.getElementById('generate-btn');
    loadingSpinner = document.getElementById('loading');
    resultContainer = document.getElementById('result-container');
    generatedImage = document.getElementById('generated-image');
    stepIndicators = document.querySelectorAll('.step');
    
    // Log any missing elements
    console.log('DOM Elements initialized:', {
        genderSelect, ageSelect, modelsContainer, upperGarmentInput, lowerGarmentInput,
        upperPreview, lowerPreview, selectedModel, selectedUpper, selectedLower,
        generateBtn, loadingSpinner, resultContainer, generatedImage, stepIndicators
    });
}

// Age groups by gender
const ageGroups = {
    male: ['young-adult', 'adult', 'middle-aged', 'senior'],
    female: ['young-adult', 'adult', 'middle-aged', 'senior']
};

// State variables
let selectedModelData = null;
let upperGarmentFile = null;
let lowerGarmentFile = null;

// Initialize event listeners
function initApp() {
    console.log('Initializing app - setting up event listeners');
    
    try {
        // Make sure DOM elements exist
        if (!genderSelect) console.error('genderSelect element not found');
        if (!ageSelect) console.error('ageSelect element not found');
        if (!modelsContainer) console.error('modelsContainer element not found');
        
        genderSelect.addEventListener('change', handleGenderChange);
        ageSelect.addEventListener('change', loadModels);
        upperGarmentInput.addEventListener('change', handleUpperGarmentChange);
        lowerGarmentInput.addEventListener('change', handleLowerGarmentChange);
        generateBtn.addEventListener('click', generateImage);
        
        // Check if generate button should be enabled
        checkGenerateButtonState();
        
        console.log('App initialization complete');
    } catch (error) {
        console.error('Error during app initialization:', error);
    }
}

// Handle gender selection
function handleGenderChange() {
    const gender = genderSelect.value;
    
    // Reset age select
    ageSelect.innerHTML = '<option value="">Select Age Group</option>';
    
    if (gender) {
        // Enable age select and populate options
        ageSelect.disabled = false;
        
        ageGroups[gender].forEach(age => {
            const option = document.createElement('option');
            option.value = age;
            option.textContent = formatAgeGroup(age);
            ageSelect.appendChild(option);
            
            // Preload images for this gender and age group
            preloadModels(gender, age);
        });
    } else {
        // Disable age select if no gender selected
        ageSelect.disabled = true;
    }
    
    // Clear models container
    modelsContainer.innerHTML = '';
    selectedModelData = null;
    updateSelectedModelPreview();
    checkGenerateButtonState();
    updateStepIndicators();
}

// Format age group for display
function formatAgeGroup(ageGroup) {
    return ageGroup.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Load models based on gender and age selection
function loadModels() {
    console.log("loadModels called");
    const gender = genderSelect.value;
    const ageGroup = ageSelect.value;
    
    if (!gender || !ageGroup) {
        modelsContainer.innerHTML = '';
        return;
    }
    
    console.log(`Loading models for ${gender}/${ageGroup}`);
    modelsContainer.innerHTML = '<p>Loading models...</p>';
    
    // Load models from directory
    fetchModels(gender, ageGroup)
        .then(models => {
            console.log(`Fetched ${models.length} models`);
            if (models.length === 0) {
                modelsContainer.innerHTML = '<p>No models found.</p>';
                return;
            }
            
            modelsContainer.innerHTML = '';
            
            models.forEach(model => {
                console.log(`Creating model item with path: ${model.path}`);
                const modelItem = document.createElement('div');
                modelItem.className = 'model-item';
                
                // Create image element with error handler
                const img = document.createElement('img');
                img.src = model.path;
                img.alt = "Model";
                
                // Add error handler for images
                img.onerror = function() {
                    console.warn(`Failed to load image: ${model.path}, using fallback`);
                    img.src = './img/model-placeholder.jpg';
                };
                
                modelItem.appendChild(img);
                
                modelItem.addEventListener('click', () => {
                    // Remove selected class from all models
                    document.querySelectorAll('.model-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    
                    // Add selected class to clicked model
                    modelItem.classList.add('selected');
                    
                    // Update selected model data
                    selectedModelData = model;
                    updateSelectedModelPreview();
                    checkGenerateButtonState();
                });
                
                modelsContainer.appendChild(modelItem);
            });
        })
        .catch(error => {
            console.error("Error loading models:", error);
            modelsContainer.innerHTML = `<p>Error loading models: ${error.message}</p>`;
        });
}

// Add preloading function
async function preloadModels(gender, ageGroup) {
    // Skip if already preloaded for this combination
    const cacheKey = `${gender}/${ageGroup}`;
    if (imageCache.has(cacheKey)) {
        return;
    }
    
    const basePath = `img/models/${gender}/${ageGroup}/`;
    const batchSize = 3; // Check images in small batches
    let currentIndex = 1;
    let foundImages = [];
    let shouldContinue = true;
    
    while (shouldContinue && currentIndex <= 30) {
        // Create a batch of promises (small number at a time)
        const batchPromises = [];
        for (let i = 0; i < batchSize && currentIndex <= 30; i++) {
            const path = `${basePath}${currentIndex}.jpg`;
            batchPromises.push(preloadImage(path, currentIndex, gender, ageGroup));
            currentIndex++;
        }
        
        try {
            // Process this small batch
            const batchResults = await Promise.all(batchPromises);
            const validResults = batchResults.filter(result => result !== null);
            
            // Add valid images to our collection
            foundImages = foundImages.concat(validResults);
            
            // If we didn't find any images in this batch, stop searching
            if (validResults.length === 0) {
                shouldContinue = false;
            }
        } catch (error) {
            console.error(`Error in batch preloading for ${cacheKey}:`, error);
            shouldContinue = false;
        }
    }
    
    // Sort and cache found images
    if (foundImages.length > 0) {
        foundImages.sort((a, b) => a.id - b.id);
        imageCache.set(cacheKey, foundImages);
        console.log(`Preloaded and cached ${foundImages.length} models for ${cacheKey}`);
    }
}

// Fetch models from directory - improved to use the cache and batch loading
async function fetchModels(gender, ageGroup) {
    const cacheKey = `${gender}/${ageGroup}`;
    console.log(`Fetching models from cache or loading for: ${cacheKey}`);
    
    try {
        // Check cache first
        if (imageCache.has(cacheKey)) {
            const cachedModels = imageCache.get(cacheKey);
            console.log(`Found ${cachedModels.length} cached models`);
            return cachedModels;
        }
        
        // If not in cache, load using batch loading
        const basePath = `img/models/${gender}/${ageGroup}/`;
        const batchSize = 3; // Check images in small batches
        let currentIndex = 1;
        let models = [];
        let shouldContinue = true;
        
        while (shouldContinue && currentIndex <= 30) {
            // Create a batch of promises (small number at a time)
            const batchPromises = [];
            for (let i = 0; i < batchSize && currentIndex <= 30; i++) {
                const path = `${basePath}${currentIndex}.jpg`;
                batchPromises.push(preloadImage(path, currentIndex, gender, ageGroup));
                currentIndex++;
            }
            
            // Process this small batch
            const batchResults = await Promise.all(batchPromises);
            const validResults = batchResults.filter(result => result !== null);
            
            // Add valid images to our collection
            models = models.concat(validResults);
            
            // If we didn't find any images in this batch, stop searching
            if (validResults.length === 0) {
                shouldContinue = false;
            }
        }
        
        // Sort and cache found images
        if (models.length > 0) {
            models.sort((a, b) => a.id - b.id);
            imageCache.set(cacheKey, models);
            console.log(`Loaded and cached ${models.length} models for ${cacheKey}`);
            return models;
        }
        
        // Return placeholder if no models found
        console.log('No models found, using placeholder');
        return [{
            id: 1,
            path: './img/model-placeholder.jpg',
            gender,
            ageGroup,
            name: `Sample ${gender.charAt(0).toUpperCase() + gender.slice(1)} ${formatAgeGroup(ageGroup)} Model`
        }];
        
    } catch (error) {
        console.error('Error loading models:', error);
        return [{
            id: 1,
            path: './img/model-placeholder.jpg',
            gender,
            ageGroup,
            name: `Sample ${gender.charAt(0).toUpperCase() + gender.slice(1)} ${formatAgeGroup(ageGroup)} Model`
        }];
    }
}

// Helper function to check if an image exists
function checkImageExists(path, index) {
    return new Promise((resolve) => {
        const img = new Image();
        
        img.onload = () => {
            const parts = path.split('/');
            const gender = parts[parts.length - 3];
            const ageGroup = parts[parts.length - 2];
            
            resolve({
                id: index,
                path,
                gender,
                ageGroup,
                name: `${gender.charAt(0).toUpperCase() + gender.slice(1)} ${formatAgeGroup(ageGroup)} Model ${index}`
            });
        };
        
        img.onerror = () => resolve(null);
        img.src = path;
    });
}

// Handle upper garment file selection
function handleUpperGarmentChange(event) {
    const file = event.target.files[0];
    if (!file) {
        upperPreview.innerHTML = '';
        upperGarmentFile = null;
        updateSelectedGarmentPreview('upper', null);
        checkGenerateButtonState();
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        upperPreview.innerHTML = `<img src="${e.target.result}" alt="Upper Garment">`;
        upperGarmentFile = {
            file,
            dataUrl: e.target.result
        };
        updateSelectedGarmentPreview('upper', e.target.result);
        checkGenerateButtonState();
        updateStepIndicators();
    };
    reader.readAsDataURL(file);
}

// Handle lower garment file selection
function handleLowerGarmentChange(event) {
    const file = event.target.files[0];
    if (!file) {
        lowerPreview.innerHTML = '';
        lowerGarmentFile = null;
        updateSelectedGarmentPreview('lower', null);
        checkGenerateButtonState();
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        lowerPreview.innerHTML = `<img src="${e.target.result}" alt="Lower Garment">`;
        lowerGarmentFile = {
            file,
            dataUrl: e.target.result
        };
        updateSelectedGarmentPreview('lower', e.target.result);
        checkGenerateButtonState();
        updateStepIndicators();
    };
    reader.readAsDataURL(file);
}

// Update selected model preview
function updateSelectedModelPreview() {
    if (selectedModelData) {
        const img = document.createElement('img');
        img.src = selectedModelData.path;
        img.alt = "Selected Model";
        
        // Add error handler for the image
        img.onerror = function() {
            console.warn(`Failed to load selected model image: ${selectedModelData.path}, using fallback`);
            img.src = './img/model-placeholder.jpg';
        };
        
        selectedModel.innerHTML = '';
        selectedModel.appendChild(img);
        
        // Update step indicators when model is selected
        updateStepIndicators();
    } else {
        selectedModel.innerHTML = '<p>No model selected</p>';
    }
}

// Update selected garment preview
function updateSelectedGarmentPreview(type, dataUrl) {
    const container = type === 'upper' ? selectedUpper : selectedLower;
    
    if (dataUrl) {
        container.innerHTML = `<img src="${dataUrl}" alt="${type === 'upper' ? 'Upper' : 'Lower'} Garment">`;
    } else {
        container.innerHTML = `<p>No ${type === 'upper' ? 'upper' : 'lower'} garment selected</p>`;
    }
}

// Check if generate button should be enabled
function checkGenerateButtonState() {
    // Enable button if model is selected and at least one garment is uploaded
    const hasModel = selectedModelData !== null;
    const hasGarment = upperGarmentFile !== null || lowerGarmentFile !== null;
    
    generateBtn.disabled = !(hasModel && hasGarment);
}

// Update step indicators based on user progress
function updateStepIndicators() {
    // Reset all steps to inactive
    stepIndicators.forEach(step => step.classList.remove('active'));
    
    // Step 1 is active if no model selected
    if (!selectedModelData) {
        stepIndicators[0].classList.add('active');
        return;
    }
    
    // Step 2 is active if model selected but no garments
    if (!upperGarmentFile && !lowerGarmentFile) {
        stepIndicators[1].classList.add('active');
        return;
    }
    
    // Step 3 is active if model and at least one garment selected
    stepIndicators[2].classList.add('active');
}

// Generate image using Gemini API
async function generateImage() {
    if (!selectedModelData || (!upperGarmentFile && !lowerGarmentFile)) {
        alert('Please select a model and at least one garment.');
        return;
    }
    
    // Show loading spinner
    loadingSpinner.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    
    try {
        // Prepare prompt with more context and clarity for safety filters
        let prompt = `make my image wear new cloth so i can test the new cloth.`;
        
        if (upperGarmentFile && lowerGarmentFile) {
            prompt += " The first reference image shows my image (used only for body dimensions and proportion reference), followed by the upper garment product, then the lower garment product to be visualized.";
        } else if (upperGarmentFile) {
            prompt += " The first reference image shows my image  (used only for body dimensions and proportion reference), followed by the upper garment product to be visualized.";
        } else if (lowerGarmentFile) {
            prompt += " The first reference image shows my image  (used only for body dimensions and proportion reference), followed by the lower garment product to be visualized.";
        }
        
        // Create parts array with all content
        const parts = [{ text: prompt }];
        
        // Add model image
        const modelImageBase64 = await getImageAsBase64(selectedModelData.path);
        parts.push({
            inlineData: {
                mimeType: "image/jpeg",
                data: modelImageBase64
            }
        });
        
        // Add garment images
        if (upperGarmentFile) {
            parts.push({
                inlineData: {
                    mimeType: upperGarmentFile.file.type,
                    data: upperGarmentFile.dataUrl.split(',')[1]
                }
            });
        }
        
        if (lowerGarmentFile) {
            parts.push({
                inlineData: {
                    mimeType: lowerGarmentFile.file.type,
                    data: lowerGarmentFile.dataUrl.split(',')[1]
                }
            });
        }
        
        // Prepare request body
        const requestBody = {
            contents: [
                {
                    role: "user",
                    parts: parts
                }
            ],
            generationConfig: {
                temperature: 1,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
                responseMimeType: "text/plain",
                responseModalities: [
                    "image",
                    "text"
                ]
            }
        };
        
        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            }
        );
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("API Response:", data);
        
        // Process response
        if (data.candidates && data.candidates.length > 0) {
            console.log("Response candidate:", data.candidates[0]);
            
            // Check for safety rejection
            if (data.candidates[0].finishReason === "IMAGE_SAFETY") {
                throw new Error("The image generation was rejected due to safety concerns. Please try different images that comply with Google's content policy.");
            }
            
            // Check for content structure
            if (data.candidates[0].content) {
                const content = data.candidates[0].content;
                console.log("Content structure:", content);
                
                // Look for parts array with inline data
                if (content.parts && content.parts.length > 0) {
                    console.log("Parts found:", content.parts);
                    
                    // Find any part with inline data
                    const imagePart = content.parts.find(part => part.inlineData);
                    
                    if (imagePart && imagePart.inlineData) {
                        // Display generated image
                        const imageData = imagePart.inlineData.data;
                        const mimeType = imagePart.inlineData.mimeType || 'image/jpeg';
                        const imageUrl = `data:${mimeType};base64,${imageData}`;
                        
                        generatedImage.innerHTML = `<img src="${imageUrl}" alt="Generated Image">`;
                        resultContainer.classList.remove('hidden');
                        return; // Success!
                    } else {
                        console.error("No inline data found in parts:", content.parts);
                    }
                } else {
                    console.error("No parts array found or empty parts:", content);
                }
            } else {
                console.error("No content field in candidate:", data.candidates[0]);
            }
            
            // Alternative approach: Try to extract text from content if available
            try {
                if (data.candidates[0].text) {
                    // Some APIs return direct text which might contain base64 image
                    const textContent = data.candidates[0].text;
                    if (textContent.includes('base64')) {
                        // Try to extract base64 image data
                        const base64Match = textContent.match(/data:image\/[^;]+;base64,([^"'\s]+)/);
                        if (base64Match && base64Match[1]) {
                            const imageUrl = `data:image/jpeg;base64,${base64Match[1]}`;
                            generatedImage.innerHTML = `<img src="${imageUrl}" alt="Generated Image">`;
                            resultContainer.classList.remove('hidden');
                            return; // Success!
                        }
                    }
                    console.error("Text content found but no image data:", textContent);
                }
                
                // Handle case where we get 'finishReason' status
                if (data.candidates[0].finishReason === "STOP") {
                    throw new Error("API generated a response but no image was included");
                }
            } catch (parseError) {
                console.error("Error parsing alternative format:", parseError);
            }
            
            throw new Error('Could not find image data in API response');
        } else {
            console.error("No candidates in response data:", data);
            throw new Error('No candidates found in API response');
        }
    } catch (error) {
        alert(`Error generating image: ${error.message}`);
        console.error('Error:', error);
    } finally {
        // Hide loading spinner
        loadingSpinner.classList.add('hidden');
    }
}

// Helper function to get image as base64
function getImageAsBase64(src) {
    return new Promise((resolve, reject) => {
        // If it's already cached, try to use the cached image
        const cacheKey = src.split('/').slice(-3).join('/'); // gender/age/file.jpg
        const cachedModels = imageCache.get(cacheKey);
        const cachedModel = cachedModels ? cachedModels.find(m => m.path === src) : null;
        
        if (cachedModel && cachedModel.element) {
            // We already have the image loaded in the cache
            const canvas = document.createElement('canvas');
            canvas.width = cachedModel.element.width;
            canvas.height = cachedModel.element.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(cachedModel.element, 0, 0);
            
            // Remove the data:image/jpeg;base64, part if present
            const dataUrl = canvas.toDataURL('image/jpeg');
            resolve(dataUrl.split(',')[1]);
            return;
        }
        
        // Otherwise load the image
        const img = new Image();
        img.crossOrigin = 'Anonymous';  // Try to avoid CORS issues
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Remove the data:image/jpeg;base64, part if present
            const dataUrl = canvas.toDataURL('image/jpeg');
            resolve(dataUrl.split(',')[1]);
        };
        
        img.onerror = () => {
            // If we can't load the actual model image, use the placeholder
            console.warn(`Failed to load model image for API: ${src}, trying placeholder`);
            const placeholderImg = new Image();
            placeholderImg.crossOrigin = 'Anonymous';
            
            placeholderImg.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = placeholderImg.width;
                canvas.height = placeholderImg.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(placeholderImg, 0, 0);
                
                const dataUrl = canvas.toDataURL('image/jpeg');
                resolve(dataUrl.split(',')[1]);
            };
            
            placeholderImg.onerror = () => {
                reject(new Error('Failed to load both model image and placeholder'));
            };
            
            placeholderImg.src = './img/model-placeholder.jpg';
        };
        
        img.src = src;
    });
}

// Add preload image helper
function preloadImage(path, index, gender, ageGroup) {
    return new Promise((resolve) => {
        const img = new Image();
        
        img.onload = () => {
            resolve({
                id: index,
                path,
                gender,
                ageGroup,
                name: `${gender.charAt(0).toUpperCase() + gender.slice(1)} ${formatAgeGroup(ageGroup)} Model ${index}`,
                element: img
            });
        };
        
        img.onerror = () => resolve(null);
        img.src = path;
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded - initializing app');
    initDOMElements();
    initApp();
}); 