import { describe, expect, it } from 'vitest';
import { BACKUP_TABLES, buildBackup, planImport } from './backup';

describe('backup pt-backup/1', () => {
  const tables = {
    weight_logs: [{ id: 'w1', user_id: 'u', log_date: '2026-10-26', weight_kg: 81.7 }],
    plan_versions: [{ id: 'p1', user_id: 'u', version_no: 1, calories_kcal: 1900, content: { schema: 'plan-content/1' } }],
    session_templates: [{ id: 't1' }],
  };

  it('round-trip: export → import plan → export lại giữ nguyên dữ liệu (trừ cột tự sinh/chỉ đọc)', () => {
    const b = buildBackup(tables, '0.1.0', new Date('2026-10-27T00:00:00Z'));
    expect(Object.keys(b.tables)).toEqual([...BACKUP_TABLES]);
    const json = JSON.parse(JSON.stringify(b));
    const { plan, counts, skipped } = planImport(json);
    expect(counts.weight_logs).toBe(1);
    expect(skipped).toEqual(['session_templates']);
    const pv = plan.find((p) => p.table === 'plan_versions')!.rows[0];
    expect(pv).not.toHaveProperty('calories_kcal');
    expect(pv).not.toHaveProperty('user_id');
    const again = buildBackup(Object.fromEntries(plan.map((p) => [p.table, p.rows])), '0.1.0', new Date('2026-10-27T00:00:00Z'));
    expect(again.tables.weight_logs).toEqual([{ id: 'w1', log_date: '2026-10-26', weight_kg: 81.7 }]);
  });

  it('thứ tự nhập theo khoá ngoại: plan_versions trước workout_sessions, sessions trước sets', () => {
    const order = planImport(buildBackup({}, 'x')).plan.map((p) => p.table);
    expect(order.indexOf('plan_versions')).toBeLessThan(order.indexOf('workout_sessions'));
    expect(order.indexOf('workout_session_items')).toBeLessThan(order.indexOf('workout_sets'));
    expect(order).not.toContain('session_templates');
  });

  it('sai định dạng → lỗi tiếng Việt', () => {
    expect(() => planImport({ schema: 'khac' })).toThrow('pt-backup/1');
  });
});
