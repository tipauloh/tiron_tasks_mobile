import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FocusField = 'name' | 'email' | 'password' | 'confirm' | null;

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [focused, setFocused] = useState<FocusField>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const { register, isLoading, error, clearError } = useAuthStore();

  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const bgColor = isDark ? Colors.dark.background : '#F0F6FF';
  const cardBg = isDark ? Colors.dark.surface : Colors.light.surfaceElevated;
  const inputBg = isDark ? Colors.dark.background : Colors.light.surface;
  const borderDefault = isDark ? Colors.dark.border : Colors.light.border;

  const shownError = localError ?? error;

  const resetErrors = () => {
    if (localError) setLocalError(null);
    if (error) clearError();
  };

  const validate = (): string | null => {
    if (!name.trim()) return 'Informe seu nome.';
    if (!EMAIL_REGEX.test(email.trim())) return 'Informe um e-mail válido.';
    if (password.length < 8) return 'A senha deve ter ao menos 8 caracteres.';
    if (password !== confirm) return 'As senhas não conferem.';
    return null;
  };

  const handleRegister = async () => {
    resetErrors();
    const validationError = validate();
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      // AuthGuard redireciona para a área logada ao detectar isAuthenticated.
    } catch {
      // erro já está no store
    }
  };

  const borderColorFor = (field: FocusField) =>
    focused === field ? Colors.primary : shownError ? Colors.danger : borderDefault;

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
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>Criar conta</Text>
          <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
            Preencha os dados para começar
          </Text>
        </View>

        <View style={[styles.form, { backgroundColor: cardBg }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Nome</Text>
          <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: borderColorFor('name') }]}>
            <Ionicons
              name="person-outline"
              size={18}
              color={focused === 'name' ? Colors.primary : theme.textTertiary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Seu nome"
              placeholderTextColor={theme.textTertiary}
              value={name}
              onChangeText={(t) => { setName(t); resetErrors(); }}
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused(null)}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="name"
              returnKeyType="next"
            />
          </View>

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: Spacing[4] }]}>Email</Text>
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
              onChangeText={(t) => { setEmail(t); resetErrors(); }}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
            />
          </View>

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: Spacing[4] }]}>Senha</Text>
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
              onChangeText={(t) => { setPassword(t); resetErrors(); }}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              secureTextEntry
              textContentType="newPassword"
              returnKeyType="next"
            />
          </View>

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: Spacing[4] }]}>
            Confirmar senha
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
              placeholder="Repita a senha"
              placeholderTextColor={theme.textTertiary}
              value={confirm}
              onChangeText={(t) => { setConfirm(t); resetErrors(); }}
              onFocus={() => setFocused('confirm')}
              onBlur={() => setFocused(null)}
              secureTextEntry
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
          </View>

          {shownError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={Colors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{shownError}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              isLoading && styles.primaryBtnDisabled,
              pressed && !isLoading && styles.primaryBtnPressed,
            ]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Criar conta</Text>
              </>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textTertiary }]}>Já tem uma conta?</Text>
            <Link href="/(auth)/login" asChild>
              <Pressable hitSlop={8}>
                <Text style={styles.footerLink}>Entrar</Text>
              </Pressable>
            </Link>
          </View>
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing[5],
    gap: Spacing[1.5],
  },
  footerText: {
    fontSize: FontSize.sm,
  },
  footerLink: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold as '600',
  },
});
