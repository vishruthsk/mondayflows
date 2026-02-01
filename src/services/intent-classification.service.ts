import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import { redis } from '../utils/redis.js';
import { logger } from '../utils/logger.js';
import { IntentClassificationResult } from '../types/index.js';

export class IntentClassificationService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: config.gemini.model });
    }

    /**
     * Get cached intent for a comment, or classify if not cached
     */
    async getOrClassifyIntent(
        commentId: string,
        commentText: string,
        possibleIntents: string[]
    ): Promise<string | null> {
        // Check cache first
        const cacheKey = `${config.redisKeys.intent}:${commentId}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
            logger.debug({ commentId, intent: cached }, 'Using cached intent');
            return cached;
        }

        // Classify intent
        logger.info({ commentId }, 'Classifying intent');
        const result = await this.classifyIntent(commentText, possibleIntents);

        if (result && result.confidence > 0.6) {
            // Cache for 1 hour
            await redis.set(cacheKey, result.intent, config.intentCacheTTL);
            return result.intent;
        }

        return null;
    }

    /**
     * Classify intent using Gemini API
     */
    private async classifyIntent(
        commentText: string,
        possibleIntents: string[]
    ): Promise<IntentClassificationResult | null> {
        try {
            const prompt = this.buildClassificationPrompt(commentText, possibleIntents);

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Parse JSON response
            const parsed = JSON.parse(text);

            return {
                intent: parsed.intent,
                confidence: parsed.confidence,
            };
        } catch (error) {
            logger.error({ error, commentText }, 'Intent classification error');
            return null;
        }
    }

    /**
     * Build classification prompt for Gemini
     */
    private buildClassificationPrompt(commentText: string, possibleIntents: string[]): string {
        return `You are an intent classification system for Instagram comments.

Analyze the following comment and classify its intent from the provided list.

Comment: "${commentText}"

Possible intents: ${possibleIntents.join(', ')}

Return ONLY a JSON object with this exact structure:
{
  "intent": "the matched intent from the list, or 'unknown' if no match",
  "confidence": a number between 0 and 1
}

Rules:
- Match the comment to the most relevant intent from the list
- If no intent matches well, use "unknown"
- Confidence should reflect how certain you are (0.0 to 1.0)
- Return ONLY the JSON, no other text`;
    }
}

export const intentClassificationService = new IntentClassificationService();
