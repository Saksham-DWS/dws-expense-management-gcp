import test from 'node:test';
import assert from 'node:assert/strict';
import { respondToRenewal } from '../src/controllers/serviceHandlerController.js';
import ExpenseEntry from '../src/models/ExpenseEntry.js';
import RenewalLog from '../src/models/RenewalLog.js';
import User from '../src/models/User.js';

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

test('service handler renewal continue flow creates log entry', async () => {
  const sampleEntry = {
    _id: 'entry-1',
    serviceHandler: 'Handler Wytlabs',
    nextRenewalDate: new Date('2025-02-05'),
  };

  let createdLog;
  ExpenseEntry.findById = async () => sampleEntry;
  RenewalLog.create = async (payload) => {
    createdLog = payload;
  };
  User.findOne = async () => null;

  const req = {
    params: { entryId: 'entry-1' },
    body: { continueService: true, reason: 'Still required' },
    user: { name: 'Handler Wytlabs' },
  };
  const res = createMockRes();

  await respondToRenewal(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.message, 'Your response has been recorded. The service will continue.');
  assert.equal(createdLog.action, 'Continue');
  assert.equal(createdLog.reason, 'Still required');
});

