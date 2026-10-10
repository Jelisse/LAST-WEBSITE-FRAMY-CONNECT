'use client';
import { useEffect, useState } from 'react';
import { useI18n } from './language-provider';
export function ProfileConnectionCount({
  username,
  enabled,
  preview,
  demoLabel,
}: {
  username: string;
  enabled: boolean;
  preview: boolean;
  demoLabel?: string;
}) {
  const { t } = useI18n();
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled || demoLabel) return;
    const controller = new AbortController();
    void fetch(`/api/profile-connections/${encodeURIComponent(username)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as { connections: number })
          : null,
      )
      .then((value) => {
        if (
          !controller.signal.aborted &&
          value &&
          Number.isSafeInteger(value.connections) &&
          value.connections >= 0
        )
          setCount(value.connections);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [username, enabled, demoLabel]);
  if (count === null && !preview && !demoLabel) return null;
  return (
    <aside
      className="studio-connections"
      aria-label={`${demoLabel ? `${demoLabel}+ (demo)` : count ?? "\u2014"} ${t("Conex\u00f5es")}`}
    >
      <strong>{demoLabel ?? (count === null ? "\u2014" : count.toLocaleString(t.locale))}<sup>+</sup></strong>
    </aside>
  );
}
