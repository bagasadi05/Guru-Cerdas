const STORAGE_KEY = 'tutorial_progress';

export function getCompletedFlows(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function markFlowCompleted(flowId: string): void {
  const completed = getCompletedFlows();
  if (!completed.includes(flowId)) {
    completed.push(flowId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  }
}

export function resetTutorialProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}
