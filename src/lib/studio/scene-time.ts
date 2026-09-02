/** Best-effort millis from a Firestore Timestamp, Date, or number. */
export function sceneTimeMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    const toMillis = (value as { toMillis?: () => number }).toMillis;
    if (typeof toMillis === 'function') {
      try {
        return toMillis.call(value);
      } catch {
        return 0;
      }
    }
  }
  return 0;
}

export function sceneSortKey(scene: {
  updatedAt?: unknown;
  createdAt?: unknown;
}): number {
  return sceneTimeMillis(scene.updatedAt) || sceneTimeMillis(scene.createdAt);
}

/** Short relative label for history rows. */
export function formatSceneWhen(value: unknown): string {
  const ms = sceneTimeMillis(value);
  if (!ms) return 'Just now';
  const delta = Date.now() - ms;
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
