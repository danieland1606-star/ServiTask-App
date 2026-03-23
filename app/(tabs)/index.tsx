import { StyleSheet, Text, View, TouchableOpacity, TextInput, SafeAreaView, ScrollView, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, LayoutAnimation, UIManager, Animated } from 'react-native';
import React, { useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_700Bold, Montserrat_900Black } from '@expo-google-fonts/montserrat';
import { supabase } from '../../lib/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

WebBrowser.maybeCompleteAuthSession();

// ══════════════════════════════════════════
// HOME SCREEN (MAIN APP)
// ══════════════════════════════════════════
function HomeScreen({ session, setSession }) {
  const [userName, setUserName] = useState('Tasker');

  useEffect(() => {
    if (session?.user?.user_metadata?.full_name) {
      setUserName(session.user.user_metadata.full_name.split(' ')[0]);
    }
  }, [session]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Error', error.message);
  };

  const CATEGORIES = [
    { id: "reparaciones", icon: "🔧", label: "Reparaciones" },
    { id: "estudios",     icon: "📚", label: "Clases" },
    { id: "limpieza",     icon: "🧹", label: "Limpieza" },
    { id: "tecnologia",   icon: "💻", label: "Tecnología" },
    { id: "construccion", icon: "🏗️", label: "Construcción" },
    { id: "exteriores",   icon: "🌿", label: "Exteriores" },
    { id: "otros",        icon: "➕", label: "Otros" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0F1A' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={{ padding: 24, paddingTop: Platform.OS === 'android' ? 40 : 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View>
              <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 13, marginBottom: 4 }}>📍 Guayaquil, Ecuador ▾</Text>
              <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#FFF', fontSize: 24, letterSpacing: -0.5 }}>Hola, {userName} 👋</Text>
            </View>
            <TouchableOpacity onPress={handleSignOut} style={{ width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 25, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="log-out" size={20} color="#FF5C3A" />
            </TouchableOpacity>
          </View>

          {/* SEARCH BAR */}
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <Feather name="search" size={20} color="#8B8FA8" style={{ marginRight: 10 }} />
            <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 15 }}>¿Qué servicio necesitas?</Text>
          </TouchableOpacity>
        </View>

        {/* PROMO BANNER */}
        <View style={{ marginHorizontal: 24, marginBottom: 30, backgroundColor: '#1A6BFF', borderRadius: 20, padding: 20, overflow: 'hidden' }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 10 }}>
            <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#FFF', fontSize: 11 }}>🔥 Oferta del día</Text>
          </View>
          <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#FFF', fontSize: 18, marginBottom: 4 }}>Primer servicio 20% OFF</Text>
          <Text style={{ fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Usa el código TASK20 al contratar</Text>
        </View>

        {/* CATEGORIES */}
        <View style={{ paddingHorizontal: 24, marginBottom: 30 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={{ fontFamily: 'Montserrat_900Black', color: '#FFF', fontSize: 18 }}>Categorías</Text>
            <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', fontSize: 13 }}>Ver todas</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {CATEGORIES.slice(0, 8).map((cat, i) => (
              <TouchableOpacity key={cat.id} style={{ width: '23%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                <Text style={{ fontSize: 24, marginBottom: 8 }}>{cat.icon}</Text>
                <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 10, textAlign: 'center' }}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* POPULAR SERVICES */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 50 }}>
          <Text style={{ fontFamily: 'Montserrat_900Black', color: '#FFF', fontSize: 18, marginBottom: 15 }}>Proyectos populares</Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity style={{ width: '48%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
              <View style={{ height: 100, backgroundColor: 'rgba(124, 58, 237, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 40 }}>🏠</Text>
              </View>
              <View style={{ padding: 12 }}>
                <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#FFF', fontSize: 13, marginBottom: 4 }}>Limpieza de casa</Text>
                <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 12 }}>Desde <Text style={{ color: '#7C3AED', fontWeight: 'bold' }}>$20</Text></Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={{ width: '48%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
              <View style={{ height: 100, backgroundColor: 'rgba(255, 92, 58, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 40 }}>🪑</Text>
              </View>
              <View style={{ padding: 12 }}>
                <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#FFF', fontSize: 13, marginBottom: 4 }}>Armado de muebles</Text>
                <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 12 }}>Desde <Text style={{ color: '#FF5C3A', fontWeight: 'bold' }}>$35</Text></Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM NAV BAR */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 15, backgroundColor: '#0D0F1A', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
        <TouchableOpacity style={{ alignItems: 'center' }}>
          <Feather name="home" size={24} color="#1A6BFF" />
          <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', fontSize: 10, marginTop: 4 }}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center' }}>
          <Feather name="search" size={24} color="#8B8FA8" />
          <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 10, marginTop: 4 }}>Buscar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center' }}>
          <Feather name="clipboard" size={24} color="#8B8FA8" />
          <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 10, marginTop: 4 }}>Pedidos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center' }}>
          <Feather name="user" size={24} color="#8B8FA8" />
          <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 10, marginTop: 4 }}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════
// AUTHENTICATION SCREEN
// ══════════════════════════════════════════
function AuthScreen() {
  const [mode, setModeState] = useState('welcome'); 
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateIsSet, setDateIsSet] = useState(false);
  
  const [frontId, setFrontId] = useState(null);
  const [backId, setBackId] = useState(null);
  const [selfie, setSelfie] = useState(null);

  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Transition Engine (True Fade Animation)
  const setMode = (newMode) => {
    if (Platform.OS === 'android') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setModeState(newMode);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  };
  
  const Requirement = ({ met, text }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
      <Feather name={met ? "check-circle" : "circle"} size={14} color={met ? "#22C55E" : "#8B8FA8"} />
      <Text style={{ color: met ? '#FFF' : '#8B8FA8', marginLeft: 8, fontSize: 13, fontFamily: 'Montserrat_400Regular' }}>{text}</Text>
    </View>
  );

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setBirthDate(selectedDate);
      setDateIsSet(true);
    }
  };

  const formatDate = (date) => {
    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0');
    let year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const pickImage = async (setImage) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const Stepper = ({ step, title, subtitle }) => (
    <View style={{ alignItems: 'center', marginBottom: 25, marginTop: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        {/* Circle 1 */}
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#1A6BFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#1A6BFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 }}>
          <Feather name={step >= 2 ? "check" : "user"} size={16} color="#FFF" />
        </View>
        
        {/* Line Progress */}
        <View style={{ width: 60, height: 3, backgroundColor: step >= 2 ? '#1A6BFF' : 'rgba(255,255,255,0.1)', marginHorizontal: 8, borderRadius: 2 }} />
        
        {/* Circle 2 */}
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: step >= 2 ? '#1A6BFF' : 'transparent', borderWidth: step >= 2 ? 0 : 2, borderColor: step >= 2 ? 'transparent' : 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', ...(step >= 2 ? { shadowColor: '#1A6BFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 } : {}) }}>
          <Feather name="camera" size={16} color={step >= 2 ? "#FFF" : "#8B8FA8"} />
        </View>
      </View>
      <Text style={{ fontFamily: 'Montserrat_900Black', color: '#FFF', fontSize: 18, marginBottom: 4 }}>{title}</Text>
      {subtitle && <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 13, textAlign: 'center' }}>{subtitle}</Text>}
    </View>
  );

  const goBack = () => {
    if (mode === 'login' || mode === 'register_step1') setMode('welcome');
    else if (mode === 'register_step2') setMode('register_step1');
    else if (mode === 'forgot_password') setMode('login');
    else if (mode === 'verify_otp') setMode('welcome');
  };

  const validateStep1AndProceed = () => {
    // Name validation
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    const nameTrimmed = name.trim();
    if (!nameTrimmed) return Alert.alert("Falta el nombre", "Ingresa tu nombre completo para continuar.");
    if (!nameRegex.test(nameTrimmed)) return Alert.alert("Nombre no válido", "El nombre no puede contener números ni símbolos.");
    if (nameTrimmed.split(' ').length < 2) return Alert.alert("Nombre incompleto", "Por favor ingresa al menos un nombre y un apellido.");

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return Alert.alert("Correo inválido", "Por favor escribe correctamente un correo válido.");
    
    // Birthday
    if (!dateIsSet) return Alert.alert("Falta Edad", "Por favor confirma tu fecha de nacimiento en el calendario.");

    // Password
    if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return Alert.alert("Contraseña débil", "Debes cumplir con todos los requisitos de seguridad en color verde.");
    }
    if (password !== confirmPassword) return Alert.alert("Contraseñas no coinciden", "Por favor verifica que escribiste la misma contraseña en ambos campos.");

    setMode('register_step2');
  };

  const handleSignUp = async () => {
    if (!frontId || !backId || !selfie) {
      Alert.alert("Faltan Documentos", "Debes adjuntar las tres fotos requeridas por seguridad.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email, password: password,
      options: { data: { full_name: name, birth_date: birthDate } }
    });
    
    if (error) {
      Alert.alert("Error de registro", error.message);
    } else if (data?.user?.identities && data.user.identities.length === 0) {
      // Supabase anti-spam security check: identities is empty if email already exists
      Alert.alert(
        "¡Correo en uso! ⚠️", 
        "Este correo electrónico ya está registrado en TASKER. Por favor, intenta conectar desde Iniciar Sesión o usa un correo totalmente nuevo."
      );
    } else {
      setMode('verify_otp');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Datos incompletos", "Por favor ingresa tu correo y contraseña.");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return Alert.alert("Correo inválido", "El formato del correo es incorrecto.");
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email, password: password,
    });
    if (error) Alert.alert("Error", "Correo o contraseña incorrectos.");
  };

  const handleVerifyOtp = async () => {
    const { error } = await supabase.auth.verifyOtp({
      email: email, token: otpCode, type: 'signup'
    });
    if (error) Alert.alert("Código Inválido", "El código ingresado es incorrecto o expiró.");
  };

  const handleForgotPassword = async () => {
    if (!email) return Alert.alert("Ops", "Ingresa por favor tu correo electrónico antes de pedir recuperación.");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return Alert.alert("Correo inválido", "Verifica el formato del correo.");
    
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) Alert.alert("Error", error.message);
    else Alert.alert("Enviado", "Revisa tu buzón para el enlace mágico.");
  };

  const handleGoogleLogin = async () => {
    try {
      const redirectUrl = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        Alert.alert("Google Error", error.message);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success' && result.url) {
          const hashArr = result.url.split('#');
          if (hashArr.length > 1) {
            const queryParams = hashArr[1].split('&').reduce((acc, current) => {
              const [key, value] = current.split('=');
              acc[key] = value;
              return acc;
            }, {});
            if (queryParams.access_token) {
              await supabase.auth.setSession({ 
                access_token: queryParams.access_token, 
                refresh_token: queryParams.refresh_token 
              });
            }
          }
        }
      }
    } catch (e) {
      console.log("Google SignIn Cancelled:", e);
    }
  };

  if (mode === 'welcome') {
    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.heroSection}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800' }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroLogoContainer}>
             <Text style={styles.heroLogoText}>⚡ TASK<Text style={styles.logoHighlight}>ER</Text></Text>
          </View>
        </View>

        <View style={styles.bottomSheet}>
          <Text style={styles.bottomSheetTitle}>Elige cómo quieres ingresar</Text>
          <TouchableOpacity style={[styles.socialButton, {backgroundColor: '#FFF'}]} onPress={handleGoogleLogin}>
            <View style={styles.socialIconWrapper}><Ionicons name="logo-google" size={20} color="#000" /></View>
            <Text style={[styles.socialButtonText, {color: '#000'}]}>Continuar con Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.socialButton, {backgroundColor: '#000', borderWidth: 1, borderColor: '#333'}]} onPress={() => Alert.alert("Apple", "Próximamente")}>
            <View style={styles.socialIconWrapper}><Ionicons name="logo-apple" size={20} color="#FFF" /></View>
            <Text style={[styles.socialButtonText, {color: '#FFF'}]}>Continuar con Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.socialButton, {backgroundColor: '#1C1F2E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginTop: 10}]} onPress={() => setMode('login')}>
            <Text style={[styles.socialButtonText, {color: '#FFF'}]}>Otro método (Correo y Clave)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <Text style={styles.backButtonText}>← Atrás</Text>
      </TouchableOpacity>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Text style={styles.icon}>⚡</Text>
            <Text style={styles.logo}>TASK<Text style={styles.logoHighlight}>ER</Text></Text>
          </View>

          <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
            {mode === 'login' && (
              <View>
                <Text style={styles.label}>Correo electrónico</Text>
                <TextInput style={[styles.input, { color: '#FFFFFF' }]} placeholder="correo@ejemplo.com" placeholderTextColor="#8B8FA8" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                <Text style={styles.label}>Contraseña</Text>
                <TextInput style={[styles.input, { color: '#FFFFFF' }]} placeholder="••••••••" placeholderTextColor="#8B8FA8" secureTextEntry value={password} onChangeText={setPassword} />
                <TouchableOpacity style={{ alignItems: 'flex-end', marginBottom: 25 }} onPress={() => setMode('forgot_password')}><Text style={{ fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', fontSize: 13 }}>¿Olvidaste tu clave?</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}><Text style={styles.primaryButtonText}>Entrar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]} onPress={() => setMode('register_step1')}><Text style={[styles.primaryButtonText, { color: '#8B8FA8' }]}>Registrarme</Text></TouchableOpacity>
              </View>
            )}

            {mode === 'register_step1' && (
              <View>
                <Stepper step={1} title="Datos Personales" subtitle="Información básica de tu cuenta" />
                
                <Text style={styles.label}>Nombre completo</Text>
                <TextInput style={[styles.input, { color: '#FFFFFF' }]} placeholder="Ej. Daniel Alarcón" placeholderTextColor="#8B8FA8" value={name} onChangeText={setName} />

                <Text style={styles.label}>Fecha de Nacimiento</Text>
                <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ fontFamily: 'Montserrat_400Regular', color: dateIsSet ? '#FFFFFF' : '#8B8FA8', fontSize: 15 }}>
                     {dateIsSet ? formatDate(birthDate) : "Toca para abrir calendario 📅"}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker value={birthDate} mode="date" display="spinner" maximumDate={new Date()} onChange={onDateChange} textColor="#FFF" />
                )}
                
                {Platform.OS === 'ios' && showDatePicker && (
                  <TouchableOpacity style={{backgroundColor: '#1A6BFF', padding: 10, borderRadius: 8, alignItems:'center', marginBottom:20}} onPress={() => setShowDatePicker(false)}>
                    <Text style={{fontFamily: 'Montserrat_700Bold', color:'#FFF'}}>Confirmar Fecha</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.label}>Correo electrónico</Text>
                <TextInput style={[styles.input, { color: '#FFFFFF' }]} placeholder="correo@ejemplo.com" placeholderTextColor="#8B8FA8" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

                <Text style={styles.label}>Crea tu Contraseña</Text>
                <TextInput style={[styles.input, { color: '#FFFFFF', marginBottom: 10 }]} placeholder="••••••••" placeholderTextColor="#8B8FA8" secureTextEntry value={password} onChangeText={setPassword} />

                <View style={{ marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                  <Text style={{ color: '#FFF', fontFamily: 'Montserrat_700Bold', marginBottom: 10, fontSize: 13 }}>Tu contraseña debe contener:</Text>
                  <Requirement met={hasUpperCase} text="1 Letra mayúscula" />
                  <Requirement met={hasLowerCase} text="1 Letra minúscula" />
                  <Requirement met={hasNumber} text="1 Número" />
                  <Requirement met={hasSpecialChar} text="1 Carácter especial (ej. !?<>@#$%)" />
                  <Requirement met={hasMinLength} text="8 Caracteres o más" />
                </View>

                <Text style={styles.label}>Confirmar Contraseña</Text>
                <TextInput style={[styles.input, { color: '#FFFFFF' }]} placeholder="••••••••" placeholderTextColor="#8B8FA8" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

                <TouchableOpacity style={styles.primaryButton} onPress={validateStep1AndProceed}>
                  <Text style={styles.primaryButtonText}>Siguiente Paso ➔</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'register_step2' && (
              <View>
                <Stepper step={2} title="Verificación de Identidad" subtitle="Toca los botones para adjuntar las fotos de tus documentos" />
                
                <Text style={styles.label}>Foto Frontal de Cédula</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(setFrontId)}>
                  {frontId ? <Image source={{ uri: frontId }} style={styles.imagePreview} /> : <Text style={styles.imagePickerText}>📷 Adjuntar frontal</Text>}
                </TouchableOpacity>

                <Text style={styles.label}>Foto Trasera de Cédula</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(setBackId)}>
                  {backId ? <Image source={{ uri: backId }} style={styles.imagePreview} /> : <Text style={styles.imagePickerText}>📷 Adjuntar trasera</Text>}
                </TouchableOpacity>

                <Text style={styles.label}>Selfie Sosteniendo Tu Cédula</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(setSelfie)}>
                  {selfie ? <Image source={{ uri: selfie }} style={styles.imagePreview} /> : <Text style={styles.imagePickerText}>🤳 Subir selfie</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#22C55E' }]} onPress={handleSignUp}>
                  <Text style={styles.primaryButtonText}>Crear Cuenta de TASKER</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'verify_otp' && (
               <View style={{ alignItems: 'center' }}>
                <View style={{ backgroundColor: 'rgba(26, 107, 255, 0.1)', padding: 20, borderRadius: 100, marginBottom: 20 }}>
                  <Text style={{ fontSize: 40 }}>✉️</Text>
                </View>
                <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#FFF', fontSize: 24, marginBottom: 10 }}>Verifica tu correo</Text>
                <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', textAlign: 'center', marginBottom: 30, fontSize: 15, lineHeight: 22 }}>
                  Hemos enviado un código mágico de 6 dígitos a: {"\n"}<Text style={{color: '#1A6BFF', fontWeight: 'bold'}}>{email}</Text>
                </Text>

                <TextInput 
                  style={[styles.input, { color: '#FFFFFF', fontSize: 32, textAlign: 'center', letterSpacing: 15, width: '100%', marginBottom: 30 }]} 
                  placeholder="000000" 
                  placeholderTextColor="rgba(139, 143, 168, 0.3)" 
                  keyboardType="numeric" 
                  maxLength={6}
                  value={otpCode} 
                  onChangeText={setOtpCode} 
                />

                <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp}>
                  <Text style={styles.primaryButtonText}>Verificar Código</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'forgot_password' && (
              <View>
                <Text style={styles.label}>Correo para recuperar</Text>
                <TextInput style={[styles.input, { color: '#FFFFFF' }]} placeholder="correo@gmail.com" placeholderTextColor="#8B8FA8" autoCapitalize="none" value={email} onChangeText={setEmail} />
                <TouchableOpacity style={styles.primaryButton} onPress={handleForgotPassword}><Text style={styles.primaryButtonText}>Enviar Enlace</Text></TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════
// MAIN APP ROUTER (Decides Auth vs Home)
// ══════════════════════════════════════════
export default function App() {
  let [fontsLoaded] = useFonts({ Montserrat_400Regular, Montserrat_700Bold, Montserrat_900Black });
  const [session, setSession] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!sessionChecked || !fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#0D0F1A', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#1A6BFF" size="large" /></View>;
  }

  if (session && session.user) {
    return <HomeScreen session={session} setSession={setSession} />;
  }

  return <AuthScreen />;
}

const styles = StyleSheet.create({
  welcomeContainer: { flex: 1, backgroundColor: '#0D0F1A' },
  heroSection: { flex: 1, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  heroImage: { position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: { position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(13, 15, 26, 0.4)' },
  heroLogoContainer: { alignItems: 'center', marginTop: '-15%' },
  heroLogoText: { fontFamily: 'Montserrat_900Black', fontSize: 50, color: '#FFF', letterSpacing: -1, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 10 },
  bottomSheet: { backgroundColor: '#0D0F1A', paddingHorizontal: 24, paddingTop: 30, paddingBottom: 50, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  bottomSheetTitle: { fontFamily: 'Montserrat_700Bold', color: '#FFF', fontSize: 20, marginBottom: 25, textAlign: 'center' },
  socialButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 30, marginBottom: 12 },
  socialIconWrapper: { position: 'absolute', left: 24 },
  socialButtonText: { fontFamily: 'Montserrat_700Bold', fontSize: 16 },

  container: { flex: 1, backgroundColor: '#0D0F1A' },
  backButton: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  backButtonText: { fontFamily: 'Montserrat_700Bold', color: '#8B8FA8' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 40 },
  header: { paddingTop: 80, paddingBottom: 30, alignItems: 'center' },
  icon: { fontSize: 48, marginBottom: 10 },
  logo: { fontFamily: 'Montserrat_900Black', fontSize: 32, color: '#FFF', letterSpacing: -1 },
  logoHighlight: { color: '#1A6BFF' },
  formContainer: { paddingHorizontal: 24, width: '100%', maxWidth: 450, alignSelf: 'center' },
  label: { fontFamily: 'Montserrat_700Bold', color: '#8B8FA8', fontSize: 12, marginBottom: 8, textTransform: 'uppercase' },
  input: { fontFamily: 'Montserrat_400Regular', color: '#FFF', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 18, fontSize: 15 },
  datePickerButton: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 18, justifyContent: 'center' },
  imagePicker: { width: '100%', height: 110, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePickerText: { fontFamily: 'Montserrat_700Bold', color: '#1A6BFF' },
  primaryButton: { backgroundColor: '#1A6BFF', padding: 16, borderRadius: 10, alignItems: 'center', width: '100%', marginBottom: 15 },
  primaryButtonText: { fontFamily: 'Montserrat_700Bold', color: '#FFF', fontSize: 16 },
});
