import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgres://postgres:postgres@localhost:5432/learning_test';
process.env.LOG_LEVEL ??= 'silent';
process.env.PDF_ROOT ??= path.join(os.tmpdir(), 'lms-test-pdfs');
