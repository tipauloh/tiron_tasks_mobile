import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { AppIcon } from '@/components/ui/AppIcon';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useUpdateProfile } from '@/hooks/api/use-profile';
import { ApiError } from '@/infrastructure/api/client';

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  returnKeyType,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
}) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.section}>
      <Text variant="label" style={styles.sectionLabel}>{label}</Text>
      <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          style={[styles.input, { color: theme.colors.text, flex: 1 }]}
          secureTextEntry={!visible}
          textContentType="password"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType ?? 'done'}
          onSubmitEditing={onSubmitEditing}
        />
        <TouchableOpacity onPress={() => setVisible((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <AppIcon name={visible ? 'eyeOff' : 'eye'} size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ChangePasswordScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const updateProfile = useUpdateProfile();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const isLoading = updateProfile.isPending;
  const canSave = current.length > 0 && next.length >= 8 && next === confirm;

  async function handleSave() {
    if (next !== confirm) {
      Alert.alert('Atenção', 'A nova senha e a confirmação não coincidem.');
      return;
    }
    if (next.length < 8) {
      Alert.alert('Atenção', 'A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    try {
      await updateProfile.mutateAsync({
        current_password: current,
        password: next,
      });
      Alert.alert('Sucesso', 'Senha alterada com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.detail : 'Não foi possível alterar a senha.';
      Alert.alert('Erro', msg);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" style={{ color: Colors.primary }}>Cancelar</Text>
          </TouchableOpacity>
          <Text variant="callout" weight="semibold">Alterar senha</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          <View style={[styles.infoBox, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
            <AppIcon name="lock" size={20} color={theme.colors.textSecondary} />
            <Text variant="caption" secondary style={{ flex: 1 }}>
              Escolha uma senha com pelo menos 8 caracteres. Ela será necessária no próximo login.
            </Text>
          </View>

          <PasswordField
            label="SENHA ATUAL"
            value={current}
            onChangeText={setCurrent}
            placeholder="••••••••"
            returnKeyType="next"
          />

          <PasswordField
            label="NOVA SENHA"
            value={next}
            onChangeText={setNext}
            placeholder="Mínimo 8 caracteres"
            returnKeyType="next"
          />

          <PasswordField
            label="CONFIRMAR NOVA SENHA"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repita a nova senha"
            returnKeyType="done"
            onSubmitEditing={canSave ? handleSave : undefined}
          />

          {next.length > 0 && next !== confirm && confirm.length > 0 && (
            <View style={styles.errorRow}>
              <AppIcon name="warning" size={14} color={Colors.danger} />
              <Text variant="caption" style={{ color: Colors.danger }}>
                As senhas não coincidem
              </Text>
            </View>
          )}

          {next.length > 0 && next.length < 8 && (
            <View style={styles.errorRow}>
              <AppIcon name="warning" size={14} color={Colors.danger} />
              <Text variant="caption" style={{ color: Colors.danger }}>
                A senha deve ter pelo menos 8 caracteres
              </Text>
            </View>
          )}

          <View style={[styles.section, { marginTop: Spacing[4] }]}>
            <Button
              title={isLoading ? 'Salvando...' : 'Alterar senha'}
              onPress={handleSave}
              disabled={!canSave || isLoading}
              loading={isLoading}
              size="lg"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  scroll: { padding: Spacing[4], paddingBottom: Spacing[12], gap: Spacing[4] },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing[3],
    alignItems: 'flex-start',
    padding: Spacing[4],
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  section: { gap: Spacing[2] },
  sectionLabel: {
    fontSize: FontSize.xs,
    letterSpacing: 0.6,
    color: '#9CA3AF',
  },
  inputWrapper: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  input: {
    fontSize: FontSize.base,
    paddingVertical: Spacing[3],
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: -Spacing[2],
  },
});
