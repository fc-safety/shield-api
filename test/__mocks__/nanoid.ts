// Mock for nanoid

let counter = 0;

export const nanoid = (size?: number): string => {
  counter += 1;
  const id = `mock-nanoid-${counter}`;
  return size ? id.slice(0, size) : id;
};
