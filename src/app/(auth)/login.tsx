import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuthStore } from '@/store/auth-store';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';
import {
  APP_VERSION,
  APP_NAME,
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
} from '@/lib/config';
import { checkAndApplyUpdate, getUpdateInfo } from '@/lib/updates';

// Configura o Google Sign-In uma única vez no carregamento do módulo.
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
});

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { login, loginWithGoogle, loginWithApple, isLoading, error, clearError } =
    useAuthStore();
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  // Aviso de sucesso vindo de outras telas (ex.: redefinição de senha).
  const params = useLocalSearchParams<{ notice?: string }>();
  const [notice, setNotice] = useState<string | null>(params.notice ?? null);

  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  // Animação de fade-in no formulário
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe email e senha para continuar.');
      return;
    }
    clearError();
    try {
      await login(email.trim().toLowerCase(), password);
    } catch {
      // error já está no store
    }
  };

  const handleGoogle = async () => {
    clearError();
    setNotice(null);
    setOauthLoading('google');
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) {
        // Usuário cancelou — não mostramos erro.
        return;
      }
      const idToken = response.data.idToken;
      if (!idToken) {
        Alert.alert('Erro', 'Não foi possível obter o token do Google.');
        return;
      }
      await loginWithGoogle(idToken);
    } catch (e: unknown) {
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
        // cancelamento explícito — silencioso
        return;
      }
      // demais erros já são tratados no store (error) quando vêm da API;
      // erros nativos do SDK exibimos via Alert.
      if (!useAuthStore.getState().error) {
        const message = e instanceof Error ? e.message : 'Erro ao entrar com Google.';
        Alert.alert('Erro', message);
      }
    } finally {
      setOauthLoading(null);
    }
  };

  const handleApple = async () => {
    clearError();
    setNotice(null);
    setOauthLoading('apple');
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) {
        Alert.alert('Erro', 'Não foi possível obter o token da Apple.');
        return;
      }
      const fullName = cred.fullName;
      const name = fullName
        ? [fullName.givenName, fullName.familyName].filter(Boolean).join(' ').trim() || null
        : null;
      await loginWithApple(cred.identityToken, name);
    } catch (e: unknown) {
      if (
        e !== null &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code?: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        // Usuário cancelou — silencioso.
        return;
      }
      if (!useAuthStore.getState().error) {
        const message = e instanceof Error ? e.message : 'Erro ao entrar com Apple.';
        Alert.alert('Erro', message);
      }
    } finally {
      setOauthLoading(null);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    const result = await checkAndApplyUpdate();
    setCheckingUpdate(false);
    if (result.status === 'up-to-date') {
      Alert.alert('Atualizado', 'Você já está usando a versão mais recente.');
    } else if (result.status === 'error') {
      Alert.alert('Erro', 'Não foi possível verificar atualizações. Tente novamente.');
    } else if (result.status === 'skipped') {
      Alert.alert('Desenvolvimento', 'Atualizações OTA são aplicadas apenas em produção.');
    }
  };

  const updateInfo = getUpdateInfo();

  const bgColor = isDark ? Colors.dark.background : '#F0F6FF';
  const cardBg = isDark ? Colors.dark.surface : Colors.light.surfaceElevated;
  const inputBg = isDark ? Colors.dark.background : Colors.light.surface;
  const borderDefault = isDark ? Colors.dark.border : Colors.light.border;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bgColor }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          {/* Header com logo elaborado */}
          <View style={styles.header}>
            {/* Aura de fundo do logo — camadas simulando gradiente */}
            <View style={styles.logoAura3} />
            <View style={styles.logoAura2} />
            <View style={styles.logoAura1} />

            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
                accessibilityLabel="Tiron Tasks"
              />
            </View>

            {/* Faixa decorativa horizontal sob o logo */}
            <View style={styles.headerAccent}>
              <View style={[styles.accentDot, { backgroundColor: Colors.primary }]} />
              <View style={[styles.accentLine, { backgroundColor: Colors.primary, opacity: 0.3 }]} />
              <View style={[styles.accentDot, { backgroundColor: Colors.primary }]} />
            </View>

            <Text style={[styles.appName, { color: theme.text }]}>{APP_NAME}</Text>
            <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
              Organize suas tarefas com eficiência
            </Text>
          </View>

          {/* Formulário com fade-in */}
          <Animated.View
            style={[
              styles.form,
              { backgroundColor: cardBg, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {notice ? (
              <View style={styles.noticeBox}>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} style={{ marginRight: 6 }} />
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            ) : null}

            <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: inputBg,
                  borderColor: emailFocused
                    ? Colors.primary
                    : error
                    ? Colors.danger
                    : borderDefault,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={emailFocused ? Colors.primary : theme.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="seu@email.com"
                placeholderTextColor={theme.textTertiary}
                value={email}
                onChangeText={(t) => { setEmail(t); clearError(); setNotice(null); }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
              />
            </View>

            <Text style={[styles.label, { color: theme.textSecondary, marginTop: Spacing[4] }]}>
              Senha
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: inputBg,
                  borderColor: passwordFocused
                    ? Colors.primary
                    : error
                    ? Colors.danger
                    : borderDefault,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={passwordFocused ? Colors.primary : theme.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="••••••••"
                placeholderTextColor={theme.textTertiary}
                value={password}
                onChangeText={(t) => { setPassword(t); clearError(); }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
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
                styles.loginBtn,
                isLoading && styles.loginBtnDisabled,
                pressed && !isLoading && styles.loginBtnPressed,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.loginBtnText}>Entrar</Text>
                </>
              )}
            </Pressable>

            {/* Links de navegação: cadastro e recuperação de senha */}
            <View style={styles.authLinks}>
              <Link href="/(auth)/register" asChild>
                <Pressable hitSlop={8}>
                  <Text style={styles.authLink}>Criar conta</Text>
                </Pressable>
              </Link>
              <Link href="/(auth)/forgot-password" asChild>
                <Pressable hitSlop={8}>
                  <Text style={styles.authLink}>Esqueci minha senha</Text>
                </Pressable>
              </Link>
            </View>

            {/* OAuth — stubs (em breve) */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: borderDefault }]} />
              <Text style={[styles.dividerText, { color: theme.textTertiary }]}>ou continue com</Text>
              <View style={[styles.dividerLine, { backgroundColor: borderDefault }]} />
            </View>

            {/* OAuth — Apple primeiro, Google segundo, lado a lado e compactos. */}
            <View style={styles.oauthRow}>
              {/* Apple — botão preto + logo (Sign in with Apple guidelines). iOS apenas. */}
              {Platform.OS === 'ios' && (
                <Pressable
                  style={({ pressed }) => [
                    styles.oauthBtn,
                    { backgroundColor: '#000000', borderColor: '#000000' },
                    (oauthLoading !== null || isLoading) && styles.oauthBtnDisabled,
                    pressed && styles.oauthBtnDisabled,
                  ]}
                  onPress={handleApple}
                  disabled={oauthLoading !== null || isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Continuar com Apple"
                >
                  {oauthLoading === 'apple' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
                      <Text style={[styles.oauthBtnText, { color: '#FFFFFF' }]}>Apple</Text>
                    </>
                  )}
                </Pressable>
              )}

              {/* Google — botão branco + "G" colorido (Google Brand Guidelines). */}
              <Pressable
                style={({ pressed }) => [
                  styles.oauthBtn,
                  { backgroundColor: '#FFFFFF', borderColor: '#DADCE0' },
                  (oauthLoading !== null || isLoading) && styles.oauthBtnDisabled,
                  pressed && styles.oauthBtnDisabled,
                ]}
                onPress={handleGoogle}
                disabled={oauthLoading !== null || isLoading}
                accessibilityRole="button"
                accessibilityLabel="Continuar com Google"
              >
                {oauthLoading === 'google' ? (
                  <ActivityIndicator size="small" color="#3C4043" />
                ) : (
                  <>
                    <Image source={require('../../../assets/images/google-logo.png')} style={styles.oauthLogo} resizeMode="contain" />
                    <Text style={[styles.oauthBtnText, { color: '#3C4043' }]}>Google</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Animated.View>

          {/* Rodapé discreto: versão + OTA build */}
          <View style={styles.footer}>
            <Text style={[styles.versionText, { color: theme.textTertiary }]}>
              {`v${APP_VERSION}`}{updateInfo.updateId && !updateInfo.isEmbedded ? ` • build ${updateInfo.updateId.slice(0, 7)}` : ''}
            </Text>

            <Pressable
              style={[styles.updateBtn, { borderColor: borderDefault }]}
              onPress={handleCheckUpdate}
              disabled={checkingUpdate}
            >
              {checkingUpdate ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.updateBtnText}>Verificar atualização</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[8],
  },

  // Header
  header: {
    alignItems: 'center',
    marginTop: Spacing[8],
    marginBottom: Spacing[10],
  },

  // Aura layers — gradiente visual simulado com Views concêntricas
  logoAura3: {
    position: 'absolute',
    top: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primary,
    opacity: 0.06,
  },
  logoAura2: {
    position: 'absolute',
    top: -8,
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: Colors.primary,
    opacity: 0.1,
  },
  logoAura1: {
    position: 'absolute',
    top: 4,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: Colors.primary,
    opacity: 0.15,
  },

  logoContainer: {
    marginBottom: Spacing[3],
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 22,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },

  // Faixa decorativa
  headerAccent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[4],
    gap: Spacing[2],
  },
  accentDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  accentLine: {
    flex: 1,
    maxWidth: 48,
    height: 1.5,
  },

  appName: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold as '700',
    marginBottom: Spacing[1],
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },

  // Form
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

  // Input com ícone
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

  // Error
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

  // Botão de login
  loginBtn: {
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
  loginBtnPressed: {
    backgroundColor: Colors.primaryDark,
    shadowOpacity: 0.2,
    elevation: 2,
  },
  loginBtnDisabled: {
    opacity: 0.65,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold as '600',
    letterSpacing: 0.3,
  },

  // Notice de sucesso (ex.: senha redefinida)
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: Radius.md,
    padding: Spacing[3],
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  noticeText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.success,
  },

  // Links de auth (criar conta / esqueci senha)
  authLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing[4],
  },
  authLink: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium as '500',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing[5],
    gap: Spacing[3],
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },

  // OAuth — botões lado a lado e compactos
  oauthRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  oauthBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[3],
  },
  oauthBtnDisabled: {
    opacity: 0.6,
  },
  oauthLogo: {
    width: 18,
    height: 18,
  },
  oauthBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as '500',
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: Spacing[8],
    gap: Spacing[2],
  },
  versionText: {
    fontSize: FontSize.xs,
    letterSpacing: 0.3,
  },
  updateBtn: {
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    borderWidth: 1,
    minWidth: 160,
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
  },
  updateBtnText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium as '500',
  },
});
