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
 * Main seeding function:
 * 1. Connects to MongoDB
 * 2. Scans the seed directory for JSON files
 * 3. Validates each question against Zod questionSchema
 * 4. Deduplicates by normalized question text
 * 5. Upserts questions into MongoDB (safe for re-running)
 */
export const seedQuestions = async () => {
  console.log('🌱 [Seed] Starting question bank seeding process...');
  const startTime = Date.now();

  try {
    await connectDB();

    // Find all .json files in the seed directory
    const seedFiles = fs
      .readdirSync(__dirname)
      .filter((file) => file.endsWith('.json') && file !== 'package.json');

    if (seedFiles.length === 0) {
      console.warn('⚠️ [Seed] No JSON seed files found in:', __dirname);
      return;
    }

    console.log(`📁 [Seed] Found ${seedFiles.length} seed file(s): ${seedFiles.join(', ')}`);

    let totalRead = 0;
    let totalValid = 0;
    let totalInvalid = 0;
    let totalUpserted = 0;
    let totalDuplicateSkipped = 0;

    const seenInBatch = new Set();

    for (const file of seedFiles) {
      const filePath = path.join(__dirname, file);
      console.log(`\n📖 [Seed] Processing "${file}"...`);

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      let questionsArray;
      try {
        questionsArray = JSON.parse(fileContent);
      } catch (parseErr) {
        console.error(`❌ [Seed] Invalid JSON in ${file}:`, parseErr.message);
        continue;
      }

      if (!Array.isArray(questionsArray)) {
        console.warn(`⚠️ [Seed] Expected an array of questions in ${file}, got ${typeof questionsArray}`);
        continue;
      }

      for (let i = 0; i < questionsArray.length; i++) {
        totalRead++;
        const rawQuestion = questionsArray[i];

        // 1. Validate with Zod schema
        const validationResult = questionSchema.safeParse(rawQuestion);

        if (!validationResult.success) {
          totalInvalid++;
          console.error(
            `❌ [Seed] Validation failed for question #${i + 1} in "${file}":`,
            validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
          );
          continue;
        }

        totalValid++;
        const questionData = validationResult.data;
        const normalized = normalizeQuestionText(questionData.question);

        // 2. Skip duplicates within the seed batch
        if (seenInBatch.has(normalized)) {
          totalDuplicateSkipped++;
          console.warn(`⚠️ [Seed] Skipping in-batch duplicate: "${questionData.question.slice(0, 50)}..."`);
          continue;
        }
        seenInBatch.add(normalized);

        // 3. Upsert into MongoDB by normalized question text
        // This ensures the seed script is idempotent and safe to re-run anytime
        await Question.findOneAndUpdate(
          { normalizedQuestion: normalized },
          {
            ...questionData,
            normalizedQuestion: normalized,
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );

        totalUpserted++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n=============================================');
    console.log(`✅ [Seed] Seeding completed in ${duration}s`);
    console.log(`📊 Total read:             ${totalRead}`);
    console.log(`✔️  Valid questions:        ${totalValid}`);
    console.log(`❌ Invalid questions:      ${totalInvalid}`);
    console.log(`🔄 Upserted in DB:         ${totalUpserted}`);
    console.log(`⏭️  Duplicate skipped:      ${totalDuplicateSkipped}`);
    console.log('=============================================\n');
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
