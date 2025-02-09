const { GoogleGenerativeAI } = require('@google/generative-ai');
const { extractTextFromFile } = require('./file-processing.service');

// Initialize Google AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

const createFlashCardPrompt = (content) => {
  return `You are a flash card generation assistant. Your task is to analyze the content and create flash cards.
  IMPORTANT: Your response must be a valid JSON object. Do not include any text before or after the JSON.
  
  Create the following types of flash cards where you best see fit make sure to cover all relevant topics and key points. Generate at minimum 5 cards.:
  1. Multiple choice questions
  2. Fill in the blank questions
  3. Matching pairs

  Each generated Card must be ranked by difficulty from 1-3 where 1 is the easiest and 3 is the hardest.

  Use exactly this JSON structure and these keys:
  {
    "summary": "Brief summary of the content",
    "flashCards": [
      {
        "type": "multiple_choice",
        "question": "Question text",
        "multipleChoice": {
          "options": [
            {"text": "Correct answer", "isCorrect": true},
            {"text": "Wrong answer 1", "isCorrect": false},
            {"text": "Wrong answer 2", "isCorrect": false},
            {"text": "Wrong answer 3", "isCorrect": false}
          ]
        },
        "difficulty": 2
      },
      {
        "type": "fill_in_blank",
        "question": "Question with ___ blank",
        "answer": "correct answer",
        "difficulty": 1
      },
      {
        "type": "matching",
        "matching": {
          "pairs": [
            {"question": "Term 1", "answer": "Definition 1"},
            {"question": "Term 2", "answer": "Definition 2"},
            {"question": "Term 3", "answer": "Definition 3"}
          ]
        },
        "difficulty": 3
      }
    ]
  }

  Content to analyze:
  ${content}`;
};

const generateFlashCards = async (file) => {
  try {
    // For text generation, use the gemini-pro model since it's better for text processing
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Extract text from the file
    const content = await extractTextFromFile(file);

    const prompt = createFlashCardPrompt(content);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up the response text to ensure it's valid JSON
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      console.error('AI response does not contain valid JSON structure:', text);
      throw new Error('AI response is not in the expected JSON format');
    }
    
    const jsonText = text.slice(jsonStart, jsonEnd);
    
    try {
      const parsedResponse = JSON.parse(jsonText);
      return {
        success: true,
        data: parsedResponse
      };
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return {
        success: false,
        error: 'Failed to parse AI response'
      };
    }
  } catch (error) {
    console.error('Error generating flash cards:', error);
    return {
      success: false,
      error: 'Failed to generate flash cards'
    };
  }
};

module.exports = {
  generateFlashCards
};
