export function getSkipTake(page = 1, perPage = 24) {
  const take = Math.max(1, Math.min(perPage, 60));
  const skip = (Math.max(1, page) - 1) * take;
  return { skip, take };
}
