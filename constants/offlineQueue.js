import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from './api';

const QUEUE_KEY = '@collectionapp_pending_collections';

export async function getQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    return Array.isArray(queue) ? queue : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function queueCollection(payload) {
  const queue = await getQueue();
  const entry = {
    localId: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    payload,
    queuedAt: new Date().toISOString(),
  };
  queue.push(entry);
  await saveQueue(queue);
  return entry;
}

export async function getQueueCount() {
  const queue = await getQueue();
  return queue.length;
}

// Attempts to POST every queued collection. Items that fail (still offline,
// or a genuine server rejection) stay in the queue for the next attempt.
export async function syncQueue() {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const remaining = [];
  let synced = 0;
  for (const item of queue) {
    try {
      const res = await fetch(`${API_BASE}/api/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });
      if (!res.ok) throw new Error();
      synced += 1;
    } catch {
      remaining.push(item);
    }
  }
  await saveQueue(remaining);
  return { synced, remaining: remaining.length };
}
