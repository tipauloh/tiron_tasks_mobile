import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { passwordRecoveryApi } from '@/infrastructure/api/password-recovery-api';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 'email' | 'reset';
type FocusField = 'email' | 'code' | 'password' | 'confirm' | null;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [focused, setFocused] = useState<FocusField>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const bgColor = isDark ? Colors.dark.background : '#F0F6FF';
  const cardBg = isDark ? Colors.dark.surface : Colors.light.surfaceElevated;
  const inputBg = isDark ? Colors.dark.background : Colors.light.surface;
  const borderDefault = isDark ? Colors.dark.border : Colors.light.border;

  const clearMessages = () => {
    if (error) setError(null);
  };

  const borderColorFor = (field: FocusField) =>
    focused === field ? Colors.primary : error ? Colors.danger : borderDefault;

  const handleForgot = async () => {
    clearMessages();
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Informe um e-mail válido.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await passwordRecoveryApi.forgot(email.trim().toLowerCase());
      setInfo(res.message ?? 'Enviamos um código para o seu e-mail.');
      setStep('reset');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar o código. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    clearMessages();
    if (!code.trim()) {
      setError('Informe o código recebido por e-mail.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter ao menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }
    setIsLoading(true);
    try {
      await passwordRecoveryApi.reset(email.trim().toLowerCase(), code.trim(), password);
      router.replace({
        pathname: '/(auth)/login',
        params: { notice: 'Senha redefinida com sucesso. Faça login.' },
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Não foi possível redefinir a senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bgColor }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => (step === 'reset' ? setStep('email') : router.back())}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>
            {step === 'email' ? 'Esqueci minha senha' : 'Redefinir senha'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
            {step === 'email'
              ? 'Informe seu e-mail e enviaremos um código para redefinir a senha.'
              : 'Informe o código recebido e escolha uma nova senha.'}
          </Text>
        </View>

        <View style={[styles.form, { backgroundColor: cardBg }]}>
          {step === 'email' ? (
            <>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: borderColorFor('email') }]}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={focused === 'email' ? Colors.primary : theme.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="seu@email.com"
                  placeholderTextColor={theme.textTertiary}
                  value={email}
                  onChangeText={(t) => { setEmail(t); clearMessages(); }}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={handleForgot}
                />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color={Colors.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  isLoading && styles.primaryBtnDisabled,
                  pressed && !isLoading && styles.primaryBtnPressed,
                ]}
                onPress={handleForgot}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Enviar código</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <>
              {info ? (
                <View style={styles.infoBox}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} style={{ marginRight: 6 }} />
                  <Text style={styles.infoText}>{info}</Text>
                </View>
              ) : null}

              <Text style={[styles.label, { color: theme.textSecondary }]}>Código</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: borderColorFor('code') }]}>
                <Ionicons
                  name="key-outline"
                  size={18}
                  color={focused === 'code' ? Colors.primary : theme.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Código recebido por e-mail"
                  placeholderTextColor={theme.textTertiary}
                  value={code}
                  onChangeText={(t) => { setCode(t); clearMessages(); }}
                  onFocus={() => setFocused('code')}
                  onBlur={() => setFocused(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <Text style={[styles.label, { color: theme.textSecondary, marginTop: Spacing[4] }]}>Nova senha</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: borderColorFor('password') }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focused === 'password' ? Colors.primary : theme.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Mínimo de 8 caracteres"
                  placeholderTextColor={theme.textTertiary}
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearMessages(); }}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  secureTextEntry
                  textContentType="newPassword"
                  returnKeyType="next"
                />
              </View>

              <Text style={[styles.label, { color: theme.textSecondary, marginTop: Spacing[4] }]}>
                Confirmar nova senha
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: borderColorFor('confirm') }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focused === 'confirm' ? Colors.primary : theme.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Repita a nova senha"
                  placeholderTextColor={theme.textTertiary}
                  value={confirm}
                  onChangeText={(t) => { setConfirm(t); clearMessages(); }}
                  onFocus={() => setFocused('confirm')}
                  onBlur={() => setFocused(null)}
                  secureTextEntry
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color={Colors.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  isLoading && styles.primaryBtnDisabled,
                  pressed && !isLoading && styles.primaryBtnPressed,
                ]}
                onPress={handleReset}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Redefinir senha</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={styles.resendBtn}
                onPress={handleForgot}
                disabled={isLoading}
                hitSlop={8}
              >
                <Text style={[styles.resendText, { color: theme.textTertiary }]}>
                  Não recebeu? Reenviar código
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[8],
  },
  header: {
    marginBottom: Spacing[8],
  },
  backBtn: {
    marginBottom: Spacing[4],
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold as '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: Spacing[1],
    lineHeight: 20,
  },
  form: {
    borderRadius: Radius.xl,
    padding: Spacing[6],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as '500',
    marginBottom: Spacing[2],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
  },
  inputIcon: {
    marginRight: Spacing[2],
  },
  input: {
    flex: 1,
    paddingVertical: Spacing[3],
    fontSize: FontSize.base,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: Radius.md,
    padding: Spacing[3],
    marginTop: Spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.danger,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: Radius.md,
    padding: Spacing[3],
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.success,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: Spacing[4],
    marginTop: Spacing[5],
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnPressed: {
    backgroundColor: Colors.primaryDark,
    shadowOpacity: 0.2,
    elevation: 2,
  },
  primaryBtnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold as '600',
    letterSpacing: 0.3,
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: Spacing[4],
  },
  resendText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as '500',
  },
});
