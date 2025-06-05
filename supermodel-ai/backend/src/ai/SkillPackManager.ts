// src/ai/SkillPackManager.ts
import { getMongoDb } from '../utils/db';
import { SkillPackContentDBSchema, SkillPackContentData } from '../types';
import { AIService } from './AIService';
import { logger } from '../utils/logger';
import { Pinecone, Index, Vector as PineconeVector } from '@pinecone-database/pinecone'; // Corrected import for v2.x.x
import config from '../config';

// Pinecone specific types
interface PineconeMetadata {
    skill_pack_pg_id: string;
    skill_pack_version: string; // Store version for potential version-specific retrieval
    chunk_text_preview: string;
    // other metadata fields like original document name, etc.
}

export class SkillPackManager {
  private aiService: AIService;
  private pineconeIndex: Index<PineconeMetadata> | null = null;

  constructor(aiService: AIService) {
    this.aiService = aiService;
    if (config.pinecone.apiKey && config.pinecone.environment && config.pinecone.indexName) {
        const pinecone = new Pinecone({ // Updated initialization for v2.x.x
            apiKey: config.pinecone.apiKey,
            environment: config.pinecone.environment,
        });
        this.pineconeIndex = pinecone.index<PineconeMetadata>(config.pinecone.indexName);
        logger.info(`Pinecone client initialized for index "${config.pinecone.indexName}".`);
    } else {
        logger.warn('Pinecone configuration is missing. Vector search capabilities will be disabled.');
    }
  }

  async getSkillPackContentsByIds(skillPackPgIds: string[], version?: string): Promise<SkillPackContentData[]> {
    if (skillPackPgIds.length === 0) return [];
    const db = await getMongoDb();
    const query: any = { skill_pack_pg_id: { $in: skillPackPgIds } };
    if (version) {
        query.version = version;
    }
    // If multiple versions exist per pg_id and no version is specified, this will fetch all of them.
    // Depending on requirements, might need to fetch only the latest version.
    const contents = await db.collection<SkillPackContentDBSchema>('skill_pack_contents')
      .find(query)
      .toArray();
    return contents.map(c => c.content);
  }

  async getSingleSkillPackContent(skillPackPgId: string, version?: string): Promise<SkillPackContentDBSchema | null> {
    const db = await getMongoDb();
    const query: any = { skill_pack_pg_id: skillPackPgId };
    if (version) {
        query.version = version;
    }
    // If version not specified, find the latest based on created_at or a semantic version field if available.
    // For simplicity, if no version, it gets one. Add sorting for "latest" if needed.
    return db.collection<SkillPackContentDBSchema>('skill_pack_contents')
             .findOne(query, { sort: version ? {} : { created_at: -1 } });
  }

  // More sophisticated strategies exist, e.g., sentence splitting, token-based chunking.
  private chunkText(text: string, chunkSize: number = 300, overlap: number = 50): string[] {
    const chunks: string[] = [];
    let i = 0;
    if (!text) return chunks;
    while (i < text.length) {
        const end = Math.min(i + chunkSize, text.length);
        chunks.push(text.substring(i, end));
        i += (chunkSize - overlap);
        if (end === text.length) break;
    }
    return chunks.filter(chunk => chunk.trim() !== ""); // Ensure no empty chunks
  }

  async generateAndStoreEmbeddings(skillPackPgId: string, skillPackVersion: string): Promise<boolean> {
    if (!this.pineconeIndex) {
        logger.error('Pinecone index not initialized. Cannot store embeddings.');
        return false;
    }

    const skillPackDoc = await this.getSingleSkillPackContent(skillPackPgId, skillPackVersion);
    if (!skillPackDoc) {
      logger.error(`Skill pack content not found for ID: ${skillPackPgId}, Version: ${skillPackVersion}`);
      return false;
    }

    const { content } = skillPackDoc;
    let textToEmbed = content.instructions || "";
    if (content.knowledge_base_summary) textToEmbed += `\n\n${content.knowledge_base_summary}`; // Add more spacing
    content.examples?.forEach(ex => { textToEmbed += `\n\nExample Input: ${ex.input}\nExample Output: ${ex.output}`; });
    content.templates?.forEach(t => { textToEmbed += `\n\nTemplate ${t.name}:\n${t.code}`; });
    content.prompt_templates?.forEach(pt => {textToEmbed += `\n\nPrompt Template ${pt.name}: ${pt.template}`})

    if (!textToEmbed.trim()) {
        logger.warn(`No text content to embed for skill pack ${skillPackPgId} version ${skillPackVersion}`);
        // Update status to reflect no content, rather than 'generated'
         const db = await getMongoDb();
          await db.collection<SkillPackContentDBSchema>('skill_pack_contents').updateOne(
            { _id: skillPackDoc._id },
            { $set: { embeddings_status: 'no_content', updated_at: new Date(), embeddings_vector_count: 0 } }
          );
        return true;
    }

    const chunks = this.chunkText(textToEmbed);
    if (chunks.length === 0) {
        logger.warn(`Text content for skill pack ${skillPackPgId} version ${skillPackVersion} resulted in zero chunks.`);
        return true;
    }

    const vectors: PineconeVector<PineconeMetadata>[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
            const embedding = await this.aiService.generateEmbedding(chunk);
            vectors.push({
                id: `${skillPackPgId}_v${skillPackVersion}_chunk_${i}`, // Unique ID for each vector
                values: embedding,
                metadata: {
                    skill_pack_pg_id: skillPackPgId,
                    skill_pack_version: skillPackVersion,
                    chunk_text_preview: chunk.substring(0, 200) + "..." // Increased preview
                }
            });
        } catch (error) {
            logger.error(`Failed to generate embedding for chunk ${i} of skill pack ${skillPackPgId} v${skillPackVersion}:`, error);
        }
    }

    if (vectors.length === 0) {
         logger.error(`All embedding generations failed for skill pack ${skillPackPgId} v${skillPackVersion}.`);
         // Update status to reflect failure
         const db = await getMongoDb();
          await db.collection<SkillPackContentDBSchema>('skill_pack_contents').updateOne(
            { _id: skillPackDoc._id },
            { $set: { embeddings_status: 'failed', updated_at: new Date() } }
          );
         return false;
    }

    try {
      // Pinecone upsert batch size limit is typically 100 vectors or 2MB.
      // For simplicity, upserting all at once. For large number of chunks, batching is needed.
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
          const batch = vectors.slice(i, i + batchSize);
          await this.pineconeIndex.upsert(batch);
          logger.info(`Upserted batch of ${batch.length} vectors to Pinecone for skill pack ${skillPackPgId} v${skillPackVersion}. Starting from index ${i}.`);
      }

      logger.info(`Successfully stored ${vectors.length} embedding vectors for skill pack ${skillPackPgId} v${skillPackVersion} in Pinecone.`);

      const db = await getMongoDb();
      await db.collection<SkillPackContentDBSchema>('skill_pack_contents').updateOne(
        { _id: skillPackDoc._id }, // Use MongoDB _id to update the specific version document
        { $set: { embeddings_status: 'generated', updated_at: new Date(), embeddings_vector_count: vectors.length } }
      );
      return true;
    } catch (error: any) {
      logger.error(`Error storing embeddings in Pinecone for skill pack ${skillPackPgId} v${skillPackVersion}:`, error);
      // Log more details from Pinecone error if available
      if (error.response && error.response.data) {
          logger.error('Pinecone error details:', error.response.data);
      }
      const db = await getMongoDb();
      await db.collection<SkillPackContentDBSchema>('skill_pack_contents').updateOne(
         { _id: skillPackDoc._id },
         { $set: { embeddings_status: 'failed', updated_at: new Date() } }
      );
      return false;
    }
  }

  async findRelevantSkillPackChunks(queryText: string, topK: number = 3, targetSkillPackPgIds?: string[]): Promise<SkillPackContentData[]> {
    if (!this.pineconeIndex) {
        logger.warn('Pinecone index not initialized. Cannot perform vector search.');
        return [];
    }
    try {
      const queryEmbedding = await this.aiService.generateEmbedding(queryText);

      let filter: Record<string, any> | undefined = undefined;
      if (targetSkillPackPgIds && targetSkillPackPgIds.length > 0) {
        filter = { skill_pack_pg_id: { $in: targetSkillPackPgIds } };
      }

      const queryResponse = await this.pineconeIndex.query({
        vector: queryEmbedding,
        topK: topK,
        includeMetadata: true,
        filter: filter,
        // includeValues: false, // Usually not needed for retrieval
      });

      const relevantSkillPackSources = new Map<string, {version: string, score: number}>();
      if (queryResponse.matches) {
        queryResponse.matches.forEach(match => {
          if (match.metadata?.skill_pack_pg_id && match.metadata?.skill_pack_version) {
            const currentBestScore = relevantSkillPackSources.get(match.metadata.skill_pack_pg_id)?.score ?? -1;
            if(match.score && match.score > currentBestScore) { // Higher score is better
                 relevantSkillPackSources.set(match.metadata.skill_pack_pg_id, {
                    version: match.metadata.skill_pack_version,
                    score: match.score
                });
            }
          }
        });
      }

      if(relevantSkillPackSources.size === 0) return [];

      logger.info(`Found ${relevantSkillPackSources.size} relevant skill pack source(s) from vector search.`);

      const contentsToFetch = Array.from(relevantSkillPackSources.entries()).map(([pgId, data]) => ({ pgId, version: data.version }));

      const db = await getMongoDb();
      const results: SkillPackContentData[] = [];
      for (const item of contentsToFetch) {
          const contentDoc = await db.collection<SkillPackContentDBSchema>('skill_pack_contents')
                                     .findOne({ skill_pack_pg_id: item.pgId, version: item.version });
          if (contentDoc) {
              results.push(contentDoc.content);
          }
      }
      return results;

    } catch (error) {
      logger.error('Error finding relevant skill pack chunks from Pinecone:', error);
      return [];
    }
  }
}
