import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Lembretes via notificação LOCAL agendada (expo-notifications).
 *
 * Observações de BUILD:
 * - `expo-notifications` já está no app.json (plugin configurado com icon/color).
 * - Notificações locais funcionam em dev client / build nativa; NÃO funcionam no
 *   Expo Go a partir do SDK 53+. Exige BUILD (dev client ou produção).
 * - No web não há agendamento nativo; as funções viram no-op para não quebrar.
 */

const isWeb = Platform.OS === 'web';

// Configura o handler uma única vez (mostra banner mesmo com app em foreground).
let handlerConfigured = false;
export function configureNotificationHandler() {
  if (handlerConfigured || isWeb) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Pede permissão de notificações. Retorna true se concedida.
 * Idempotente — se já concedida, não mostra prompt de novo.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (isWeb) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain && current.status === 'denied') return false;
    const req = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return req.granted;
  } catch {
    return false;
  }
}

interface SchedulableTask {
  id: number;
  title: string;
}

/** Formata 'HH:MM' a partir de um Date local. */
function formatHourLabel(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Agenda uma notificação LOCAL para `remindAtISO` (ISO sem timezone, hora local).
 * Retorna o id da notificação agendada (para cancelar depois) ou null se não pôde agendar.
 */
/** Recorrência da tarefa, para o lembrete acompanhar cada ocorrência. */
export type ReminderRecurrence = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  by_weekday: number[] | null; // 0=Dom .. 6=Sáb
};

/**
 * Agenda o lembrete local. Quando `recurrence` é informado e suportado
 * nativamente (diária/semanal/mensal/anual com intervalo 1), agenda uma
 * notificação RECORRENTE que dispara a cada ocorrência NO MESMO horário do
 * lembrete (ex.: na hora do evento ou 15 min antes). Caso contrário, agenda uma
 * única notificação na data. Para cancelar, use cancelTaskReminders(taskId).
 */
export async function scheduleTaskReminder(
  task: SchedulableTask,
  remindAtISO: string,
  recurrence?: ReminderRecurrence | null,
): Promise<string | null> {
  if (isWeb) return null;
  const date = parseLocalIso(remindAtISO);
  if (!date) return null;
  const granted = await ensureNotificationPermission();
  if (!granted) return null;

  configureNotificationHandler();

  const T = Notifications.SchedulableTriggerInputTypes;
  const hour = date.getHours();
  const minute = date.getMinutes();
  const content = {
    title: `🎯 Lembrete: ${task.title}`,
    body: recurrence ? 'Lembrete recorrente' : `Agendado para ${formatHourLabel(date)}`,
    data: { taskId: task.id } as Record<string, unknown>,
  };
  const sched = (trigger: Notifications.NotificationTriggerInput) =>
    Notifications.scheduleNotificationAsync({ content, trigger }).catch(() => null);

  try {
    // Recorrência nativa (intervalo 1) — repete "sempre" no mesmo horário.
    if (recurrence && recurrence.interval === 1) {
      if (recurrence.frequency === 'daily') {
        return await sched({ type: T.DAILY, hour, minute });
      }
      if (recurrence.frequency === 'weekly') {
        const days = recurrence.by_weekday?.length ? recurrence.by_weekday : [date.getDay()];
        let first: string | null = null;
        for (const bw of days) {
          // by_weekday 0=Dom..6=Sáb -> SDK weekday 1=Dom..7=Sáb.
          const id = await sched({ type: T.WEEKLY, weekday: (bw % 7) + 1, hour, minute });
          if (id && !first) first = id;
        }
        return first;
      }
      if (recurrence.frequency === 'monthly') {
        return await sched({ type: T.MONTHLY, day: date.getDate(), hour, minute });
      }
      if (recurrence.frequency === 'yearly') {
        return await sched({ type: T.YEARLY, day: date.getDate(), month: date.getMonth(), hour, minute });
      }
    }
    // Sem recorrência (ou intervalo>1 / não suportado nativamente): uma vez, no futuro.
    if (date.getTime() <= Date.now()) return null;
    return await sched({ type: T.DATE, date });
  } catch {
    return null;
  }
}

/** Cancela uma notificação local pelo identifier. */
export async function cancelTaskReminder(identifier: string): Promise<void> {
  if (isWeb || !identifier) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // ignore
  }
}

/** Cancela TODAS as notificações locais de uma tarefa (recorrentes ou não) via data.taskId. */
export async function cancelTaskReminders(taskId: string): Promise<void> {
  if (isWeb) return;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter((n) => (n.content?.data as { taskId?: string } | undefined)?.taskId === taskId)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => undefined)),
    );
  } catch {
    // ignore
  }
}

/**
 * Converte 'YYYY-MM-DDTHH:MM(:SS)?' (sem timezone) em Date local.
 * Evita o parsing UTC do `new Date(string)` para datas sem fuso.
 */
export function parseLocalIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(iso);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(
    parseInt(y, 10),
    parseInt(mo, 10) - 1,
    parseInt(d, 10),
    parseInt(h, 10),
    parseInt(mi, 10),
    s ? parseInt(s, 10) : 0,
  );
}
