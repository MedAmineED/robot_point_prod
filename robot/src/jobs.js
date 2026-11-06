/** Fail before starting any extraction if a requested activity is not configured. */
export function selectJobs(jobs, requested) {
  const names = requested ?? jobs.map(job => job.activity);
  const unknown = names.filter(name => !jobs.some(job => job.activity === name));
  if (unknown.length) throw new Error(`Unknown job: ${unknown.join(', ')}. Configured: ${jobs.map(job => job.activity).join(', ')}`);
  const selected = jobs.filter(job => names.includes(job.activity));
  if (!selected.length) throw new Error(`No matching job. Configured: ${jobs.map(job => job.activity).join(', ')}`);
  return selected;
}
