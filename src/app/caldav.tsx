import React, { useMemo, useState } from 'react';
import {
  Alert,
  Clipboard,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Text, Button, Card } from '@/components/ui';
import { AppIcon } from '@/components/ui/AppIcon';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { CALDAV_SERVER_URL } from '@/infrastructure/api/caldav-api';
import {
  useCaldavTokens,
  useCreateCaldavToken,
} from '@/hooks/api/use-caldav';

const MASKED_PASSWORD = '••••• (gerada — toque em Regenerar para ver uma nova)';

function copyToClipboard(value: string, what: string) {
  // expo-clipboard não está instalado neste app; o módulo Clipboard legado do
  // react-native ainda está presente nesta versão e cobre iOS/Android.
  Clipboard.setString(value);
  Alert.alert('Copiado', `${what} copiado para a área de transferência.`);
}

function CopyRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.fieldRow, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.fieldContent}>
        <Text variant="label" secondary style={styles.fieldLabel}>
          {label}
        </Text>
        <Text variant="body" numberOfLines={1}>
          {value}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onCopy}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.copyBtn}
      >
        <Text variant="caption" weight="semibold" style={{ color: Colors.primary }}>
          Copiar
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function Collapsible({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Card style={styles.section}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.6}
      >
        <Text variant="callout" weight="semibold">
          {title}
        </Text>
        <AppIcon
          name={open ? 'chevronDown' : 'chevronRight'}
          size={18}
          color={theme.colors.textTertiary}
        />
      </TouchableOpacity>
      {open ? <View style={styles.collapsibleBody}>{children}</View> : null}
    </Card>
  );
}

export default function CaldavScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const tokensQuery = useCaldavTokens();
  const createMutation = useCreateCaldavToken();

  // Segredo recém-gerado: só existe em memória, mostrado uma única vez.
  const [freshSecret, setFreshSecret] = useState<string | null>(null);
  const [freshUsername, setFreshUsername] = useState<string | null>(null);

  const tokens = tokensQuery.data ?? [];
  // Token ativo = o mais recente não revogado (usado para o campo Usuário).
  const activeToken = useMemo(
    () => tokens.find((t) => !t.revoked) ?? tokens[0],
    [tokens],
  );

  const username = freshUsername ?? activeToken?.username ?? '';
  const hasToken = !!activeToken || !!freshSecret;
  const password = freshSecret ?? MASKED_PASSWORD;

  function generate(regenerate: boolean) {
    createMutation.mutate(
      { regenerate },
      {
        onSuccess: (res) => {
          setFreshSecret(res.data.token);
          setFreshUsername(res.data.username);
        },
        onError: () =>
          Alert.alert('Erro', 'Não foi possível gerar as credenciais. Tente novamente.'),
      },
    );
  }

  function handleRegenerate() {
    Alert.alert(
      'Regenerar token',
      'O token atual deixará de funcionar. Você precisará atualizar a senha nos apps já configurados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Regenerar',
          style: 'destructive',
          onPress: () => generate(true),
        },
      ],
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text variant="body" style={{ color: Colors.primary }}>
            ‹ Voltar
          </Text>
        </TouchableOpacity>
        <Text variant="callout" weight="semibold">
          CalDAV
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!hasToken ? (
          <View style={styles.disconnected}>
            <View style={styles.heroIcon}>
            <AppIcon name="caldav" size={56} color={Colors.primary} />
          </View>
            <Text variant="title" weight="bold" style={styles.heroTitle}>
              CalDAV
            </Text>
            <Text variant="body" secondary style={styles.heroText}>
              Gere credenciais para acessar suas tarefas e calendários em apps como o
              Calendário e o Lembretes do iPhone.
            </Text>
            <View style={styles.connectBtn}>
              <Button
                title="Gerar credenciais CalDAV"
                onPress={() => generate(false)}
                loading={createMutation.isPending}
                size="md"
              />
            </View>
          </View>
        ) : (
          <>
            <Card style={styles.section}>
              <CopyRow
                label="SERVIDOR"
                value={CALDAV_SERVER_URL}
                onCopy={() => copyToClipboard(CALDAV_SERVER_URL, 'Servidor')}
              />
              <CopyRow
                label="USUÁRIO"
                value={username || '—'}
                onCopy={() => copyToClipboard(username, 'Usuário')}
              />
              <View style={[styles.fieldRow, styles.fieldRowLast]}>
                <View style={styles.fieldContent}>
                  <Text variant="label" secondary style={styles.fieldLabel}>
                    SENHA
                  </Text>
                  <Text variant="body" numberOfLines={2}>
                    {password}
                  </Text>
                </View>
                {freshSecret ? (
                  <TouchableOpacity
                    onPress={() => copyToClipboard(freshSecret, 'Senha')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.copyBtn}
                  >
                    <Text variant="caption" weight="semibold" style={{ color: Colors.primary }}>
                      Copiar
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </Card>

            {freshSecret ? (
              <Text variant="caption" tertiary style={styles.note}>
                ⚠️ Anote a senha agora — ela não será exibida novamente. Se sair desta tela,
                gere um novo token para vê-la de novo.
              </Text>
            ) : null}

            <Button
              title="Regenerar token"
              onPress={handleRegenerate}
              loading={createMutation.isPending}
              variant="secondary"
              size="md"
            />
          </>
        )}

        <Collapsible title="Tutorial (iPhone)">
          <Text variant="body" secondary style={styles.tutorialLine}>
            1. Abra <Text weight="semibold">Ajustes</Text> →{' '}
            <Text weight="semibold">Apps</Text> →{' '}
            <Text weight="semibold">Calendário</Text> →{' '}
            <Text weight="semibold">Contas</Text> →{' '}
            <Text weight="semibold">Adicionar Conta</Text> →{' '}
            <Text weight="semibold">Outra</Text> →{' '}
            <Text weight="semibold">Adicionar conta CalDAV</Text>.
          </Text>
          <Text variant="body" secondary style={styles.tutorialLine}>
            2. Preencha:
          </Text>
          <Text variant="body" secondary style={styles.tutorialSub}>
            • <Text weight="semibold">Servidor:</Text> synctasks.tiron.com.br
          </Text>
          <Text variant="body" secondary style={styles.tutorialSub}>
            • <Text weight="semibold">Usuário:</Text> {username || 'seu usuário gerado'}
          </Text>
          <Text variant="body" secondary style={styles.tutorialSub}>
            • <Text weight="semibold">Senha:</Text> o token gerado acima
          </Text>
          <Text variant="body" secondary style={styles.tutorialLine}>
            Os calendários aparecem no app <Text weight="semibold">Calendário</Text> e as
            tarefas no app <Text weight="semibold">Lembretes</Text>.
          </Text>
        </Collapsible>

        <Collapsible title="Android e desktop">
          <Text variant="body" secondary style={styles.tutorialLine}>
            <Text weight="semibold">Android (DAVx5):</Text> instale o app DAVx5, adicione uma
            conta com login/senha e use a URL base {CALDAV_SERVER_URL} com o usuário e a senha
            acima.
          </Text>
          <Text variant="body" secondary style={styles.tutorialLine}>
            <Text weight="semibold">Thunderbird:</Text> em Calendário → Novo calendário → Na
            rede → CalDAV, informe a URL {CALDAV_SERVER_URL} e autentique com o usuário e a
            senha.
          </Text>
        </Collapsible>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: { padding: Spacing[4], gap: Spacing[4], paddingBottom: Spacing[12] },
  disconnected: { alignItems: 'center', paddingVertical: Spacing[8], gap: Spacing[2] },
  heroIcon: { marginBottom: Spacing[2] },
  heroTitle: { textAlign: 'center' },
  heroText: {
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing[1],
    paddingHorizontal: Spacing[2],
  },
  connectBtn: { alignSelf: 'stretch', marginTop: Spacing[6] },
  note: { textAlign: 'left', lineHeight: 20 },
  section: { gap: 0, padding: 0, overflow: 'hidden' },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldRowLast: { borderBottomWidth: 0 },
  fieldContent: { flex: 1, gap: 2 },
  fieldLabel: { letterSpacing: 0.6 },
  copyBtn: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.sm,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
  },
  collapsibleBody: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[2],
  },
  tutorialLine: { lineHeight: 21 },
  tutorialSub: { lineHeight: 21, paddingLeft: Spacing[3] },
});
