/**
 * Sleep for a given duration
 * @param duration Duration in milliseconds
 */
export function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}
