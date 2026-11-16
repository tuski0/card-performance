import { describe, expect, it } from 'vitest';
import { findBrand, normalizeCategory } from './brands';

describe('findBrand', () => {
  it('brandFromBranchName: branch names still resolve to the brand', () => {
    expect(findBrand('씨유(CU) 구로예성점')?.id).toBe('cu');
    expect(findBrand('CU강남점')?.id).toBe('cu');
    expect(findBrand('지에스25 수지하음점')?.id).toBe('gs25');
    expect(findBrand('스타벅스 선릉R')?.id).toBe('starbucks');
  });
  it('maps brands to top-level categories', () => {
    expect(findBrand('스타벅스')?.category).toBe('cafe');
    expect(findBrand('맥도날드 강남')?.category).toBe('food');
    expect(findBrand('SKT 통신요금')?.category).toBe('telecom');
  });
  it('does not match lookalikes or unknown merchants', () => {
    expect(findBrand('CUBE카페')).toBeNull();
    expect(findBrand('동네식당')).toBeNull();
  });
});

describe('normalizeCategory', () => {
  it('legacyCategoryFallsBackToUnknown', () => {
    expect(normalizeCategory('starbucks')).toBe('unknown');
    expect(normalizeCategory('other')).toBe('unknown');
  });
  it('keeps valid values', () => {
    expect(normalizeCategory('food')).toBe('food');
    expect(normalizeCategory('etc')).toBe('etc');
  });
});
