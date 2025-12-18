import test from 'node:test';
import assert from 'node:assert/strict';
import { getExpenseEntries } from '../src/controllers/expenseController.js';
import ExpenseEntry from '../src/models/ExpenseEntry.js';

const createMockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.payload = payload;
    return res;
  };
  return res;
};

test('applies duplicate status filter when requested', async () => {
  let capturedQuery = null;
  const mockSort = async () => [];
  ExpenseEntry.find = (query) => {
    capturedQuery = query;
    return {
      populate: () => ({ sort: mockSort }),
    };
  };

  const req = {
    query: { duplicateStatus: 'Merged' },
    user: { role: 'mis_manager' },
  };
  const res = createMockRes();

  await getExpenseEntries(req, res);

  assert.equal(capturedQuery.duplicateStatus, 'Merged');
  assert.equal(res.statusCode, 200);
});

