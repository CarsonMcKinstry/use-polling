export const wait = (n: number = 1000) =>
  new Promise<void>((res) => setTimeout(() => res(), n));
