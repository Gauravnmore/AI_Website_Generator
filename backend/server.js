require('dotenv').config();
const express = require('express');
const cors = require('cors');


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Smart Genesis API is running',
    timestamp: new Date().toISOString()
  });
});

const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Utility function to construct prompt
const constructPrompt = (businessData) => {
  const { businessName, industry, targetAudience= "General customers", colorTheme = "indigo", sections = {} } = businessData;
  
  const selectedSections =
    Object.keys(sections).length > 0
      ? Object.keys(sections).filter(key => sections[key]).join(', ')
      : "Hero, About, Services, Contact";

  return `You are a senior React developer.

    Generate a complete React functional component.

    Requirements:
    - Use Tailwind CSS
    - Logo text on the left (use business name as logo)
    - Mobile responsive
    - Include Hero, About, Services, Contact
    - Clean JSX
    - No imports
    - No explanation
    - About section
    - Contact section
    - Fully responsive
    - Only return component code

    Business Details:
    Name: ${businessName}
    Industry: ${industry}
    Target Audience: ${targetAudience}
    Primary Color: ${colorTheme}
    
    Generate clean professional code.`;

};

// Generate website endpoint
app.post('/api/generate-website', async (req, res) => {
  try {
    const businessData = req.body;

    // Validate
    if (!businessData.businessName || !businessData.industry) {
      return res.status(400).json({
        success: false,
        error: 'Business name and industry are required'
      });
    }

    console.log('Generating website for:', businessData.businessName);

    const prompt = constructPrompt(businessData);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        {
          role: 'system',
          content: 'You are an expert React developer who creates beautiful, modern web components using Tailwind CSS.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000   // 🔥 reduced (30000 is unnecessary)
    });

    // ✅ SAFE EXTRACTION
    const generatedCode = completion?.choices?.[0]?.message?.content;

    if (!generatedCode) {
      console.error('OpenAI returned empty response:', completion);
      return res.status(500).json({
        success: false,
        error: 'AI returned empty response'
      });
    }

    // ✅ SAFE CLEANING
    const cleanedCode = generatedCode
      .replace(/```jsx\n?/g, '')
      .replace(/```javascript\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    console.log('✅ Website generated successfully');

    res.json({
      success: true,
      code: cleanedCode,
      metadata: {
        businessName: businessData.businessName,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Full Error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to generate website',
      message: error.message
    });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});