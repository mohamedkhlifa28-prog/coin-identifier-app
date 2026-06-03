'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-sonnet-4-6';

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/**
 * Safely parse a JSON string that may be wrapped in markdown code fences.
 */
function parseJsonResponse(text) {
  let cleaned = text.trim();
  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Identify a coin from a base64 image.
 * @param {string} imageBase64
 * @param {string} mimeType - e.g. "image/jpeg"
 * @returns {Promise<object>}
 */
async function identifyCoin(imageBase64, mimeType) {
  const client = getClient();

  const systemPrompt = `You are an expert numismatist AI. Analyze this coin image and return ONLY a valid JSON object with no markdown, no explanation, just the JSON. The JSON should have:
{
  "name": "string - full coin name",
  "country": "string - country of origin",
  "year": "number or null - year of minting",
  "denomination": "string - face value",
  "mintMark": "string or null - mint mark",
  "composition": "string - metal composition",
  "diameter": "number or null - diameter in mm",
  "weight": "number or null - weight in grams",
  "mintage": "number or null - mintage figure",
  "rarityTier": "string - one of: Common, Uncommon, Rare, Very Rare, Ultra Rare",
  "confidenceScore": "number 0-100 - confidence in identification",
  "alternativeMatches": [{"name": "string", "confidenceScore": "number"}],
  "historicalContext": "string - 2-3 sentences about this coin",
  "funFact": "string - 1 interesting fact",
  "estimatedValues": {
    "poor": "number",
    "good": "number",
    "fine": "number",
    "veryFine": "number",
    "extremelyFine": "number",
    "aboutUncirculated": "number",
    "ms60": "number",
    "ms63": "number",
    "ms65": "number"
  },
  "errorCoinsToLookFor": "string - common errors for this coin type"
}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Please identify this coin and return the JSON object as instructed.',
            },
          ],
        },
      ],
    });

    const text = response.content[0].text;
    return parseJsonResponse(text);
  } catch (err) {
    console.error('Claude identifyCoin error:', err.message);
    return {
      error: true,
      message: err.message,
      name: 'Unknown Coin',
      country: 'Unknown',
      year: null,
      denomination: 'Unknown',
      mintMark: null,
      composition: 'Unknown',
      diameter: null,
      weight: null,
      mintage: null,
      rarityTier: 'Common',
      confidenceScore: 0,
      alternativeMatches: [],
      historicalContext: 'Unable to identify coin at this time.',
      funFact: 'Every coin has a story to tell.',
      estimatedValues: { poor: 1, good: 1, fine: 1, veryFine: 1, extremelyFine: 1, aboutUncirculated: 1, ms60: 1, ms63: 1, ms65: 1 },
      errorCoinsToLookFor: 'N/A',
    };
  }
}

/**
 * Grade a coin using obverse and reverse images.
 * @param {string} obverseBase64
 * @param {string} reverseBase64
 * @param {string} mimeType
 * @returns {Promise<object>}
 */
async function gradeCoin(obverseBase64, reverseBase64, mimeType) {
  const client = getClient();

  const systemPrompt = `You are an expert coin grader with decades of experience. Analyze both the obverse and reverse of this coin and return ONLY a valid JSON object with no markdown. The JSON should have:
{
  "grade": "string - Sheldon scale grade e.g. MS-64, VF-30, F-12",
  "gradeNumber": "number - numeric Sheldon scale value",
  "gradeDescription": "string - full grade name e.g. Mint State-64",
  "obverseGrade": "string - obverse-specific grade",
  "reverseGrade": "string - reverse-specific grade",
  "luster": "string - description of luster",
  "strike": "string - description of strike quality",
  "surfaces": "string - description of surfaces",
  "eyeAppeal": "string - overall eye appeal",
  "positives": ["string array - positive attributes"],
  "negatives": ["string array - negative attributes or detractions"],
  "estimatedValue": "number - USD value at this grade",
  "gradingNotes": "string - detailed grading explanation",
  "pcgsEquivalent": "string - PCGS grade",
  "ngcEquivalent": "string - NGC grade"
}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Obverse (front) of the coin:',
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: obverseBase64,
              },
            },
            {
              type: 'text',
              text: 'Reverse (back) of the coin:',
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: reverseBase64,
              },
            },
            {
              type: 'text',
              text: 'Please grade this coin using the Sheldon scale and return the JSON as instructed.',
            },
          ],
        },
      ],
    });

    const text = response.content[0].text;
    return parseJsonResponse(text);
  } catch (err) {
    console.error('Claude gradeCoin error:', err.message);
    return {
      error: true,
      message: err.message,
      grade: 'Unknown',
      gradeNumber: 0,
      gradeDescription: 'Unable to grade at this time',
      obverseGrade: 'Unknown',
      reverseGrade: 'Unknown',
      luster: 'N/A',
      strike: 'N/A',
      surfaces: 'N/A',
      eyeAppeal: 'N/A',
      positives: [],
      negatives: [],
      estimatedValue: 0,
      gradingNotes: err.message,
      pcgsEquivalent: 'Unknown',
      ngcEquivalent: 'Unknown',
    };
  }
}

/**
 * Detect errors and varieties in a coin image.
 * @param {string} imageBase64
 * @param {string} mimeType
 * @returns {Promise<object>}
 */
async function detectErrors(imageBase64, mimeType) {
  const client = getClient();

  const systemPrompt = `You are an expert in numismatic error coins and varieties. Analyze this coin image carefully and return ONLY a valid JSON object with no markdown. The JSON should have:
{
  "hasErrors": "boolean - whether any errors or varieties were detected",
  "confidence": "number 0-100 - confidence in error detection",
  "errors": [
    {
      "type": "string - error type e.g. Doubled Die, Off-Center, Die Cap, etc.",
      "description": "string - detailed description",
      "severity": "string - Minor, Moderate, Major, or Dramatic",
      "valueImpact": "string - how this affects value",
      "location": "string - where on the coin"
    }
  ],
  "varieties": [
    {
      "name": "string - variety name or designation",
      "description": "string",
      "attribution": "string - e.g. FS-101 or VAM-4"
    }
  ],
  "summary": "string - overall assessment",
  "recommendedNextSteps": "string - what the collector should do next",
  "potentialValueRange": {
    "low": "number",
    "high": "number"
  }
}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Please analyze this coin for errors, varieties, and die anomalies. Return the JSON as instructed.',
            },
          ],
        },
      ],
    });

    const text = response.content[0].text;
    return parseJsonResponse(text);
  } catch (err) {
    console.error('Claude detectErrors error:', err.message);
    return {
      error: true,
      message: err.message,
      hasErrors: false,
      confidence: 0,
      errors: [],
      varieties: [],
      summary: 'Unable to analyze for errors at this time.',
      recommendedNextSteps: 'Try again with a clearer image.',
      potentialValueRange: { low: 0, high: 0 },
    };
  }
}

module.exports = { identifyCoin, gradeCoin, detectErrors };
