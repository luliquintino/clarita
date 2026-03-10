'use strict';

const { generateDisplayId } = require('../../../src/utils/generateDisplayId');
const { cleanDatabase } = require('../../helpers');

describe('generateDisplayId', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should return a string matching format CLA-XXXXXX (6 hex chars)', async () => {
    const id = await generateDisplayId();

    expect(id).toMatch(/^CLA-[0-9A-F]{6}$/);
  });

  it('should return uppercase hex characters', async () => {
    const id = await generateDisplayId();

    // Extract the hex portion
    const hex = id.slice(4);
    expect(hex).toBe(hex.toUpperCase());
  });

  it('should generate unique values across multiple calls', async () => {
    const ids = new Set();
    const count = 20;

    for (let i = 0; i < count; i++) {
      const id = await generateDisplayId();
      ids.add(id);
    }

    // All generated ids should be unique
    expect(ids.size).toBe(count);
  });

  it('should always start with "CLA-"', async () => {
    const id = await generateDisplayId();
    expect(id.startsWith('CLA-')).toBe(true);
  });
});
