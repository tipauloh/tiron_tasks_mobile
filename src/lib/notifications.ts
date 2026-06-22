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
export async function scheduleTaskReminder(
  task: SchedulableTask,
  remindAtISO: string,
): Promise<string | null> {
  if (isWeb) return null;
  const date = parseLocalIso(remindAtISO);
  if (!date || date.getTime() <= Date.now()) {
    // No passado — nada a agendar localmente (o backend ainda guarda o registro).
    return null;
  }
  const granted = await ensureNotificationPermission();
  if (!granted) return null;

  configureNotificationHandler();

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎯 Lembrete: ${task.title}`,
        body: `Agendado para ${formatHourLabel(date)}`,
        data: { taskId: task.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
    return identifier;
  } catch {
    return null;
  }
}

/** Cancela uma notificação local agendada pelo identifier devolvido por scheduleTaskReminder. */
export async function cancelTaskReminder(identifier: string): Promise<void> {
  if (isWeb || !identifier) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
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
