export type SolutionTestimonial = {
  solution: string;
  quote: string;
  name: string;
  role: string;
  approved: boolean;
};
// Publish only genuine customer statements with permission. Empty until approved content exists.
export const solutionTestimonials: readonly SolutionTestimonial[] = [];
export function testimonialFor(slug: string, records = solutionTestimonials) {
  return records.find((record) => record.solution === slug && record.approved);
}
