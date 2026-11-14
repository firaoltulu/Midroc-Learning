import type { Queryable } from '../../core/db/pool.js';

export type RevisionBase = {
  modules: string[];
  items: string[];
  questions: string[];
  choices: string[];
};

export type RevisionTree = {
  modules: Array<{
    id: string;
    title: string;
    description: string;
    items: Array<{
      id: string;
      type: 'video' | 'pdf' | 'exam';
      title: string;
      youtubeVideoId?: string;
      youtubeTitle?: string;
      thumbnailUrl?: string;
      fileKey?: string;
      sizeBytes?: number;
      pageCount?: number;
      instructions?: string;
      passingScorePercent?: number;
      maxAttempts?: number | null;
      timeLimitMinutes?: number | null;
      questions?: Array<{
        id: string;
        prompt: string;
        isMultiple: boolean;
        points: number;
        choices: Array<{ id: string; text: string; isCorrect: boolean }>;
      }>;
    }>;
  }>;
};

export async function revisionBase(db: Queryable, courseId: string): Promise<RevisionBase> {
  const { rows: modules } = await db.query<{ id: string }>(
    'SELECT id FROM modules WHERE course_id = $1',
    [courseId]
  );
  const { rows: items } = await db.query<{ id: string }>(
    `SELECT i.id FROM module_items i JOIN modules m ON m.id = i.module_id
     WHERE m.course_id = $1`,
    [courseId]
  );
  const { rows: questions } = await db.query<{ id: string }>(
    `SELECT q.id FROM exam_questions q JOIN exams e ON e.item_id = q.exam_id
     JOIN module_items i ON i.id = e.item_id JOIN modules m ON m.id = i.module_id
     WHERE m.course_id = $1`,
    [courseId]
  );
  const { rows: choices } = await db.query<{ id: string }>(
    `SELECT c.id FROM exam_choices c JOIN exam_questions q ON q.id = c.question_id
     JOIN exams e ON e.item_id = q.exam_id JOIN module_items i ON i.id = e.item_id
     JOIN modules m ON m.id = i.module_id WHERE m.course_id = $1`,
    [courseId]
  );
  return {
    modules: modules.map((row) => row.id),
    items: items.map((row) => row.id),
    questions: questions.map((row) => row.id),
    choices: choices.map((row) => row.id)
  };
}

export async function assertRevisionIdsBelongToCourse(
  db: Queryable,
  courseId: string,
  tree: RevisionTree
): Promise<void> {
  const moduleIds = tree.modules.map((module) => module.id);
  const itemIds = tree.modules.flatMap((module) => module.items.map((item) => item.id));
  const questionIds = tree.modules.flatMap((module) =>
    module.items.flatMap((item) => item.questions?.map((question) => question.id) ?? [])
  );
  const choiceIds = tree.modules.flatMap((module) =>
    module.items.flatMap((item) =>
      item.questions?.flatMap((question) => question.choices.map((choice) => choice.id)) ?? []
    )
  );
  const { rows: modules } = await db.query<{ courseId: string }>(
    'SELECT course_id AS "courseId" FROM modules WHERE id = ANY($1::uuid[])',
    [moduleIds]
  );
  const { rows: items } = await db.query<{ courseId: string }>(
    `SELECT m.course_id AS "courseId" FROM module_items i
     JOIN modules m ON m.id = i.module_id WHERE i.id = ANY($1::uuid[])`,
    [itemIds]
  );
  const { rows: questions } = await db.query<{ courseId: string }>(
    `SELECT m.course_id AS "courseId" FROM exam_questions q
     JOIN module_items i ON i.id = q.exam_id JOIN modules m ON m.id = i.module_id
     WHERE q.id = ANY($1::uuid[])`,
    [questionIds]
  );
  const { rows: choices } = await db.query<{ courseId: string }>(
    `SELECT m.course_id AS "courseId" FROM exam_choices c
     JOIN exam_questions q ON q.id = c.question_id JOIN module_items i ON i.id = q.exam_id
     JOIN modules m ON m.id = i.module_id WHERE c.id = ANY($1::uuid[])`,
    [choiceIds]
  );
  if ([...modules, ...items, ...questions, ...choices].some((row) => row.courseId !== courseId)) {
    throw new Error('Course revision references content owned by another course');
  }
}

export async function validateRevisionTree(
  db: Queryable,
  courseId: string,
  tree: RevisionTree,
  base: RevisionBase
): Promise<void> {
  const live = await revisionBase(db, courseId);
  const current = {
    modules: new Set(live.modules),
    items: new Set(live.items),
    questions: new Set(live.questions),
    choices: new Set(live.choices)
  };
  const proposed = {
    modules: tree.modules.map((module) => module.id),
    items: tree.modules.flatMap((module) => module.items.map((item) => item.id)),
    questions: tree.modules.flatMap((module) =>
      module.items.flatMap((item) => item.questions?.map((question) => question.id) ?? [])
    ),
    choices: tree.modules.flatMap((module) =>
      module.items.flatMap((item) =>
        item.questions?.flatMap((question) => question.choices.map((choice) => choice.id)) ?? []
      )
    )
  };
  for (const kind of ['modules', 'items', 'questions', 'choices'] as const) {
    const proposedIds = new Set(proposed[kind]);
    if (base[kind].some((id) => proposedIds.has(id) && !current[kind].has(id))) {
      throw new Error('Stale course revision reference');
    }
  }

  const moduleRows = await db.query<{ id: string; courseId: string }>(
    'SELECT id, course_id AS "courseId" FROM modules WHERE id = ANY($1::uuid[])',
    [proposed.modules]
  );
  const moduleOwners = new Map(moduleRows.rows.map((row) => [row.id, row.courseId]));
  for (const module of tree.modules) {
    const owner = moduleOwners.get(module.id);
    if (owner !== undefined && owner !== courseId) throw new Error('Module reference is outside this course');
  }

  const itemRows = await db.query<{ id: string; type: string; courseId: string }>(
    `SELECT i.id, i.type, m.course_id AS "courseId" FROM module_items i
     JOIN modules m ON m.id = i.module_id WHERE i.id = ANY($1::uuid[])`,
    [proposed.items]
  );
  const items = new Map(itemRows.rows.map((row) => [row.id, row]));
  for (const module of tree.modules) {
    for (const item of module.items) {
      const currentItem = items.get(item.id);
      if (currentItem && (currentItem.courseId !== courseId || currentItem.type !== item.type)) {
        throw new Error('Item reference is stale or has a different type');
      }
    }
  }

  const questionRows = await db.query<{ id: string; examId: string; courseId: string }>(
    `SELECT q.id, q.exam_id AS "examId", m.course_id AS "courseId"
     FROM exam_questions q JOIN module_items i ON i.id = q.exam_id
     JOIN modules m ON m.id = i.module_id WHERE q.id = ANY($1::uuid[])`,
    [proposed.questions]
  );
  const questions = new Map(questionRows.rows.map((row) => [row.id, row]));
  const choiceRows = await db.query<{ id: string; questionId: string; examId: string; courseId: string }>(
    `SELECT c.id, c.question_id AS "questionId", q.exam_id AS "examId",
       m.course_id AS "courseId"
     FROM exam_choices c JOIN exam_questions q ON q.id = c.question_id
     JOIN module_items i ON i.id = q.exam_id JOIN modules m ON m.id = i.module_id
     WHERE c.id = ANY($1::uuid[])`,
    [proposed.choices]
  );
  const choices = new Map(choiceRows.rows.map((row) => [row.id, row]));
  for (const module of tree.modules) {
    for (const item of module.items) {
      if (item.type !== 'exam') continue;
      for (const question of item.questions ?? []) {
        const existingQuestion = questions.get(question.id);
        if (existingQuestion && (existingQuestion.courseId !== courseId || existingQuestion.examId !== item.id)) {
          throw new Error('Question reference is outside this exam');
        }
        for (const choice of question.choices) {
          const existingChoice = choices.get(choice.id);
          if (existingChoice && (
            existingChoice.courseId !== courseId ||
            existingChoice.examId !== item.id
          )) {
            throw new Error('Choice reference is outside this exam');
          }
        }
      }
    }
  }
}

export async function applyRevisionTree(db: Queryable, courseId: string, tree: RevisionTree): Promise<void> {
  const current = await revisionBase(db, courseId);
  const proposedItemIds = tree.modules.flatMap((module) => module.items.map((item) => item.id));
  const proposedChoiceIds = tree.modules.flatMap((module) =>
    module.items.flatMap((item) =>
      item.questions?.flatMap((question) => question.choices.map((choice) => choice.id)) ?? []
    )
  );
  const removedItemIds = current.items.filter((id) => !proposedItemIds.includes(id));
  if (removedItemIds.length) {
    await db.query('DELETE FROM module_items WHERE id = ANY($1::uuid[])', [removedItemIds]);
  }

  for (const [position, module] of tree.modules.entries()) {
    await db.query(
      `INSERT INTO modules (id, course_id, title, description, position)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title,
         description = EXCLUDED.description, position = EXCLUDED.position`,
      [module.id, courseId, module.title, module.description, position]
    );
  }

  for (const module of tree.modules) {
    for (const [itemPosition, item] of module.items.entries()) {
      await db.query(
        `INSERT INTO module_items (id, module_id, type, title, position)
         VALUES ($1, $2, $3::item_type, $4, $5)
         ON CONFLICT (id) DO UPDATE SET module_id = EXCLUDED.module_id,
           title = EXCLUDED.title, position = EXCLUDED.position`,
        [item.id, module.id, item.type, item.title, itemPosition]
      );
      if (item.type === 'video') {
        await db.query(
          `INSERT INTO video_items (item_id, youtube_video_id, youtube_title, thumbnail_url)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (item_id) DO UPDATE SET youtube_video_id = EXCLUDED.youtube_video_id,
             youtube_title = EXCLUDED.youtube_title, thumbnail_url = EXCLUDED.thumbnail_url`,
          [item.id, item.youtubeVideoId, item.youtubeTitle ?? null, item.thumbnailUrl ?? null]
        );
      } else if (item.type === 'pdf') {
        await db.query(
          `INSERT INTO pdf_items (item_id, file_path, size_bytes, page_count)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (item_id) DO UPDATE SET file_path = EXCLUDED.file_path,
             size_bytes = EXCLUDED.size_bytes, page_count = EXCLUDED.page_count`,
          [item.id, item.fileKey, item.sizeBytes ?? null, item.pageCount ?? null]
        );
      } else {
        await db.query(
          `INSERT INTO exams (item_id, instructions, passing_score_percent, max_attempts, time_limit_minutes)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (item_id) DO UPDATE SET instructions = EXCLUDED.instructions,
             passing_score_percent = EXCLUDED.passing_score_percent,
             max_attempts = EXCLUDED.max_attempts, time_limit_minutes = EXCLUDED.time_limit_minutes`,
          [
            item.id,
            item.instructions ?? '',
            item.passingScorePercent ?? 60,
            item.maxAttempts ?? null,
            item.timeLimitMinutes ?? null
          ]
        );
        const questions = item.questions ?? [];
        const keepQuestionIds = questions.map((question) => question.id);
        const { rows: oldQuestions } = await db.query<{ id: string }>(
          'SELECT id FROM exam_questions WHERE exam_id = $1',
          [item.id]
        );
        for (const oldQuestion of oldQuestions) {
          if (!keepQuestionIds.includes(oldQuestion.id)) {
            await db.query('DELETE FROM exam_questions WHERE id = $1', [oldQuestion.id]);
          }
        }
        for (const [questionPosition, question] of questions.entries()) {
          await db.query(
            `INSERT INTO exam_questions (id, exam_id, prompt, is_multiple, points, position)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO UPDATE SET prompt = EXCLUDED.prompt,
               is_multiple = EXCLUDED.is_multiple, points = EXCLUDED.points,
               position = EXCLUDED.position`,
            [question.id, item.id, question.prompt, question.isMultiple, question.points, questionPosition]
          );
          const { rows: oldChoices } = await db.query<{ id: string }>(
            'SELECT id FROM exam_choices WHERE question_id = $1',
            [question.id]
          );
          for (const oldChoice of oldChoices) {
            if (!proposedChoiceIds.includes(oldChoice.id)) {
              await db.query('DELETE FROM exam_choices WHERE id = $1', [oldChoice.id]);
            }
          }
          for (const [choicePosition, choice] of question.choices.entries()) {
            await db.query(
              `INSERT INTO exam_choices (id, question_id, text, is_correct, position)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id,
                 text = EXCLUDED.text, is_correct = EXCLUDED.is_correct,
                 position = EXCLUDED.position`,
              [choice.id, question.id, choice.text, choice.isCorrect, choicePosition]
            );
          }
        }
      }
    }
  }

  const proposedModuleIds = tree.modules.map((module) => module.id);
  const removedModuleIds = current.modules.filter((id) => !proposedModuleIds.includes(id));
  if (removedModuleIds.length) {
    await db.query('DELETE FROM modules WHERE id = ANY($1::uuid[])', [removedModuleIds]);
  }
}

/** Fields edited directly on the live course (not through review): module and item titles. */
export type LiveDirectFields = {
  modules: Array<{ id: string; title: string; description: string }>;
  items: Array<{ id: string; title: string }>;
};

export async function liveDirectFields(db: Queryable, courseId: string): Promise<LiveDirectFields> {
  const { rows: modules } = await db.query<{ id: string; title: string; description: string }>(
    'SELECT id, title, description FROM modules WHERE course_id = $1',
    [courseId]
  );
  const { rows: items } = await db.query<{ id: string; title: string }>(
    `SELECT i.id, i.title FROM module_items i JOIN modules m ON m.id = i.module_id
     WHERE m.course_id = $1`,
    [courseId]
  );
  return { modules, items };
}
