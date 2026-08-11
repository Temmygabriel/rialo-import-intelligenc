export function roundMoney(value: number) { return Math.round(value / 100) * 100; }
export function calculateCbm(lengthCm: number, widthCm: number, heightCm: number, quantity = 1) { return (lengthCm * widthCm * heightCm * quantity) / 1_000_000; }
export function calculateVolumetricWeightKg(lengthCm: number, widthCm: number, heightCm: number, quantity = 1, divisor = 6000) { return (lengthCm * widthCm * heightCm * quantity) / divisor; }
export function calculateChargeableAirWeight(actualKg: number, volumetricKg: number, minimumKg: number) { return Math.max(actualKg, volumetricKg, minimumKg); }
export function sumRange(items: { amountLow: number; amountHigh: number }[]) { return items.reduce((acc, item) => ({ low: acc.low + item.amountLow, high: acc.high + item.amountHigh }), { low: 0, high: 0 }); }
