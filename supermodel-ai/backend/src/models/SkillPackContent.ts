// src/models/SkillPackContent.ts
import { getMongoDb } from '../utils/db';
import { SkillPackContentDBSchema, NewSkillPackContent, SkillPackContentUpdate } from '../types';
import { logger } from '../utils/logger';
import { Collection, ObjectId } from 'mongodb';

const COLLECTION_NAME = 'skill_pack_contents';

async function getCollection(): Promise<Collection<SkillPackContentDBSchema>> {
  const db = await getMongoDb();
  return db.collection<SkillPackContentDBSchema>(COLLECTION_NAME);
}

export async function createSkillPackContent(newContent: NewSkillPackContent): Promise<SkillPackContentDBSchema> {
  const collection = await getCollection();
  const document: Omit<SkillPackContentDBSchema, '_id'> = {
    ...newContent,
    created_at: new Date(),
    updated_at: new Date(),
  };
  try {
    const result = await collection.insertOne(document as SkillPackContentDBSchema); // Type assertion
    // MongoDB driver version might affect how you get the inserted document.
    // Older versions: result.ops[0]. Newer: findOne by result.insertedId
    // For simplicity, we'll assume result.insertedId is available and we can fetch if needed,
    // or that the input `newContent` combined with `insertedId` and timestamps is sufficient.
    // The `insertOne` operation itself in modern drivers returns an object with `insertedId`.
    return { ...document, _id: result.insertedId } as SkillPackContentDBSchema;
  } catch (error) {
    logger.error(`Error creating skill pack content for PG ID ${newContent.skill_pack_pg_id}:`, error);
    throw error;
  }
}

export async function findSkillPackContentByPgId(skillPackPgId: string, version?: string): Promise<SkillPackContentDBSchema | null> {
  const collection = await getCollection();
  const query: any = { skill_pack_pg_id: skillPackPgId };
  if (version) {
    query.version = version; // Allow fetching specific version
  }
  try {
    // If no version specified, we might want the latest. This requires sorting.
    // For simplicity, this example fetches one document matching the criteria.
    // Add sorting by 'created_at' or 'version' if multiple docs per pg_id are expected without version filter.
    if (!version) {
        // find the latest version by sorting by created_at descending
        return await collection.findOne(query, { sort: { created_at: -1 } });
    }
    return await collection.findOne(query);
  } catch (error) {
    logger.error(`Error finding skill pack content for PG ID ${skillPackPgId}` + (version ? ` version ${version}` : '') + ':', error);
    throw error;
  }
}

export async function findSkillPackContentById(id: string): Promise<SkillPackContentDBSchema | null> {
    const collection = await getCollection();
    try {
        if (!ObjectId.isValid(id)) {
            logger.warn(`Invalid MongoDB ObjectId format: ${id}`);
            return null;
        }
        return await collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
        logger.error(`Error finding skill pack content by Mongo ID ${id}:`, error);
        throw error;
    }
}


export async function updateSkillPackContent(
  mongoId: string,
  updates: SkillPackContentUpdate
): Promise<SkillPackContentDBSchema | null> {
  const collection = await getCollection();
  if (!ObjectId.isValid(mongoId)) {
      logger.error(`Invalid MongoDB ObjectId format for update: ${mongoId}`);
      return null;
  }
  const updateDoc: any = { $set: {} };
  if (updates.content) {
    updateDoc.$set.content = updates.content;
  }
  if (updates.version) {
    updateDoc.$set.version = updates.version;
  }

  if (Object.keys(updateDoc.$set).length === 0) {
    logger.info(`No update parameters provided for skill pack content Mongo ID: ${mongoId}`);
    return findSkillPackContentById(mongoId);
  }

  updateDoc.$set.updated_at = new Date();

  try {
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(mongoId) },
      updateDoc,
      { returnDocument: 'after' } // Returns the updated document
    );
    // In MongoDB driver v3, result.value is the document. In v4+, it's just the document or null.
    // The `findOneAndUpdate` method in v4+ by default returns the document *before* update unless `returnDocument: 'after'`
    return result; // result directly is the document or null if not found
  } catch (error) {
    logger.error(`Error updating skill pack content Mongo ID ${mongoId}:`, error);
    throw error;
  }
}

export async function deleteSkillPackContent(mongoId: string): Promise<boolean> {
  const collection = await getCollection();
   if (!ObjectId.isValid(mongoId)) {
      logger.error(`Invalid MongoDB ObjectId format for delete: ${mongoId}`);
      return false;
  }
  try {
    const result = await collection.deleteOne({ _id: new ObjectId(mongoId) });
    return result.deletedCount === 1;
  } catch (error) {
    logger.error(`Error deleting skill pack content Mongo ID ${mongoId}:`, error);
    throw error;
  }
}

// If you store multiple versions of content for a single PostgreSQL skill_pack_id
export async function deleteAllSkillPackContentsByPgId(skillPackPgId: string): Promise<number> {
    const collection = await getCollection();
    try {
        const result = await collection.deleteMany({ skill_pack_pg_id: skillPackPgId });
        return result.deletedCount ?? 0;
    } catch (error) {
        logger.error(`Error deleting all skill pack contents for PG ID ${skillPackPgId}:`, error);
        throw error;
    }
}
