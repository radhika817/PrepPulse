import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Determine directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB, disconnectDB } from '../config/db.js';
import { Question } from '../models/Question.js';
import { questionSchema } from '../validators/question.validator.js';

/**
 * Normalizes question text for consistent deduplication:
 * Lowercases, strips punctuation extremes, and collapses consecutive whitespace.
 */
export const normalizeQuestionText = (text) => {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
};

/**
 * Compares an existing Question document with validated new question data
 * to detect if any field has changed.
 */
export const hasQuestionChanged = (existing, incoming) => {
  if (existing.category !== incoming.category) return true;
  if (existing.topic !== incoming.topic) return true;
  if (existing.difficulty !== incoming.difficulty) return true;
  if (existing.type !== incoming.type) return true;
  if (existing.question !== incoming.question) return true;
  if ((existing.answer || '').trim() !== (incoming.answer || '').trim()) return true;
  if ((existing.explanation || '').trim() !== (incoming.explanation || '').trim()) return true;
  if ((existing.followUp || null) !== (incoming.followUp || null)) return true;
  if ((existing.link || null) !== (incoming.link || null)) return true;
  if (existing.sourceType !== incoming.sourceType) return true;
  if ((existing.sourceNote || '') !== (incoming.sourceNote || '')) return true;
  if (existing.reviewStatus !== incoming.reviewStatus) return true;

  // Compare array fields
  const arraysEqual = (a = [], b = []) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  if (!arraysEqual(existing.options, incoming.options)) return true;
  if (!arraysEqual(existing.tags, incoming.tags)) return true;
  if (!arraysEqual(existing.companyTags, incoming.companyTags)) return true;

  return false;
};

/**
 * Main seeding function:
 * 1. Connects to MongoDB
 * 2. Scans the seed directory for *.questions.json files
 * 3. Validates each question against Zod questionSchema
 * 4. Deduplicates and upserts by normalized question text
 * 5. Prints summary: inserted, updated, skipped, invalid (with invalid items listed)
 */
export const seedQuestions = async () => {
  console.log('🌱 [Seed] Starting question bank seeding process...');
  const startTime = Date.now();

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let invalidCount = 0;
  const invalidItems = [];

  try {
    await connectDB();

    // Find all *.questions.json files in the seed directory
    const seedFiles = fs
      .readdirSync(__dirname)
      .filter((file) => file.endsWith('.questions.json'))
      .sort();

    if (seedFiles.length === 0) {
      console.warn('⚠️ [Seed] No *.questions.json seed files found in:', __dirname);
      console.log('\n=============================================');
      console.log('🌱 [Seed] Seeding Summary:');
      console.log(`   - Inserted: ${insertedCount}`);
      console.log(`   - Updated:  ${updatedCount}`);
      console.log(`   - Skipped:  ${skippedCount}`);
      console.log(`   - Invalid:  ${invalidCount}`);
      console.log('=============================================\n');
      return { inserted: insertedCount, updated: updatedCount, skipped: skippedCount, invalid: invalidCount };
    }

    console.log(`📁 [Seed] Found ${seedFiles.length} seed file(s): ${seedFiles.join(', ')}`);

    const seenInBatch = new Set();

    for (const file of seedFiles) {
      const filePath = path.join(__dirname, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      let questionsArray;
      try {
        questionsArray = JSON.parse(fileContent);
      } catch (parseErr) {
        invalidItems.push({
          file,
          index: 0,
          question: 'File parse error',
          errors: parseErr.message,
        });
        invalidCount++;
        continue;
      }

      if (!Array.isArray(questionsArray)) {
        invalidItems.push({
          file,
          index: 0,
          question: 'File content is not an array',
          errors: `Expected JSON array, got ${typeof questionsArray}`,
        });
        invalidCount++;
        continue;
      }

      for (let i = 0; i < questionsArray.length; i++) {
        const rawQuestion = questionsArray[i];

        // 1. Validate with Zod schema
        const validationResult = questionSchema.safeParse(rawQuestion);

        if (!validationResult.success) {
          invalidCount++;
          invalidItems.push({
            file,
            index: i + 1,
            question: rawQuestion?.question || '(no question text)',
            errors: validationResult.error.errors
              .map((e) => `${e.path.join('.')}: ${e.message}`)
              .join('; '),
          });
          continue;
        }

        const questionData = validationResult.data;
        const normalized = normalizeQuestionText(questionData.question);

        // 2. Skip duplicates within the seed batch
        if (seenInBatch.has(normalized)) {
          skippedCount++;
          continue;
        }
        seenInBatch.add(normalized);

        // 3. Check existing in MongoDB
        const existing = await Question.findOne({ normalizedQuestion: normalized })
          .select('+answer +followUp')
          .lean();

        if (!existing) {
          await Question.create({
            ...questionData,
            normalizedQuestion: normalized,
          });
          insertedCount++;
        } else if (hasQuestionChanged(existing, questionData)) {
          await Question.updateOne(
            { _id: existing._id },
            {
              ...questionData,
              normalizedQuestion: normalized,
            }
          );
          updatedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    // List invalid items if any
    if (invalidItems.length > 0) {
      console.log('\n❌ [Seed] Invalid Questions:');
      invalidItems.forEach((item) => {
        console.log(`  - [${item.file} #${item.index}] "${item.question.slice(0, 60)}..."`);
        console.log(`    Errors: ${item.errors}`);
      });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n=============================================');
    console.log(`🌱 [Seed] Seeding Summary (${duration}s):`);
    console.log(`   - Inserted: ${insertedCount}`);
    console.log(`   - Updated:  ${updatedCount}`);
    console.log(`   - Skipped:  ${skippedCount}`);
    console.log(`   - Invalid:  ${invalidCount}`);
    console.log('=============================================\n');

    return { inserted: insertedCount, updated: updatedCount, skipped: skippedCount, invalid: invalidCount };
  } catch (error) {
    console.error('❌ [Seed] Fatal error while seeding:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

// Execute if run directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedQuestions().then(() => {
    process.exit(process.exitCode || 0);
  });
}
