import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useProfile, useUpdateProfile } from '@/hooks/api/use-profile';
import { ApiError } from '@/infrastructure/api/client';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
    }
  }, [profile]);

  const isDirty =
    name.trim() !== (profile?.name ?? '') ||
    email.trim() !== (profile?.email ?? '');

  const isLoading = updateProfile.isPending;

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Atenção', 'O nome não pode estar vazio.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Atenção', 'O e-mail não pode estar vazio.');
      return;
    }

    const payload: { name?: string; email?: string } = {};
    if (name.trim() !== profile?.name) payload.name = name.trim();
    if (email.trim() !== profile?.email) payload.email = email.trim().toLowerCase();

    if (Object.keys(payload).length === 0) {
      router.back();
      return;
    }

    try {
      await updateProfile.mutateAsync(payload);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.detail : 'Não foi possível atualizar o perfil.';
      Alert.alert('Erro', msg);
    }
  }

  if (loadingProfile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" style={{ color: Colors.primary }}>Cancelar</Text>
          </TouchableOpacity>
          <Text variant="callout" weight="semibold">Editar perfil</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" style={{ color: Colors.primary }}>Cancelar</Text>
          </TouchableOpacity>
          <Text variant="callout" weight="semibold">Editar perfil</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!isDirty || isLoading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              variant="body"
              weight="semibold"
              style={{ color: isDirty && !isLoading ? Colors.primary : theme.colors.textTertiary }}
            >
              Salvar
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.section}>
            <Text variant="label" style={styles.sectionLabel}>NOME</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Seu nome completo"
                placeholderTextColor={theme.colors.textTertiary}
                style={[styles.input, { color: theme.colors.text }]}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                maxLength={100}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="label" style={styles.sectionLabel}>E-MAIL</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                placeholderTextColor={theme.colors.textTertiary}
                style={[styles.input, { color: theme.colors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="done"
                maxLength={200}
              />
            </View>
          </View>

          <View style={[styles.section, { marginTop: Spacing[4] }]}>
            <Button
              title={isLoading ? 'Salvando...' : 'Salvar alterações'}
              onPress={handleSave}
              disabled={!isDirty || isLoading}
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: { padding: Spacing[4], paddingBottom: Spacing[12], gap: Spacing[4] },
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
  },
  input: {
    fontSize: FontSize.base,
    paddingVertical: Spacing[3],
  },
});
