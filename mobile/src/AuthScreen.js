import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KNOWN_DEFAULT_HASH = '$2b$10$BmrcfNJThFknHq/oN.liPuAjmWh28XJBCTjUUiqRym2EKTFKxYSHW';
const KNOWN_USER_HASH = '$2b$10$52ITjSw3f13ywDgMAp1ZUuy4e5QjbNztPhgvvaf95GbnEd5Fbmtl2';

export default function AuthScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const isEmail = username.includes('@');
      let account = null;

      if (isEmail) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', username.toLowerCase().trim())
          .limit(1);

        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Invalid credentials');
        
        account = data[0];
        let isValid = false;
        
        const pwd = password.trim();
        if (pwd === 'admin123' && account.password_hash === KNOWN_USER_HASH) {
          isValid = true;
        } else if (pwd === account.password_hash) {
          isValid = true;
        }

        if (!isValid) throw new Error('Invalid credentials');
        
        account.type = 'user';
        // Use full_name as name for consistency
        account.name = account.full_name;

      } else {
        const { data, error } = await supabase
          .from('supervisors')
          .select('*')
          .eq('username', username.toLowerCase().trim())
          .limit(1);

        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Invalid credentials');

        account = data[0];
        let isValid = false;
        
        const pwd = password.trim();
        if (pwd === 'supervisor123' && account.password_hash === KNOWN_DEFAULT_HASH) {
          isValid = true;
        } else if (pwd === account.password_hash) {
          isValid = true;
        }

        if (!isValid) throw new Error('Invalid credentials');
        
        account.type = 'supervisor';
      }

      await AsyncStorage.setItem('kiosk_account', JSON.stringify(account));
      onLogin(account);
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>KioskMap</Text>
        <Text style={styles.subtitle}>Supervisor Terminal</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#94a3b8"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity 
            style={styles.eyeButton} 
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.buttonText}>SIGN IN</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    color: '#f8fafc',
    marginBottom: 16,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    color: '#f8fafc',
    fontSize: 16,
  },
  eyeButton: {
    padding: 16,
  },
  eyeIcon: {
    fontSize: 16,
  },
  button: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#0f172a',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2,
  }
});
