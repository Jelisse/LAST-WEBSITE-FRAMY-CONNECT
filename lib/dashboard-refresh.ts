export const refreshEvent = 'framy-dashboard-refresh';
export type RefreshFeedback = {
  phase: 'loading' | 'success' | 'error';
  preserved?: boolean;
  retry?: () => void;
};
let running = false;
export async function refreshDashboard(
  task: () => Promise<unknown>,
  preserved = false,
) {
  if (running) return;
  running = true;
  const emit = (detail: RefreshFeedback) =>
    window.dispatchEvent(new CustomEvent(refreshEvent, { detail }));
  emit({ phase: 'loading' });
  try {
    await task();
    emit({ phase: 'success', preserved });
  } catch (error) {
    emit({
      phase: 'error',
      retry: () => {
        void refreshDashboard(task, preserved).catch(() => {});
      },
    });
    throw error;
  } finally {
    running = false;
  }
}
