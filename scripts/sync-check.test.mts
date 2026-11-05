// Uji cepat logika sinkronisasi tanpa jaringan.
// Jalankan: node --experimental-strip-types --test scripts/sync-check.test.mts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { remapIdsForUpload, syncStateToSupabase, EMPTY_STATE } from '../src/lib/supabase.ts';

type Call = { table: string; op: string; payload: unknown };

function fakeClient(failOn?: { table: string; op: string }) {
  const calls: Call[] = [];
  const respond = (table: string, op: string, payload: unknown) => {
    calls.push({ table, op, payload });
    const error = failOn && failOn.table === table && failOn.op === op ? { message: 'boom' } : null;
    return Promise.resolve({ error });
  };
  const client = {
    from(table: string) {
      return {
        upsert: (rows: unknown) => respond(table, 'upsert', rows),
        delete: () => ({ in: (_col: string, ids: unknown) => respond(table, 'delete', ids) })
      };
    }
  };
  return { client: client as never, calls };
}

const base = {
  ...EMPTY_STATE,
  projects: [{ id: 'p1', name: 'A', status: 'Berjalan' as const }],
  tasks: [
    { id: 't1', title: 'X', dueDate: '', priority: 'Sedang' as const, project: 'A', assignee: '', status: 'Todo' as const, completed: false },
    { id: 't2', title: 'Y', dueDate: '', priority: 'Sedang' as const, project: 'A', assignee: '', status: 'Todo' as const, completed: false }
  ]
};

test('tidak ada perubahan → tidak ada request', async () => {
  const { client, calls } = fakeClient();
  await syncStateToSupabase(client, base, structuredClone(base));
  assert.equal(calls.length, 0);
});

test('hanya baris yang berubah yang di-upsert', async () => {
  const { client, calls } = fakeClient();
  const next = structuredClone(base);
  next.tasks[1].title = 'Y2';
  await syncStateToSupabase(client, base, next);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].table, 'tasks');
  assert.deepEqual((calls[0].payload as { id: string }[]).map((r) => r.id), ['t2']);
});

test('baris yang dihapus dikirim sebagai DELETE', async () => {
  const { client, calls } = fakeClient();
  const next = { ...base, tasks: base.tasks.filter((t) => t.id !== 't1') };
  await syncStateToSupabase(client, base, next);
  assert.deepEqual(calls, [{ table: 'tasks', op: 'delete', payload: ['t1'] }]);
});

test('error dari Supabase dilempar (tidak ditelan diam-diam)', async () => {
  const { client } = fakeClient({ table: 'tasks', op: 'upsert' });
  const next = structuredClone(base);
  next.tasks[0].title = 'ubah';
  await assert.rejects(syncStateToSupabase(client, base, next), /\[tasks\] boom/);
});

test('remapIdsForUpload mengganti ID dan menjaga referensi', () => {
  const st = {
    ...base,
    scenarios: [{ id: 'ts1', code: 'TS-01', title: 'S', project: 'A', moduleName: 'M' }],
    testCases: [{ id: 'tc1', scenarioId: 'ts1', code: 'TC-001', title: 'C', precondition: '', steps: '', expectedResult: '', status: 'Pending' as const, tester: '', priority: 'Sedang' as const, linkedTaskId: 't1' }],
    tickets: [{ id: 'k1', code: 'TKT-101', title: 'B', clientName: 'K', project: 'A', category: 'Bug' as const, severity: 'Tinggi' as const, status: 'Open' as const, assignee: '', createdAt: '', linkedTaskId: 't2' }]
  };
  const out = remapIdsForUpload(st);
  const uuid = /^[0-9a-f-]{36}$/;
  assert.match(out.projects[0].id, uuid);
  assert.equal(out.testCases[0].scenarioId, out.scenarios[0].id);
  assert.equal(out.testCases[0].linkedTaskId, out.tasks[0].id);
  assert.equal(out.tickets[0].linkedTaskId, out.tasks[1].id);
});
