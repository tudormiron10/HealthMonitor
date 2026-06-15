import { describe, it, expect } from 'vitest';
import { getTrendColor } from '@/application/utils/medicalStandards';

const EMERALD = 'text-emerald-500';
const ROSE = 'text-rose-500';
const YELLOW = 'text-yellow-500';

// getTrendColor(newerVal, olderVal, markerKey) compares two readings (newer vs
// older) and returns { color, symbol } describing whether the change is an
// improvement (emerald), a worsening (rose), or neutral (yellow).
describe('getTrendColor', () => {
  it('given a lower-trend marker, when the value decreases, then returns emerald', () => {
    // Arrange + Act
    const result = getTrendColor(90, 110, 'ldl');

    // Assert
    expect(result.color).toBe(EMERALD);
    expect(result.symbol).toBe('↓');
  });

  it('given a lower-trend marker, when the value increases, then returns rose', () => {
    const result = getTrendColor(110, 90, 'ldl');
    expect(result.color).toBe(ROSE);
  });

  it('given a lower-trend marker, when the value increases, then the symbol is an up arrow', () => {
    const result = getTrendColor(110, 90, 'ldl');
    expect(result.symbol).toBe('↑');
  });

  it('given a higher-trend marker, when the value increases, then returns emerald', () => {
    const result = getTrendColor(50, 40, 'hdl');
    expect(result.color).toBe(EMERALD);
    expect(result.symbol).toBe('↑');
  });

  it('given a higher-trend marker, when the value decreases, then returns rose', () => {
    const result = getTrendColor(40, 50, 'hdl');
    expect(result.color).toBe(ROSE);
    expect(result.symbol).toBe('↓');
  });

  it('given a range marker, when the value moves toward the ideal, then returns emerald', () => {
    // bmi ideal is 21.7; 22 is far closer than 28
    const result = getTrendColor(22, 28, 'bmi');
    expect(result.color).toBe(EMERALD);
  });

  it('given a range marker, when the value moves away from the ideal, then returns rose', () => {
    const result = getTrendColor(28, 22, 'bmi');
    expect(result.color).toBe(ROSE);
  });

  it('given a range marker, when the value is equidistant from the ideal, then returns yellow', () => {
    // bmi ideal 21.7; 20.7 and 22.7 are both 1.0 away
    const result = getTrendColor(20.7, 22.7, 'bmi');
    expect(result.color).toBe(YELLOW);
  });

  it('given any marker, when there is no change, then returns yellow with an equals symbol', () => {
    const result = getTrendColor(100, 100, 'ldl');
    expect(result.color).toBe(YELLOW);
    expect(result.symbol).toBe('=');
  });

  it('given a neutral marker, when the value changes, then returns yellow with a direction arrow', () => {
    const result = getTrendColor(2, 1, 'sex');
    expect(result.color).toBe(YELLOW);
    expect(result.symbol).toBe('↑');
  });

  it('given an unknown marker, when compared, then returns yellow', () => {
    const result = getTrendColor(2, 1, 'not_a_real_marker');
    expect(result.color).toBe(YELLOW);
  });
});
