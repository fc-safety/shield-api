// Mock for @paralleldrive/cuid2

let counter = 0;

export const createId = (): string => {
  counter += 1;
  return `mock-cuid-${counter}`;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const init = (_options?: {
  length?: number;
  fingerprint?: string;
}): (() => string) => {
  return createId;
};

export const getConstants = () => ({
  defaultLength: 24,
  bigLength: 32,
});

export const isCuid = (id: string): boolean => {
  return typeof id === 'string' && id.length > 0;
};
