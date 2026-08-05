export function futureDate(days = 1): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function pastDate(days = 1): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
