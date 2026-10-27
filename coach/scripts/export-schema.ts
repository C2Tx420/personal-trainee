import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { planContentSchema } from '../../src/engine/plan-schema';

/** Xuất JSON Schema của plan-content/1 cho Claude Code tham khảo khi viết draft. */
const out = path.resolve(import.meta.dirname, '../schemas/plan-content.schema.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(z.toJSONSchema(planContentSchema, { io: 'input', unrepresentable: 'any' }), null, 2) + '\n');
console.log(`Đã ghi ${out}`);
