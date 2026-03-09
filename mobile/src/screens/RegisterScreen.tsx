import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../App';

// ── Register Screen ───────────────────────────────────────────────────────────

export default function RegisterScreen({ navigation }: any) {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    if (!firstName.trim()) {
      Alert.alert('Informação ausente', 'Por favor, insira seu nome.');
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert('Informação ausente', 'Por favor, insira seu sobrenome.');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Informação ausente', 'Por favor, insira seu endereço de email.');
      return false;
    }
    if (!password.trim()) {
      Alert.alert('Informação ausente', 'Por favor, escolha uma senha.');
      return false;
    }
    if (password.length < 8) {
      Alert.alert('Senha fraca', 'Sua senha deve ter pelo menos 8 caracteres.');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Senhas não coincidem', 'As senhas digitadas não coincidem.');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });
      // After successful registration, navigate to onboarding
      navigation.navigate('Onboarding');
    } catch (error: any) {
      Alert.alert(
        'Falha no cadastro',
        error.message || 'Algo deu errado. Por favor, tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backArrow}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Crie Sua Conta</Text>
          <Text style={styles.subtitle}>
            Comece sua jornada rumo a uma maior clareza mental
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <View style={styles.nameRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome"
                placeholderTextColor="#b0b8c1"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.label}>Sobrenome</Text>
              <TextInput
                style={styles.input}
                placeholder="Sobrenome"
                placeholderTextColor="#b0b8c1"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Endereço de Email</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor="#b0b8c1"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Pelo menos 8 caracteres"
                placeholderTextColor="#b0b8c1"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.showPasswordBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.showPasswordText}>
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite sua senha novamente"
              placeholderTextColor="#b0b8c1"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              editable={!isLoading}
            />
          </View>

          {/* Privacy Notice */}
          <View style={styles.privacyNotice}>
            <Text style={styles.privacyText}>
              Ao criar uma conta, você concorda com nossos{' '}
              <Text style={styles.privacyLink}>Termos de Serviço</Text>
              {' '}e{' '}
              <Text style={styles.privacyLink}>Política de Privacidade</Text>.
              Seus dados são criptografados e você controla quem tem acesso.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.registerButtonText}>Criar Conta</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={styles.loginSection}>
          <Text style={styles.loginText}>Já tem uma conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefdfb',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 20,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#374151',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
  },
  formSection: {
    marginBottom: 24,
  },
  nameRow: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  showPasswordBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  showPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  privacyNotice: {
    backgroundColor: '#fdf8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  privacyText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
  privacyLink: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 52,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 16,
  },
  loginText: {
    fontSize: 15,
    color: '#6b7280',
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#22c55e',
  },
});
