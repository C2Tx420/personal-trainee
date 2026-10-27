import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { planContentSchema } from '../../src/engine/plan-schema';

/** Export the plan-content/1 JSON Schema for Claude Code to reference when writing a draft. */
const out = path.resolve(import.meta.dirname, '../schemas/plan-content.schema.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(z.toJSONSchema(planContentSchema, { io: 'input', unrepresentable: 'any' }), null, 2) + '\n');
console.log(`Đã ghi ${out}`);
