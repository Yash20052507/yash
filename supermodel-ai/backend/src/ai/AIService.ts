// src/ai/AIService.ts
import OpenAI from 'openai';
import config from '../config';
import { logger } from '../utils/logger';
import { SkillPackContentData } from '../types';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AIService {
  private openai: OpenAI;

  constructor() {
    if (!config.openai.apiKey) {
      logger.error('OpenAI API key is not configured.');
      throw new Error('OpenAI API key is missing.');
    }
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  private constructPromptWithSkillPacks(
    userPrompt: string,
    skillPackContents: SkillPackContentData[]
  ): ChatMessage[] {
    let systemContent = "You are SuperModel AI. Answer the user's request. ";

    if (skillPackContents.length > 0) {
        systemContent += "Consider the following specialized knowledge from loaded skill packs: \n\n";
        skillPackContents.forEach((sp, index) => {
            systemContent += `--- Skill Pack ${index + 1}: ${sp.knowledge_base_summary || sp.instructions || 'No instructions/summary provided.'} ---\n`;
            if (sp.examples && sp.examples.length > 0) {
                systemContent += "Examples:\n";
                sp.examples.slice(0, 2).forEach(ex => { // Limit examples to save tokens
                    systemContent += `Input: ${ex.input}\nOutput: ${ex.output}\n`;
                });
            }
            if (sp.templates && sp.templates.length > 0) {
                 systemContent += "Relevant Templates:\n";
                 sp.templates.slice(0,1).forEach(t => systemContent += `${t.name}: ${t.code}\n`);
            }
            if (sp.prompt_templates && sp.prompt_templates.length > 0) {
                systemContent += "Consider these prompt structures if relevant:\n";
                sp.prompt_templates.slice(0,1).forEach(pt => systemContent += `${pt.name}: ${pt.template}\n`);
            }
            systemContent += "\n";
        });
        systemContent += "--- End of Skill Pack Knowledge --- \n\nUser Request: ";
    }

    // The final message array will be constructed in generateChatResponse
    // This function now primarily focuses on building the detailed system prompt part
    return [
        { role: 'system', content: systemContent },
        // User prompt will be added after this by the calling method
    ];
  }

  async generateChatResponse(
    userPrompt: string,
    skillPackContents: SkillPackContentData[],
    history: ChatMessage[] = [] // history should be {role, content}
  ): Promise<{ response: string; tokensUsed: number; modelUsed: string }> {
    const model = config.openai.defaultModel || 'gpt-3.5-turbo';
    try {
      const systemMessages = this.constructPromptWithSkillPacks(userPrompt, skillPackContents);

      const messages: ChatMessage[] = [
        ...systemMessages.slice(0, -1), // All but the placeholder for user prompt
        ...history, // Add chat history
        { role: 'user', content: userPrompt } // Add current user prompt last
      ];

      // Ensure the very first message is 'system' if not already.
      // And ensure the system prompt from skill packs is properly placed.
      // This logic assumes `constructPromptWithSkillPacks` returns the core system prompt.
      // A more robust approach might involve merging system prompts if history also contains one.

      let finalMessages: ChatMessage[] = [];
      const mainSystemPrompt = systemMessages[0].content;

      if (messages.length > 0 && messages[0].role === 'system') {
        // Combine if history already starts with a system message (less likely with this structure)
        messages[0].content = mainSystemPrompt + "\n" + messages[0].content;
        finalMessages = [...messages];
      } else {
        finalMessages = [{role: 'system', content: mainSystemPrompt}, ...messages];
      }

      // Filter out consecutive messages from the same role (excluding system)
      const uniqueRoleMessages = finalMessages.reduce((acc, current) => {
        const last = acc.length > 0 ? acc[acc.length - 1] : null;
        if (last && last.role === current.role && current.role !== 'system') {
          // If same role, append content (simple merge) or replace, depending on strategy
          // For now, we just keep the last one if consecutive non-system roles.
          // A better strategy might be to merge or ensure strict alternation.
          // OpenAI API prefers alternating user/assistant messages.
        } else {
          acc.push(current);
        }
        return acc;
      }, [] as ChatMessage[]);


      logger.debug(`Sending ${uniqueRoleMessages.length} messages to OpenAI. System prompt: ${uniqueRoleMessages[0]?.content.substring(0,150)}... User prompt: ${userPrompt.substring(0,100)}`);

      const completion = await this.openai.chat.completions.create({
        model: model,
        messages: uniqueRoleMessages,
        temperature: 0.7,
        max_tokens: config.openai.maxTokensPerResponse,
      });

      const responseContent = completion.choices[0]?.message?.content;
      const tokensUsed = completion.usage?.total_tokens || 0;

      if (!responseContent) {
        logger.error('No response content from OpenAI.');
        throw new Error('No response content from OpenAI.');
      }
      logger.info(`OpenAI response generated using ${model}. Tokens: ${tokensUsed}`);
      return { response: responseContent, tokensUsed, modelUsed: model };

    } catch (error) {
      logger.error('Error generating chat response from OpenAI:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const model = config.openai.embeddingModel || 'text-embedding-ada-002';
    try {
      const cleanText = text.replace(/\n/g, ' ').trim();
      if (!cleanText) {
          logger.warn("Attempted to generate embedding for empty or whitespace-only text.");
          // Return a zero vector or handle as an error depending on requirements
          // For Pinecone, dimension must match, so returning [] might be problematic if not handled.
          // Consider throwing an error or returning a specific placeholder if that's part of the design.
          // For now, let OpenAI handle it, it might error or return a valid embedding for whitespace.
      }

      logger.debug(`Generating embedding for text snippet: "${cleanText.substring(0, 50)}..." using ${model}`);
      const response = await this.openai.embeddings.create({
        model: model,
        input: cleanText,
      });
      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        logger.error('No embedding data received from OpenAI.');
        throw new Error('No embedding data received from OpenAI.');
      }
      logger.info(`Embedding generated using ${model}. Dimensions: ${embedding.length}`);
      return embedding;
    } catch (error) {
      logger.error('Error generating embedding from OpenAI:', error);
      throw error;
    }
  }
}
