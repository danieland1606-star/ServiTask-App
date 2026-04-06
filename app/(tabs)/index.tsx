import { StyleSheet, Text, View, TouchableOpacity, TextInput, SafeAreaView, ScrollView, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, LayoutAnimation, UIManager, Animated, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import React, { useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [userName, setUserName] = useState('ServiTask');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [step, setStep] = useState('category'); // 'category' | 'form' | 'waiting_proposals' | 'orders' | 'profile'
  const [activeJobId, setActiveJobId] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [userRating, setUserRating] = useState('5.0'); // Base rating if no reviews
  const [availableJobs, setAvailableJobs] = useState([]);
  const [isTaskerMode, setIsTaskerMode] = useState(true); 
  const [isOnline, setIsOnline] = useState(true);

  const getInitials = (fullName) => {
    if (!fullName) return 'U';
    const names = fullName.trim().split(' ');
    if (names.length >= 2) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    return names[0][0].toUpperCase();
  };

  const hammerAnim = React.useRef(new Animated.Value(1)).current;
  const hammerRotate = React.useRef(new Animated.Value(0)).current;
  const mainFadeAnim = React.useRef(new Animated.Value(1)).current;

  const transitionToStep = (newStep) => {
    // Immediate transition as requested
    Animated.timing(mainFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(newStep);
      Animated.timing(mainFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  React.useEffect(() => {
    if (step === 'waiting_proposals') {
      // Scale Pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(hammerAnim, { toValue: 1.1, duration: 400, useNativeDriver: true }),
          Animated.timing(hammerAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ])
      ).start();

      // Hammer Hit rotation
      Animated.loop(
        Animated.sequence([
          Animated.timing(hammerRotate, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(hammerRotate, { toValue: 0, duration: 150, useNativeDriver: true }),
          Animated.delay(200),
        ])
      ).start();
    }
  }, [step]);

  const rotation = hammerRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-35deg']
  });
  
  // Fetch user rating from reviews table
  useEffect(() => {
    const fetchRating = async () => {
      if (!session?.user?.id || step !== 'profile') return;
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('rating')
          .eq('target_id', session.user.id);
        
        if (data && data.length > 0) {
          const avg = data.reduce((acc, curr) => acc + curr.rating, 0) / data.length;
          setUserRating(avg.toFixed(1));
        }
      } catch (err) {
        console.log('Error fetching rating:', err);
      }
    };
    fetchRating();
  }, [step, session]);

  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAiFiltered, setIsAiFiltered] = useState(false);
  const [recentSearches, setRecentSearches] = useState(["Revisión de tuberías", "Mi lavabo gotea"]);
  const [isLocating, setIsLocating] = useState(false);
  const [showProvModal, setShowProvModal] = useState(false); // Deprecated in favor of map
  const [showMapModal, setShowMapModal] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [mapRegion, setMapRegion] = useState({ latitude: -2.1894, longitude: -79.8890, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  const [location, setLocation] = useState('Buscando...');
  const [savedLocations, setSavedLocations] = useState([
    { id: '1', name: 'Ubicación actual', address: 'Buscando vía GPS...', icon: 'crosshair', isCurrent: true },
    { id: '2', name: 'Casa', address: 'Mz 40, Villa 12, Norte de Guayaquil', icon: 'home' },
    { id: '3', name: 'Oficina', address: 'Edificio Roraima, Centro de Guayaquil', icon: 'briefcase' }
  ]);
  const [addressDetails, setAddressDetails] = useState('');
  const [duration, setDuration] = useState('1 hora o fracción');
  const [priceMin, setPriceMin] = useState('20');
  const [priceMax, setPriceMax] = useState('50');
  const [details, setDetails] = useState('');
  const [needsMeasurements, setNeedsMeasurements] = useState('');
  const [attachments, setAttachments] = useState([]);
  
  // Premium Location Form Detail States
  const [showLocationDetailForm, setShowLocationDetailForm] = useState(false);
  const [locMz, setLocMz] = useState('');
  const [locVilla, setLocVilla] = useState('');
  const [locSolar, setLocSolar] = useState('');
  const [locDepto, setLocDepto] = useState('');
  const [locRef, setLocRef] = useState('');
  const [locAlias, setLocAlias] = useState('');
  const [locTempBase, setLocTempBase] = useState(''); // Geocoded address from map
  
  // Custom measurements state
  const [whatToMeasure, setWhatToMeasure] = useState([]);
  const [customMeasurement, setCustomMeasurement] = useState('');
  const [specificTools, setSpecificTools] = useState('');
  const [measurePriceMin, setMeasurePriceMin] = useState('5.00');
  const [measurePriceMax, setMeasurePriceMax] = useState('25.00');
  const [measureSliderWidth, setMeasureSliderWidth] = useState(0);
  
  const [sliderWidth, setSliderWidth] = useState(0);

  const resetFormState = () => {
    // Keep current location label to avoid reverting to 'Ubicación actual'
    setAddressDetails('');
    setDuration('1 hora o fracción');
    setPriceMin('20');
    setPriceMax('50');
    setDetails('');
    setNeedsMeasurements('');
    setAttachments([]);
    setWhatToMeasure([]);
    setCustomMeasurement('');
    setSpecificTools('');
    setMeasurePriceMin('5.00');
    setMeasurePriceMax('25.00');
  };

  const PROVINCES = ["Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja", "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza", "Pichincha", "Santa Elena", "Santo Domingo", "Sucumbíos", "Tungurahua", "Zamora Chinchipe"];

  const toggleMeasurement = (item) => {
    if (whatToMeasure.includes(item)) {
      setWhatToMeasure(whatToMeasure.filter(i => i !== item));
    } else {
      setWhatToMeasure([...whatToMeasure, item]);
    }
  };

  const handleMeasureSliderTouch = (e) => {
    if (measureSliderWidth === 0) return;
    const locX = Math.max(0, Math.min(e.nativeEvent.locationX, measureSliderWidth));
    const minLimit = 5, maxLimit = 50;
    const val = Math.round((locX / measureSliderWidth) * (maxLimit - minLimit) + minLimit);
    
    const curMin = parseInt(measurePriceMin) || minLimit;
    const curMax = parseInt(measurePriceMax) || maxLimit;

    if (Math.abs(val - curMin) < Math.abs(val - curMax)) {
      setMeasurePriceMin(String(Math.min(val, curMax - 5)) + '.00');
    } else {
      setMeasurePriceMax(String(Math.max(val, curMin + 5)) + '.00');
    }
  };

  const handleSliderTouch = (e) => {
    if (sliderWidth === 0) return;
    const locX = Math.max(0, Math.min(e.nativeEvent.locationX, sliderWidth));
    const minLimit = 10, maxLimit = 300;
    const val = Math.round((locX / sliderWidth) * (maxLimit - minLimit) + minLimit);
    
    const curMin = parseInt(priceMin) || minLimit;
    const curMax = parseInt(priceMax) || maxLimit;

    if (Math.abs(val - curMin) < Math.abs(val - curMax)) {
      setPriceMin(String(Math.min(val, curMax - 5)));
    } else {
      setPriceMax(String(Math.max(val, curMin + 5)));
    }
  };

  useEffect(() => {
    if (session?.user?.user_metadata?.full_name) {
      setUserName(session.user.user_metadata.full_name.split(' ')[0]);
    }
  }, [session]);

  // Auto-detect location silently on mount
  useEffect(() => {
    let isMounted = true;
    const detectLocation = async () => {
      // Defer heavy GPS access to prevent freezing the UI thread during dashboard mount
      await new Promise(resolve => setTimeout(resolve, 800));
      if (!isMounted) return;
      
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocation('Ubicación no disponible');
          return;
        }
        setLocation('Detectando...');
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        let geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geocode && geocode.length > 0) {
          const g = geocode[0];
          const city = g.city || g.subregion || g.region || '';
          const country = g.country || '';
          const label = city && country ? `${city}, ${country}` : city || country || 'Mi ubicación';
          setLocation(label);
          // Also update mapRegion silently
          setMapRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
          // Update savedLocations current entry (Name and address)
          setSavedLocations(prev => prev.map(sl =>
            sl.isCurrent ? { ...sl, name: city || 'Mi ubicación', address: label } : sl
          ));
        } else {
          setLocation('Mi ubicación');
        }
      } catch {
        setLocation('Guayaquil, Ecuador');
      }
    };
    detectLocation();
    return () => { isMounted = false; };
  }, []);


  const handleSignOut = () => {
    Alert.alert(
      "¿Cerrar sesión?",
      "¿Estás seguro que deseas salir de tu cuenta de ServiTask?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, cerrar sesión", 
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) Alert.alert('Error', error.message);
          }
        }
      ]
    );
  };

  const handleGetLocation = async () => {
    try {
      setIsLocating(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Sigue tu camino 📍', 'Para sugerir tu dirección automáticamente, ServiTask necesita acceso al GPS de tu dispositivo. Puedes habilitarlo en Configuración.');
        setIsLocating(false);
        return;
      }
      
      let locationObj = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      
      setMapRegion({
        latitude: locationObj.coords.latitude,
        longitude: locationObj.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      setShowMapModal(true);

    } catch (err) {
      Alert.alert('Error GPS', 'Asegúrate de tener la ubicación encendida o prueba arrastrar el mapa manualmente.');
      setShowMapModal(true);
    } finally {
      setIsLocating(false);
    }
  };

  const handlePickMedia = async (useCamera = false) => {
    try {
      let result;
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.7,
      };

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permiso', 'Se necesita acceso a la cámara de tu celular.');
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permiso', 'Se necesita acceso a la galería de fotos.');
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachments(prev => [...prev, result.assets[0]]);
      }
    } catch (e) {
      Alert.alert('Error al adjuntar', 'Ocurrió un problema cargando el archivo multimedia.');
    }
  };

  const removeAttachment = (indexToRemove) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handlePostJob = async () => {
    if (!selectedCategory || selectedSubs.length === 0) return;
    setIsLocating(true); // Reusing as loading state
    
    const { data, error } = await supabase
      .from('jobs')
      .insert([{
        client_id: session.user.id,
        category: selectedCategory.id,
        subcategory: selectedSubs.join(', '),
        details: needsMeasurements === 'SÍ' ? `[MEDIDAS EXACTAS REQUERIDAS] - Medir: ${whatToMeasure.join(', ')}${customMeasurement ? ` (${customMeasurement})` : ''} | Herramientas: ${specificTools || 'Sin especificar'} | Presup. medidas: $${measurePriceMin}-$${measurePriceMax}\n\nDetalles adicionales: ${details}` : details,
        price_min: parseInt(priceMin) || 0,
        price_max: parseInt(priceMax) || 0,
        location_label: location,
        status: 'pending'
      }])
      .select();

    setIsLocating(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setActiveJobId(data[0].id);
      
      // Navigate first, keep the data in state so the Waiting screen can render it!
      transitionToStep('waiting_proposals');
      resetFormState();
      // Subscribe to proposals for this job
      const subscription = supabase
        .channel(`job_proposals_${data[0].id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'proposals', filter: `job_id=eq.${data[0].id}` }, 
          payload => {
            setProposals(prev => [...prev, payload.new]);
          }
        )
        .subscribe();
    }
  };


  const fetchAvailableJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setAvailableJobs(data);
    } catch (err) {
      console.log('Error fetching available jobs:', err);
    }
  };

  // Real-time subscription for new jobs
  useEffect(() => {
    if (!isTaskerMode || !isOnline) return;

    fetchAvailableJobs();

    const subscription = supabase
      .channel('public:jobs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs', filter: 'status=eq.pending' }, 
        payload => {
          setAvailableJobs(prev => [payload.new, ...prev]);
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs' }, 
        payload => {
          if (payload.new.status !== 'pending') {
            setAvailableJobs(prev => prev.filter(j => j.id !== payload.new.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [isTaskerMode, isOnline]);

  const handleInterest = async (jobId) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .insert([{
          job_id: jobId,
          tasker_id: session.user.id,
          tasker_name: userName,
          price: parseInt(priceMin) || 0,
          status: 'pending'
        }]);
      
      if (error) throw error;
      Alert.alert("¡Enviado!", "Tu interés ha sido notificado al cliente.");
      setSelectedOrder(null);
    } catch (err) {
      Alert.alert("Error", "No se pudo enviar: " + err.message);
    }
  };

  const CATEGORIES = [
    { 
      id: "reparaciones",
      iconLib: 'MaterialCommunityIcons', iconName: 'wrench', color: '#8B6A56', pastelColor: '#F5EBE0',
      label: "Reparaciones",
      subs: [
        { name: "Mantenimiento/Reparaciones de casa" },
        { name: "Reparaciones plomería" },
        { name: "Sellado / Filtraciones" },
        { name: "Reparacion electrica" },
        { name: "Reparaciones electrodomésticos" },
        { name: "Ajuste cajones / repisas" },
        { name: "Reparaciones gasfitero" },
        { name: "Presion de agua" },
        { name: "Reparaciones paredes" },
        { name: "Aparatos Tecnológicos" },
        { name: "Otros.." }
      ]
    },
    { 
      id: "limpieza",
      iconLib: 'MaterialCommunityIcons', iconName: 'spray-bottle', color: '#7C3AED', pastelColor: '#F3E8FF',
      label: "Limpieza",
      subs: [
        { name: "Limpieza Residencial" },
        { name: "Limpieza Bodegas / Oficinas" },
        { name: "Limpieza de ropa" },
        { name: "Limpieza de Vehiculos" },
        { name: "Limpieza de exteriores" },
        { name: "Otros.." }
      ]
    },
    { 
      id: "exteriores",
      iconLib: 'MaterialCommunityIcons', iconName: 'leaf', color: '#16A34A', pastelColor: '#DCFCE7',
      label: "Exteriores y Jardin",
      subs: [
        { name: "Terrenos" },
        { name: "Plantacion de flores" },
        { name: "Instalacion Cesped" },
        { name: "Mantenimiento / cuidado de Jardín" },
        { name: "Control de plagas" },
        { name: "Otros.." }
      ]
    },
    { 
      id: "construccion",
      iconLib: 'MaterialCommunityIcons', iconName: 'hard-hat', color: '#F59E0B', pastelColor: '#FEF3C7',
      label: "Construcción",
      subs: [
        { name: "Ensamblar /Montar /Instalar Equipos de oficina" },
        { name: "Instalar cosas de casa" },
        { name: "Armado / ensamblaje cosas de casa" },
        { name: "Instalaciones puertas / repisas" },
        { name: "Instalacion electrodomesticos" },
        { name: "Instalación electricidad" },
        { name: "Montaje / Armar exteriores" },
        { name: "Montaje / Armar interiores" },
        { name: "Instalacion tecnologia (TV, Parlante etc..)" },
        { name: "Otros.." }
      ]
    },
    { 
      id: "otros",
      iconLib: 'MaterialCommunityIcons', iconName: 'dots-horizontal-circle', color: '#EC4899', pastelColor: '#FCE7F3',
      label: "Otros",
      subs: [
        { name: "Cualquier otra tarea" }
      ]
    },
  ];


  const toggleSub = (subName) => {
    if (selectedSubs.includes(subName)) {
      setSelectedSubs(selectedSubs.filter(s => s !== subName));
    } else {
      setSelectedSubs([...selectedSubs, subName]);
    }
  };

  const GEMINI_API_KEY = "PEGA_TU_API_KEY_AQUI"; // REEMPLAZAR CON LA CLAVE REAL DE GEMINI

  const handleSmartSearch = async (overrideQuery = null) => {
    const q = overrideQuery || searchQuery;
    if (!q.trim()) return;
    
    setIsSearching(true);

    try {
      const promptText = `
        Eres el asistente inteligente de ServiTask. El usuario escribirá una necesidad o problema que tiene.
        Tu trabajo es clasificar su problema en EXACTAMENTE UNA de estas categorías y UNA de sus subcategorías relacionadas:
        
        Categorías disponibles:
        - "reparaciones" (Subs: Mantenimiento/Reparaciones de casa, Reparaciones plomería, Sellado / Filtraciones, Reparacion electrica, Reparaciones electrodomésticos, Ajuste cajones / repisas, Reparaciones gasfitero, Presion de agua, Reparaciones paredes, Aparatos Tecnológicos, Otros..)
        - "limpieza" (Subs: Limpieza Residencial, Limpieza Bodegas / Oficinas, Limpieza de ropa, Limpieza de Vehiculos, Limpieza de exteriores, Otros..)
        - "exteriores" (Subs: Terrenos, Plantacion de flores, Instalacion Cesped, Mantenimiento / cuidado de Jardín, Control de plagas, Otros..)
        - "construccion" (Subs: Ensamblar /Montar /Instalar Equipos de oficina, Instalar cosas de casa, Armado / ensamblaje cosas de casa, Instalaciones puertas / repisas, Instalacion electrodomesticos, Instalación electricidad, Montaje / Armar exteriores, Montaje / Armar interiores, Instalacion tecnologia (TV, Parlante etc..), Otros..)

        Importante: Devuelve SOLO Y ÚNICAMENTE un objeto JSON válido.
        Formato requerido: {"categoryId": "id_categoria_aqui", "subCategory": "Nombre_Subcategoria_exacto_aqui"}
        
        Texto del usuario: "${q}"
      `;

      if (GEMINI_API_KEY === "PEGA_TU_API_KEY_AQUI") {
        await new Promise(r => setTimeout(r, 1200));
        let mockCategory = "reparaciones";
        let mockSub = "Mantenimiento/Reparaciones de casa";
        
        const qLower = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Normalize accents
        if (qLower.includes("limpi") || qLower.includes("sucia") || qLower.includes("lavar")) { 
          mockCategory = "limpieza"; 
          mockSub = "Limpieza Residencial"; 
        }
        else if (qLower.includes("agua") || qLower.includes("tubo") || qLower.includes("got") || qLower.includes("plom") || qLower.includes("llave")) { 
          mockCategory = "reparaciones"; 
          mockSub = "Reparaciones plomería"; 
        }
        else if (qLower.includes("jardin") || qLower.includes("pasto") || qLower.includes("cesped") || qLower.includes("flor")) { 
          mockCategory = "exteriores"; 
          mockSub = "Mantenimiento / cuidado de Jardín"; 
        }
        else if (qLower.includes("celu") || qLower.includes("tablet") || qLower.includes("telef") || qLower.includes("pc") || qLower.includes("tecn") || qLower.includes("compu")) {
          mockCategory = "reparaciones";
          mockSub = "Aparatos Tecnológicos";
        }
        else if (qLower.includes("tv") || qLower.includes("televis") || qLower.includes("parlant") || qLower.includes("sonid")) {
          mockCategory = "construccion";
          mockSub = "Instalacion tecnologia (TV, Parlante etc..)";
        }
        else if (qLower.includes("ac") || qLower.includes("aire") || qLower.includes("frio") || qLower.includes("calor") || qLower.includes("instal")) {
          mockCategory = "construccion";
          mockSub = "Instalacion electrodomesticos";
        }

        const foundCat = CATEGORIES.find(c => c.id === mockCategory);
        if (foundCat) {
            // Safety check: ensure the mockSub exists in the category
            const subExists = foundCat.subs.find(s => s.name === mockSub);
            const finalSub = subExists ? mockSub : (foundCat.subs[0]?.name || "");

            setIsAiFiltered(true);
            setSelectedCategory(foundCat);
            setSelectedSubs([finalSub]);
            transitionToStep('form');
            if (!recentSearches.includes(q.trim())) setRecentSearches(prev => [q.trim(), ...prev].slice(0, 5));
        } else {
            Alert.alert("Ops", "No pudimos clasificar tu pedido. Por favor intenta con otras palabras.");
        }
        setIsSearching(false);
        setSearchQuery('');
        return;
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.1 }
        })
      });

      const data = await response.json();
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Respuesta de IA no válida");
      }

      const textResult = data.candidates[0].content.parts[0].text;
      let jsonResult;
      try {
        jsonResult = JSON.parse(textResult.replace(/```json|```/g, "").trim());
      } catch (e) {
        console.error("Fallo al parsear JSON de IA:", textResult);
        throw new Error("Formato de respuesta incorrecto");
      }

      const foundCat = CATEGORIES.find(c => c.id === jsonResult.categoryId);
      if (foundCat) {
        const subName = jsonResult.subCategory;
        const subExists = foundCat.subs.find(s => s.name === subName);
        const finalSub = subExists ? subName : (foundCat.subs[0]?.name || "");

        setIsAiFiltered(true);
        setSelectedCategory(foundCat);
        setSelectedSubs([finalSub]);
        transitionToStep('form');
        if (!recentSearches.includes(q.trim())) setRecentSearches(prev => [q.trim(), ...prev].slice(0, 5));
      } else {
        Alert.alert("Interesante 🤔", "Intenta describirlo con otras palabras.");
      }

    } catch (error) {
      console.log("Error Gemini:", error);
      Alert.alert("Hubo un problema", "Revisa tu conexión o tu configuración de API.");
    } finally {
      setIsSearching(false);
    }
  };

  if (step === 'search') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ padding: 24, paddingTop: Platform.OS === 'android' ? 60 : 40, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderBottomWidth: 1, borderBottomColor: '#F2F4F6', zIndex: 10 }}>
            <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setStep('category'); }} style={{ paddingRight: 15 }}>
              <Feather name="arrow-left" size={24} color="#191C1E" />
            </TouchableOpacity>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F4F6', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: isSearching ? '#1A6BFF' : 'rgba(0,0,0,0.07)' }}>
              <Feather name="search" size={18} color={isSearching ? "#1A6BFF" : "#424655"} style={{ marginRight: 10 }} />
              <TextInput 
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => handleSmartSearch()}
                placeholder="Ej: Necesito arreglar..."
                placeholderTextcolor="#424655"
                style={{ flex: 1, color: '#191C1E', fontFamily: 'Montserrat_400Regular', fontSize: 14 }}
                editable={!isSearching}
                returnKeyType="search"
                autoFocus={true}
              />
              {isSearching ? (
                <ActivityIndicator color="#1A6BFF" size="small" style={{ marginLeft: 10 }} />
              ) : (
                searchQuery.trim().length > 0 && (
                  <TouchableOpacity onPress={() => handleSmartSearch()} style={{ marginLeft: 10 }}>
                    <Feather name="arrow-right" size={20} color="#1A6BFF" />
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
            <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 16, marginBottom: 20 }}>Búsquedas recientes</Text>
            {recentSearches.map((term, index) => (
              <TouchableOpacity 
                key={index}
                onPress={() => {
                  setSearchQuery(term);
                  handleSmartSearch(term);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 16, paddingVertical: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F2F4F6' }}
              >
                <Feather name="clock" size={18} color="#424655" style={{ marginRight: 12 }} />
                <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#191C1E', fontSize: 14, flex: 1 }}>{term}</Text>
                <Feather name="arrow-up-left" size={18} color="#5A5E73" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  } else if (step === 'orders') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
        <Animated.View style={{ flex: 1, opacity: mainFadeAnim }}>
          {selectedOrder ? (
            /* DETAILED ORDER VIEW */
            <View style={{ flex: 1 }}>
               <View style={{ padding: 24, paddingTop: Platform.OS === 'android' ? 60 : 40, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F2F4F6', flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => setSelectedOrder(null)} style={{ marginRight: 15 }}>
                    <Feather name="arrow-left" size={24} color="#191C1E" />
                  </TouchableOpacity>
                  <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 20 }}>Detalle del Trabajo</Text>
               </View>

               <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                  {/* TASKER INFO SUMMARY */}
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#F2F4F6' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                       <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#1A6BFF11', alignItems: 'center', justifyContent: 'center' }}>
                          <MaterialCommunityIcons name="account-hard-hat" size={28} color="#1A6BFF" />
                       </View>
                       <View style={{ marginLeft: 15 }}>
                          <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 16 }}>{selectedOrder.tasker}</Text>
                          <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 12 }}>{selectedOrder.service}</Text>
                       </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F8F9FB' }}>
                       <View>
                          <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 10, textTransform: 'uppercase' }}>Fecha</Text>
                          <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 13 }}>{selectedOrder.date}</Text>
                       </View>
                       <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 10, textTransform: 'uppercase' }}>Valor Pagado</Text>
                          <Text style={{ fontFamily: 'Montserrat_900Black', color: '#22C55E', fontSize: 13 }}>${selectedOrder.total}</Text>
                       </View>
                    </View>
                  </View>

                  {/* LOCATION & TIP */}
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#F2F4F6' }}>
                     <View style={{ marginBottom: 15 }}>
                        <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 14, marginBottom: 8 }}>📍 Ubicación del Servicio</Text>
                        <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 13 }}>{selectedOrder.location}</Text>
                     </View>
                     <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View>
                           <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 14, marginBottom: 4 }}>Propina</Text>
                           <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#22C55E', fontSize: 13 }}>$5.00 (Agradecido)</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                           <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 14, marginBottom: 4 }}>Calificación</Text>
                           <View style={{ flexDirection: 'row' }}>
                              {[1,2,3,4,5].map(s => <Feather key={s} name="star" size={14} color="#F59E0B" fill="#F59E0B" />)}
                           </View>
                        </View>
                     </View>
                  </View>

                  {/* HELP & SECURITY */}
                  <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 16, marginBottom: 15, marginTop: 10 }}>Ayuda y Seguridad</Text>
                  <TouchableOpacity style={{ backgroundColor: '#FFFFFF', padding: 18, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FF5C3A22' }}>
                     <Feather name="shield" size={20} color="#FF5C3A" />
                     <View style={{ marginLeft: 15, flex: 1 }}>
                        <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 14 }}>Informa un asunto de seguridad</Text>
                        <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 11 }}>Infórmanos sobre cualquier problema</Text>
                     </View>
                     <Feather name="chevron-right" size={18} color="#D1D5DB" />
                  </TouchableOpacity>

                  <TouchableOpacity style={{ backgroundColor: '#FFFFFF', padding: 18, borderRadius: 16, marginBottom: 30, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F2F4F6' }}>
                     <Feather name="message-circle" size={20} color="#1A6BFF" />
                     <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 14, marginLeft: 15, flex: 1 }}>Contactar al Tasker</Text>
                     <Feather name="chevron-right" size={18} color="#D1D5DB" />
                  </TouchableOpacity>

                  {/* AI CHATBOT BUTTON */}
                  <TouchableOpacity style={{ backgroundColor: '#191C1E', padding: 20, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5, flexDirection: 'row', justifyContent: 'center' }}>
                     <MaterialCommunityIcons name="robot" size={24} color="#1A6BFF" style={{ marginRight: 12 }} />
                     <View>
                        <Text style={{ fontFamily: 'Montserrat_900Black', color: '#FFFFFF', fontSize: 15 }}>SOPORTE IA SERVITASK</Text>
                        <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#FFFFFF99', fontSize: 11 }}>Chat inteligente 24/7 disponible</Text>
                     </View>
                  </TouchableOpacity>
               </ScrollView>
            </View>
          ) : (
            /* ORDERS LIST / SUMMARY */
            <View style={{ flex: 1, backgroundColor: '#F4F8FF' }}>
               <View style={{ padding: 24, paddingTop: Platform.OS === 'android' ? 60 : 40, borderBottomWidth: 0 }}>
                  <Text style={{ fontFamily: 'Montserrat_900Black', color: '#001A4D', fontSize: 24 }}>Mis Pedidos</Text>
                  <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 13, marginTop: 4 }}>Gestiona tus servicios activos.</Text>
               </View>

               <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                  {proposals.length === 0 ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
                       <View style={{ width: 140, height: 140, backgroundColor: '#FFFFFF', borderRadius: 35, alignItems: 'center', justifyContent: 'center', marginBottom: 35, shadowColor: '#1A6BFF', shadowOpacity: 0.1, shadowRadius: 30, elevation: 15 }}>
                         <MaterialCommunityIcons name="clipboard-text-outline" size={65} color="#1A6BFF" opacity={0.3} />
                         <View style={{ position: 'absolute', bottom: 30, right: 30, width: 44, height: 44, borderRadius: 14, backgroundColor: '#1A6BFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#1A6BFF', shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 }}>
                            <Feather name="search" size={20} color="#FFFFFF" />
                         </View>
                       </View>
                       <Text style={{ fontFamily: 'Montserrat_900Black', color: '#001A4D', fontSize: 18, textAlign: 'center', marginBottom: 15 }}>No tienes pedidos activos</Text>
                       <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 13, textAlign: 'center', paddingHorizontal: 20, lineHeight: 22, marginBottom: 40 }}>
                          Tus servicios contratados aparecerán aquí. ¡Comienza solicitando un profesional!
                       </Text>
                       
                       <TouchableOpacity 
                          onPress={() => { setSelectedCategory(null); setSelectedSubs([]); resetFormState(); transitionToStep('category'); }}
                          style={{ backgroundColor: '#1A6BFF', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 25 }}
                       >
                          <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#FFFFFF', fontSize: 15 }}>Solicitar un Profesional</Text>
                       </TouchableOpacity>

                       <TouchableOpacity>
                          <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', fontSize: 13 }}>Ver Historial de Pedidos</Text>
                       </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 16, marginBottom: 20 }}>Historial Reciente</Text>
                      {/* MOCK DATA FOR DEMONSTRATION */}
                      {[
                        { id: 1, tasker: 'Marco Antonio', service: 'Reparación de tubería', date: '01 Abr, 2026', total: '45.00', location: 'Av. Juan Tanca Marengo, Guayaquil' },
                        { id: 2, tasker: 'Elena Sofia', service: 'Limpieza de Oficina', date: '28 Mar, 2026', total: '30.00', location: 'Samborondón, Plaza Lagos' },
                      ].map(order => (
                        <TouchableOpacity 
                          key={order.id} 
                          onPress={() => setSelectedOrder(order)}
                          style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#F2F4F6', flexDirection: 'row', alignItems: 'center' }}
                        >
                           <View style={{ width: 45, height: 45, borderRadius: 12, backgroundColor: '#1A6BFF11', alignItems: 'center', justifyContent: 'center' }}>
                              <MaterialCommunityIcons name="file-document-outline" size={24} color="#1A6BFF" />
                           </View>
                           <View style={{ marginLeft: 15, flex: 1 }}>
                              <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 14 }}>{order.service}</Text>
                              <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 12 }}>Con {order.tasker}</Text>
                           </View>
                           <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 14 }}>${order.total}</Text>
                              <View style={{ backgroundColor: '#22C55E11', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 }}>
                                 <Text style={{ color: '#22C55E', fontFamily: 'Montserrat_700Bold', fontSize: 9 }}>COMPLETADO</Text>
                              </View>
                           </View>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
               </ScrollView>
            </View>
          )}

          {/* SHARED BOTTOM NAV BAR */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 15, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F2F4F6' }}>
            <TouchableOpacity onPress={() => { setSelectedCategory(null); setSelectedSubs([]); resetFormState(); transitionToStep('category'); }} style={{ alignItems: 'center' }}>
              <Feather name="home" size={24} color="#424655" />
              <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 10, marginTop: 4 }}>Inicio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center' }}>
              <Feather name="clipboard" size={24} color="#1A6BFF" />
              <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', fontSize: 10, marginTop: 4 }}>Pedidos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => transitionToStep('profile')} style={{ alignItems: 'center' }}>
              <Feather name="user" size={24} color="#424655" />
              <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 10, marginTop: 4 }}>Perfil</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>


      </SafeAreaView>
    );
  }

  if (step === 'profile') {
    const user = session?.user;
    const metadata = user?.user_metadata || {};
    const fullName = metadata.full_name || 'Usuario';
    const userEmail = user?.email || 'Sin correo';

    return (
      <View style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
        <Animated.View style={{ flex: 1, opacity: mainFadeAnim }}>
          {/* DIGITAL CONCIERGE HEADER */}
          <View style={{ backgroundColor: '#191C1E', paddingTop: Platform.OS === 'android' ? 60 : 50, paddingBottom: 50, paddingHorizontal: 24, zIndex: 1 }}>
            {/* Top Bar */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 20 }}>
               <TouchableOpacity onPress={handleSignOut} style={{ padding: 8 }}>
                 <Feather name="log-out" size={22} color="#FFFFFF" />
               </TouchableOpacity>
            </View>

            {/* Profile Info Centered */}
            <View style={{ alignItems: 'center' }}>
               <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#1A6BFF', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
                  <Text style={{ fontFamily: 'Montserrat_900Black', color: '#FFFFFF', fontSize: 32 }}>{getInitials(fullName)}</Text>
               </View>
               <Text style={{ fontFamily: 'Montserrat_900Black', color: '#FFFFFF', fontSize: 20, marginBottom: 5 }}>{fullName}</Text>
               <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 12, marginBottom: 15 }}>{userEmail}</Text>
               
               <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF15', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 }}>
                  <Feather name="star" size={12} color="#F59E0B" fill="#F59E0B" />
                  <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#FFFFFF', fontSize: 12, marginLeft: 8 }}>{userRating} Puntuación</Text>
               </View>
            </View>
          </View>

          {/* LIST ITEMS OVERLAPPING HEADER */}
          <ScrollView 
            keyboardShouldPersistTaps="handled" 
            showsVerticalScrollIndicator={false} 
            style={{ flex: 1, zIndex: 5, marginTop: -25 }} 
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          >
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 5, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 5, marginBottom: 15 }}>
              {/* MENU ITEMS */}
              {[
                { label: 'Administrar cuenta', icon: 'settings' },
                { label: 'Mis direcciones', icon: 'map-pin' },
                { label: 'Métodos de pago', icon: 'credit-card' },
              ].map((item, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 18, borderBottomWidth: idx === 2 ? 0 : 1, borderBottomColor: '#F2F4F6' }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#1A6BFF10', alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={item.icon} size={16} color="#1A6BFF" />
                  </View>
                  <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 14, flex: 1, marginLeft: 15 }}>{item.label}</Text>
                  <Feather name="chevron-right" size={16} color="#8B8FA8" />
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 5, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 }}>
              {[
                { label: 'Invitar amigos', icon: 'share-2', color: '#F97316', bg: '#F9731615' },
                { label: 'Quiénes somos', icon: 'info', color: '#1A6BFF', bg: '#1A6BFF10' },
                { label: 'Calificar app', icon: 'star', color: '#1A6BFF', bg: '#1A6BFF10' },
                { label: 'Ayuda', icon: 'help-circle', color: '#1A6BFF', bg: '#1A6BFF10' },
              ].map((item, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 18, borderBottomWidth: idx === 3 ? 0 : 1, borderBottomColor: '#F2F4F6' }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={item.icon} size={16} color={item.color} />
                  </View>
                  <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 14, flex: 1, marginLeft: 15 }}>{item.label}</Text>
                  <Feather name="chevron-right" size={16} color="#8B8FA8" />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* SHARED BOTTOM NAV BAR */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 15, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F2F4F6' }}>
            <TouchableOpacity onPress={() => { setSelectedCategory(null); setSelectedSubs([]); resetFormState(); transitionToStep('category'); }} style={{ alignItems: 'center' }}>
              <Feather name="home" size={24} color="#424655" />
              <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 10, marginTop: 4 }}>Inicio</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => transitionToStep('orders')} style={{ alignItems: 'center' }}>
              <Feather name="clipboard" size={24} color="#424655" />
              <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 10, marginTop: 4 }}>Pedidos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center' }}>
              <Feather name="user" size={24} color="#1A6BFF" />
              <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', fontSize: 10, marginTop: 4 }}>Perfil</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>


      </View>
    );
  }

  if (step === 'waiting_proposals') {
    return (
      <Animated.View style={{ flex: 1, backgroundColor: '#F8F9FB', opacity: mainFadeAnim }}>
        {/* TOP HALF: MAP VIEW DECORATION */}
        <View style={{ height: '55%', position: 'relative' }}>
            <MapView 
                style={{ width: '100%', height: '100%' }} 
                region={mapRegion}
                showsUserLocation={true}
                userInterfaceStyle="dark"
                customMapStyle={[
                    { "elementType": "geometry", "stylers": [{"color": "#FFFFFF"}] },
                    { "elementType": "labels.text.fill", "stylers": [{"color": "#8B8FA8"}] },
                    { "elementType": "labels.text.stroke", "stylers": [{"color": "#F8F9FB"}] },
                    { "featureType": "road", "elementType": "geometry", "stylers": [{"color": "#F8F9FB"}] },
                    { "featureType": "water", "elementType": "geometry", "stylers": [{"color": "#1A6BFF"}] }
                ]}
            />
            
            {/* OVERLAY: THE ANIMATED HAMMER & CIRCULATING TOOLS */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View style={{ 
                    position: 'relative',
                    width: 250, height: 250, 
                    alignItems: 'center', justifyContent: 'center',
                    transform: [{ scale: hammerAnim }]
                }}>
                    {/* CENTRAL HAMMER AVATAR */}
                    <View style={{ 
                        backgroundColor: '#FFF', 
                        width: 140, height: 140, 
                        borderRadius: 70, 
                        alignItems: 'center', justifyContent: 'center', 
                        shadowColor: '#1A6BFF', shadowOpacity: 0.3, shadowRadius: 20, elevation: 20,
                        zIndex: 10 
                    }}>
                        <Animated.Image 
                            source={require('../../assets/images/tasker_hammer_transparent_style_1774984582176.png')} 
                            style={{ width: 100, height: 100, resizeMode: 'contain', transform: [{ rotate: rotation }] }} 
                        />
                    </View>

                    {/* CUSTOM CIRCULATING TOOLS (REPLACING EMOJIS) */}
                    {[
                        { img: require('../../assets/images/wrench_custom.png'), a: 0 },
                        { img: require('../../assets/images/screwdriver_custom.png'), a: 60 },
                        { img: require('../../assets/images/tapemeasure_custom.png'), a: 120 },
                        { img: require('../../assets/images/saw_custom.png'), a: 180 },
                        { img: require('../../assets/images/broom_custom.png'), a: 240 },
                        { img: require('../../assets/images/paintroller_custom.png'), a: 300 }
                    ].map((tool, i) => {
                        const radius = 105;
                        const angleRad = (tool.a * Math.PI) / 180;
                        const x = radius * Math.cos(angleRad);
                        const y = radius * Math.sin(angleRad);
                        
                        return (
                            <View 
                                key={i}
                                style={{ 
                                    position: 'absolute', 
                                    left: 125 + x - 18, 
                                    top: 125 + y - 18, 
                                    backgroundColor: '#FFF', 
                                    width: 36, height: 36, 
                                    borderRadius: 18, 
                                    alignItems: 'center', justifyContent: 'center',
                                    shadowColor: '#1A6BFF', shadowOpacity: 0.2, shadowRadius: 5, elevation: 5,
                                    borderWidth: 1, borderColor: '#F2F4F6'
                                }}
                            >
                                <Image source={tool.img} style={{ width: 22, height: 22, resizeMode: 'contain' }} />
                            </View>
                        );
                    })}
                </Animated.View>
            </View>

            {/* BACK BUTTON */}
            <TouchableOpacity 
                onPress={() => transitionToStep('category')}
                style={{ position: 'absolute', top: 50, left: 24, width: 45, height: 45, borderRadius: 23, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 }}
            >
                <Feather name="arrow-left" size={24} color="#191C1E" />
            </TouchableOpacity>
        </View>

        {/* BOTTOM HALF: CONTENT & TASKERS */}
        <View style={{ height: '45%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, marginTop: -35, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, padding: 24 }}>
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
                <View style={{ width: 40, height: 4, backgroundColor: '#F2F4F6', borderRadius: 2, marginBottom: 15 }} />
                <Text style={{ fontFamily: 'Montserrat_900Black', color: '#1A6BFF', fontSize: 18, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    CONECTÁNDOTE CON{"\n"}TASKERS CERCA TUYO
                </Text>
            </View>

            {/* QUICK SUMMARY BOX */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F8F9FB', borderRadius: 16, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#F2F4F6' }}>
                <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#F2F4F6', paddingRight: 10 }}>
                    <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#8B8FA8', fontSize: 9, textTransform: 'uppercase' }}>Categoría</Text>
                    <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 13 }} numberOfLines={1}>{selectedCategory?.label || 'Servicio'}</Text>
                </View>
                <View style={{ flex: 1, paddingLeft: 10 }}>
                    <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#8B8FA8', fontSize: 9, textTransform: 'uppercase' }}>Presupuesto Estimado</Text>
                    <Text style={{ fontFamily: 'Montserrat_900Black', color: '#22C55E', fontSize: 13 }}>${priceMin} - ${priceMax} USD</Text>
                </View>
            </View>

            {/* SERVICES SELECTED */}
            {selectedSubs && selectedSubs.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#8B8FA8', fontSize: 10, textTransform: 'uppercase', marginBottom: 8 }}>Servicios Seleccionados ({selectedSubs.length})</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {selectedSubs.map((sub, idx) => (
                            <View key={idx} style={{ backgroundColor: 'rgba(26, 107, 255, 0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(26, 107, 255, 0.15)' }}>
                                <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', fontSize: 11 }}>{sub}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 14, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {proposals.length === 0 ? 'Buscando interesados...' : `Taskers interesados (${proposals.length})`}
                </Text>

                {proposals.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 10 }}>
                         <ActivityIndicator size="small" color="#1A6BFF" style={{ marginBottom: 15 }} />
                         <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontStyle: 'italic', fontSize: 13, textAlign: 'center' }}>
                            Los mejores profesionales están revisando tu pedido...
                         </Text>
                    </View>
                ) : (
                    proposals.map(prop => (
                        <View key={prop.id} style={{ backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F2F4F6', shadowColor: '#1A6BFF', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
                            <View style={{ width: 55, height: 55, borderRadius: 28, backgroundColor: '#1A6BFF11', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1A6BFF33' }}>
                                 <MaterialCommunityIcons name="account-hard-hat" size={30} color="#1A6BFF" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 15 }}>
                                <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 15 }}>Marco Antonio</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Feather name="star" size={10} color="#F59E0B" fill="#F59E0B" />
                                    <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 11, marginLeft: 4 }}>4.9</Text>
                                    <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 11, marginLeft: 4 }}>(124)</Text>
                                </View>
                                <TouchableOpacity 
                                    onPress={() => Alert.alert("¡Chat Seguro!", "Conectándote...")} 
                                    style={{ backgroundColor: '#1A6BFF', alignSelf: 'flex-start', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, marginTop: 8, shadowColor: '#1A6BFF', shadowOpacity: 0.3, shadowRadius: 5 }}
                                >
                                    <Text style={{ color: '#FFF', fontFamily: 'Montserrat_700Bold', fontSize: 11 }}>ELEGIR Y CHATEAR</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* CANCEL BUTTON AT THE VERY BOTTOM */}
            <TouchableOpacity 
                onPress={() => {
                    Alert.alert(
                        "¿Cancelar Solicitud?",
                        "Si cancelas ahora, los taskers dejarán de ver tu pedido y no podrás recibir más ofertas.",
                        [
                            { text: "Continuar esperando", style: "cancel" },
                            { text: "Sí, cancelar pedido", style: "destructive", onPress: () => {
                                // Reset data upon cancellation so the dashboard is clean
                                setSearchQuery('');
                                setDetails('');
                                setPriceMin('20');
                                setPriceMax('50');
                                setAttachments([]);
                                setSelectedSubs([]);
                                setSelectedCategory(null);
                                setLocation('Mi ubicación actual');
                                transitionToStep('category');
                            } }
                        ]
                    );
                }}
                style={{ backgroundColor: '#FFF', padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FF5C3A33' }}
            >
                <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#FF5C3A', fontSize: 14 }}>Cancelar Búsqueda</Text>
            </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  if (selectedCategory && step === 'form') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
        <Animated.View style={{ flex: 1, opacity: mainFadeAnim }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
              <View style={{ padding: 24, paddingTop: Platform.OS === 'android' ? 60 : 40, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderBottomWidth: 1, borderBottomColor: '#F2F4F6', zIndex: 10 }}>
              <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsAiFiltered(false); transitionToStep('category'); }} style={{ paddingRight: 15 }}>
                <Feather name="arrow-left" size={24} color="#191C1E" />
              </TouchableOpacity>
            <View>
              <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 20 }}>Detalles de solicitud</Text>
              {isAiFiltered && selectedSubs?.length > 0 && (
                <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#16A34A', fontSize: 12, marginTop: 2 }}>
                  ✦ Inteligencia Artificial: {selectedSubs[0]}
                </Text>
              )}
            </View>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 10 }}>
            {/* CHIPS HEADER */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
              {selectedSubs?.map((s, i) => (
                <View key={i} style={{ backgroundColor: 'rgba(26, 107, 255, 0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(26, 107, 255, 0.15)' }}>
                  <Text style={{ color: '#1A6BFF', fontFamily: 'Montserrat_700Bold', fontSize: 12 }}>{s}</Text>
                </View>
              ))}
            </View>

            {/* LOCATION AS INTERACTIVE MAP TRIGGER */}
            {/* LOCATION CARD */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, elevation: 2, borderWidth: 1, borderColor: '#F2F4F6' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8F9FB', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Feather name="map-pin" size={18} color="#1A6BFF" />
                </View>
                <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 15 }}>¿Dónde lo necesitas?</Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <TouchableOpacity onPress={() => setShowMapModal(true)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#F2F4F6' }}>
                  <Text style={{ flex: 1, color: '#191C1E', fontFamily: 'Montserrat_700Bold', fontSize: 14 }} numberOfLines={1}>{location}</Text>
                  <Feather name="chevron-down" size={20} color="#8B8FA8" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleGetLocation} disabled={isLocating} style={{ width: 50, height: 50, backgroundColor: 'rgba(26, 107, 255, 0.1)', borderRadius: 16, marginLeft: 10, alignItems: 'center', justifyContent: 'center' }}>
                  {isLocating ? <ActivityIndicator color="#1A6BFF" size="small" /> : <Feather name="crosshair" size={22} color="#1A6BFF" />}
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderRadius: 16, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#F2F4F6' }}>
                <TextInput 
                  value={addressDetails} 
                  onChangeText={setAddressDetails} 
                  placeholder="Detalles (Apto, Piso, Mz, Villa...)" 
                  placeholderTextColor="#8B8FA8" 
                  style={{ flex: 1, color: '#191C1E', fontFamily: 'Montserrat_400Regular', fontSize: 14 }} 
                />
              </View>
            </View>

            {/* DURATION CARD */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, elevation: 2, borderWidth: 1, borderColor: '#F2F4F6' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8F9FB', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Feather name="clock" size={18} color="#1A6BFF" />
                </View>
                <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 15 }}>¿Cuánto tiempo tomará?</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {['1h o fraccion', '2h-3h', '+4h'].map(opt => (
                  <TouchableOpacity 
                    key={opt} 
                    onPress={() => setDuration(opt)} 
                    style={{ 
                      flex: 1, paddingVertical: 12, borderRadius: 16, 
                      backgroundColor: duration === opt ? 'rgba(26, 107, 255, 0.1)' : '#F8F9FB', 
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 1, borderColor: duration === opt ? '#1A6BFF' : 'transparent',
                      marginHorizontal: 4
                    }}
                  >
                    <Text style={{ fontFamily: 'Montserrat_700Bold', color: duration === opt ? '#1A6BFF' : '#8B8FA8', fontSize: 12 }}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* CONDITIONAL: MEASUREMENTS CARD (CONSTRUCCION ONLY) */}
            {selectedCategory?.id === 'construccion' && (
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, elevation: 2, borderWidth: 1, borderColor: '#F2F4F6' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                  <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 15 }}>¿Necesitas medidas exactas?</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  {['NO', 'SÍ'].map(opt => (
                    <TouchableOpacity 
                      key={opt} 
                      onPress={() => setNeedsMeasurements(opt)} 
                      style={{ 
                        flex: 1, paddingVertical: 12, borderRadius: 16, 
                        backgroundColor: needsMeasurements === opt ? (opt === 'SÍ' ? '#1A6BFF' : 'rgba(26, 107, 255, 0.1)') : '#FFFFFF', 
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 1, borderColor: needsMeasurements === opt ? '#1A6BFF' : '#F2F4F6',
                        marginHorizontal: 4,
                        elevation: needsMeasurements === opt && opt === 'SÍ' ? 4 : 0,
                        shadowColor: '#1A6BFF', shadowOpacity: 0.3, shadowRadius: 8
                      }}
                    >
                      <Text style={{ fontFamily: 'Montserrat_700Bold', color: needsMeasurements === opt ? (opt === 'SÍ' ? '#FFFFFF' : '#1A6BFF') : '#8B8FA8', fontSize: 14, textTransform: 'uppercase' }}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {needsMeasurements === 'SÍ' && (
                  <View style={{ marginTop: 20, backgroundColor: '#F4F8FF', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#D6E4FF' }}>
                    {/* WHAT TO MEASURE */}
                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#F2F4F6' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(26, 107, 255, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                          <Feather name="maximize" size={16} color="#1A6BFF" />
                        </View>
                        <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 14 }}>¿Qué necesitas medir?</Text>
                      </View>
                      
                      <View style={{ backgroundColor: '#F8F9FB', borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#F2F4F6', marginBottom: 15 }}>
                        <TextInput 
                          value={customMeasurement}
                          onChangeText={setCustomMeasurement}
                          placeholder="Escribe aquí (ej. ventana, puerta, piso...)" 
                          placeholderTextColor="#8B8FA8"
                          style={{ flex: 1, height: '100%', color: '#191C1E', fontFamily: 'Montserrat_400Regular', fontSize: 13 }}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {['Pared', 'Cocina', 'Baño', 'Exteriores', 'Muebles / Instalación especifica'].map((item) => {
                          const isActive = whatToMeasure.includes(item);
                          return (
                            <TouchableOpacity 
                              key={item}
                              onPress={() => toggleMeasurement(item)}
                              style={{ 
                                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, 
                                backgroundColor: isActive ? 'rgba(26, 107, 255, 0.15)' : '#F8F9FB', 
                                marginBottom: 8, marginRight: 8, borderWidth: 1, borderColor: isActive ? 'rgba(26, 107, 255, 0.2)' : 'transparent' 
                              }}
                            >
                              <Text style={{ fontFamily: isActive ? 'Montserrat_700Bold' : 'Montserrat_400Regular', color: isActive ? '#1A6BFF' : '#424655', fontSize: 12 }}>{item}</Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    </View>

                    {/* PHOTOS */}
                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#F2F4F6' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(26, 107, 255, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                          <Feather name="camera" size={16} color="#1A6BFF" />
                        </View>
                        <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 14 }}>¿Puedes subir fotos del área?</Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <TouchableOpacity onPress={() => handlePickMedia(true)} style={{ flex: 1, backgroundColor: '#F8F9FB', borderRadius: 16, padding: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D5DB', marginRight: 8 }}>
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, marginBottom: 8 }}>
                            <Feather name="camera" size={20} color="#1A6BFF" />
                          </View>
                          <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 12, marginBottom: 2 }}>Cámara</Text>
                          <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 10 }}>Tomar foto</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => handlePickMedia(false)} style={{ flex: 1, backgroundColor: '#F8F9FB', borderRadius: 16, padding: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#D1D5DB', marginLeft: 8 }}>
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, marginBottom: 8 }}>
                            <Feather name="image" size={20} color="#1A6BFF" />
                          </View>
                          <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 12, marginBottom: 2 }}>Galería</Text>
                          <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 10 }}>Subir archivo</Text>
                        </TouchableOpacity>
                      </View>

                      {attachments.length > 0 && (
                        <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false}>
                          {attachments.map((file, idx) => (
                            <View key={idx} style={{ position: 'relative', marginRight: 12 }}>
                              <Image source={{ uri: file.uri }} style={{ width: 60, height: 60, borderRadius: 12 }} />
                              <TouchableOpacity onPress={() => removeAttachment(idx)} style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#191C1E', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' }}>
                                <Feather name="x" size={10} color="#FFF" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </ScrollView>
                      )}
                    </View>

                    {/* SPECIFIC TOOLS */}
                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#F2F4F6' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(26, 107, 255, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                          <Feather name="tool" size={16} color="#1A6BFF" />
                        </View>
                        <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 14 }}>¿Alguna herramienta específica?</Text>
                      </View>
                      <View style={{ backgroundColor: '#F8F9FB', borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#F2F4F6' }}>
                        <TextInput 
                          value={specificTools}
                          onChangeText={setSpecificTools}
                          placeholder="Ej: Escalera de 3 metros, láser..." 
                          placeholderTextColor="#8B8FA8"
                          style={{ flex: 1, height: '100%', color: '#191C1E', fontFamily: 'Montserrat_400Regular', fontSize: 13 }}
                        />
                      </View>
                    </View>

                    {/* BUDGET SUGGESTION */}
                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#F2F4F6' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(26, 107, 255, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                          <MaterialCommunityIcons name="cash-multiple" size={16} color="#1A6BFF" />
                        </View>
                        <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 14 }}>Presupuesto sugerido</Text>
                      </View>
                      <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 11, marginBottom: 15, marginLeft: 42 }}>Valor por la toma de medidas</Text>
                      
                      {/* Custom Slider */}
                      <View 
                        style={{ height: 40, justifyContent: 'center', marginBottom: 15, paddingHorizontal: 10 }}
                        onLayout={e => setMeasureSliderWidth(e.nativeEvent.layout.width)}
                        onStartShouldSetResponder={() => true}
                        onResponderGrant={handleMeasureSliderTouch}
                        onResponderMove={handleMeasureSliderTouch}
                      >
                        <View style={{ height: 6, backgroundColor: '#F2F4F6', borderRadius: 3, width: '100%' }} />
                        {measureSliderWidth > 0 && (() => {
                          const minL = 5, maxL = 50;
                          const cMin = Math.max(minL, Math.min(parseInt(measurePriceMin) || minL, maxL));
                          const cMax = Math.max(minL, Math.min(parseInt(measurePriceMax) || maxL, maxL));
                          const leftPos = ((cMin - minL) / (maxL - minL)) * (measureSliderWidth - 20);
                          const rightPos = ((cMax - minL) / (maxL - minL)) * (measureSliderWidth - 20);
                          return (
                            <View style={{ position: 'absolute', left: 10, right: 10, height: 40, justifyContent: 'center' }}>
                              <View pointerEvents="none" style={{ position: 'absolute', height: 6, backgroundColor: '#1A6BFF', left: leftPos, width: rightPos - leftPos, borderRadius: 3 }} />
                              <View pointerEvents="none" style={{ position: 'absolute', left: leftPos - 12, width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 5, borderWidth: 2, borderColor: '#1A6BFF' }} />
                              <View pointerEvents="none" style={{ position: 'absolute', left: rightPos - 12, width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 5, borderWidth: 2, borderColor: '#1A6BFF' }} />
                            </View>
                          );
                        })()}
                      </View>

                      {/* Inputs min max */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <View style={{ flex: 1, backgroundColor: '#F8F9FB', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                          <Text style={{ color: '#8B8FA8', fontSize: 9, fontFamily: 'Montserrat_700Bold', textTransform: 'uppercase' }}>MÍNIMO</Text>
                          <Text style={{ fontSize: 16, fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', marginTop: 2 }}>${measurePriceMin}</Text>
                        </View>
                        <Text style={{ color: '#F2F4F6', fontSize: 24, marginHorizontal: 10 }}>-</Text>
                        <View style={{ flex: 1, backgroundColor: '#F8F9FB', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                          <Text style={{ color: '#8B8FA8', fontSize: 9, fontFamily: 'Montserrat_700Bold', textTransform: 'uppercase' }}>MÁXIMO</Text>
                          <Text style={{ fontSize: 16, fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', marginTop: 2 }}>${measurePriceMax}</Text>
                        </View>
                      </View>

                      {/* Fixed Chips */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        {['5', '10', '15', '20', '25'].map(val => {
                          const numVal = parseInt(val);
                          const isActive = measurePriceMin === String(numVal) + '.00' || measurePriceMax === String(numVal) + '.00';
                          return (
                            <TouchableOpacity 
                              key={val}
                              onPress={() => {
                                if (numVal <= 10) setMeasurePriceMin(`${val}.00`);
                                else setMeasurePriceMax(`${val}.00`);
                              }}
                              style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: isActive ? '#1A6BFF' : '#F2F4F6' }}
                            >
                              <Text style={{ fontFamily: 'Montserrat_700Bold', color: isActive ? '#1A6BFF' : '#424655', fontSize: 11 }}>${val}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* BUDGET CARD */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, elevation: 2, borderWidth: 1, borderColor: '#F2F4F6' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8F9FB', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Feather name="dollar-sign" size={20} color="#22C55E" />
                </View>
                <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 15 }}>Rango de presupuesto</Text>
              </View>
              <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#8B8FA8', fontSize: 13, marginBottom: 20, marginLeft: 48 }}>Desliza o usa los montos sugeridos</Text>
              
              {/* SLIDER 2.0 (IMPROVED ACCESS) */}
              <View 
                style={{ height: 60, justifyContent: 'center', marginBottom: 20, paddingHorizontal: 10 }}
                onLayout={e => setSliderWidth(e.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onResponderGrant={handleSliderTouch}
                onResponderMove={handleSliderTouch}
              >
                <View style={{ height: 8, backgroundColor: '#F2F4F6', borderRadius: 4, width: '100%' }} />
                {sliderWidth > 0 && (() => {
                  const minL = 10, maxL = 300;
                  const cMin = Math.max(minL, Math.min(parseInt(priceMin) || minL, maxL));
                  const cMax = Math.max(minL, Math.min(parseInt(priceMax) || maxL, maxL));
                  const leftPos = ((cMin - minL) / (maxL - minL)) * (sliderWidth - 20);
                  const rightPos = ((cMax - minL) / (maxL - minL)) * (sliderWidth - 20);
                  return (
                    <View style={{ position: 'absolute', left: 10, right: 10, height: 60, justifyContent: 'center' }}>
                      <View pointerEvents="none" style={{ position: 'absolute', height: 8, backgroundColor: '#1A6BFF', left: leftPos, width: rightPos - leftPos, borderRadius: 4 }} />
                      <View pointerEvents="none" style={{ position: 'absolute', left: leftPos - 18, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 8, borderWidth: 2, borderColor: '#1A6BFF' }} />
                      <View pointerEvents="none" style={{ position: 'absolute', left: rightPos - 18, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 8, borderWidth: 2, borderColor: '#1A6BFF' }} />
                    </View>
                  );
                })()}
              </View>

              {/* QUICK BUDGETS */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                {['20-50', '60-120', '150-300'].map(range => (
                  <TouchableOpacity 
                    key={range} 
                    onPress={() => { const [mi, ma] = range.split('-'); setPriceMin(mi); setPriceMax(ma); }} 
                    style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#F2F4F6' }}
                  >
                    <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', fontSize: 11 }}>${range}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, backgroundColor: '#F8F9FB', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F2F4F6' }}>
                  <Text style={{ color: '#8B8FA8', fontSize: 10, fontFamily: 'Montserrat_700Bold' }}>MÍNIMO ($)</Text>
                  <TextInput value={priceMin} onChangeText={setPriceMin} keyboardType="numeric" style={{ fontSize: 18, fontFamily: 'Montserrat_900Black', color: '#191C1E', marginTop: 4 }} />
                </View>
                <View style={{ width: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#F2F4F6', fontSize: 24 }}>-</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#F8F9FB', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F2F4F6' }}>
                  <Text style={{ color: '#8B8FA8', fontSize: 10, fontFamily: 'Montserrat_700Bold' }}>MÁXIMO ($)</Text>
                  <TextInput value={priceMax} onChangeText={setPriceMax} keyboardType="numeric" style={{ fontSize: 18, fontFamily: 'Montserrat_900Black', color: '#191C1E', marginTop: 4 }} />
                </View>
              </View>
            </View>

            {/* REQUIREMENTS & PHOTOS CARD */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, elevation: 2, borderWidth: 1, borderColor: '#F2F4F6' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8F9FB', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Feather name="edit-3" size={18} color="#1A6BFF" />
                </View>
                <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 15 }}>Requerimientos</Text>
              </View>
              <View style={{ backgroundColor: '#F8F9FB', borderRadius: 16, height: 120, padding: 12, borderWidth: 1, borderColor: '#F2F4F6', marginBottom: 20 }}>
                <TextInput 
                  value={details} 
                  onChangeText={setDetails} 
                  multiline 
                  placeholder="Ej: Necesito que traigan su propia escalera..." 
                  placeholderTextColor="#8B8FA8" 
                  style={{ flex: 1, color: '#191C1E', fontFamily: 'Montserrat_400Regular', fontSize: 14, textAlignVertical: 'top' }} 
                />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => handlePickMedia(true)} style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: '#F8F9FB', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F2F4F6', marginRight: 12 }}>
                  <Feather name="camera" size={24} color="#1A6BFF" />
                </TouchableOpacity>

                <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity onPress={() => handlePickMedia(false)} style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: '#F8F9FB', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#1A6BFF' }}>
                    <Feather name="plus" size={24} color="#1A6BFF" />
                  </TouchableOpacity>
                  {attachments.map((file, idx) => (
                    <View key={idx} style={{ position: 'relative', marginLeft: 12 }}>
                      <Image source={{ uri: file.uri }} style={{ width: 60, height: 60, borderRadius: 16 }} />
                      <TouchableOpacity onPress={() => removeAttachment(idx)} style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#FF5C3A', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' }}>
                        <Feather name="x" size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity 
              onPress={handlePostJob} 
              disabled={isLocating}
              style={{ 
                backgroundColor: isLocating ? '#8B8FA8' : '#1A6BFF', 
                paddingVertical: 20, borderRadius: 20, alignItems: 'center', 
                shadowColor: isLocating ? 'transparent' : '#1A6BFF', shadowOpacity: 0.4, shadowRadius: 15, elevation: 12,
                marginTop: 10, marginBottom: 40
              }}
            >
              <Text style={{ fontFamily: 'Montserrat_900Black', color: '#FFFFFF', fontSize: 18, textTransform: 'uppercase', letterSpacing: 1 }}>
                {isLocating ? 'PUBLICANDO...' : 'Publicar Tarea'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
          
          {/* INTERACTIVE FULLSCREEN MAP MODAL */}
          {showMapModal && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#F8F9FB', zIndex: 200 }}>
              <View style={{ paddingTop: Platform.OS === 'android' ? 50 : 50, paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', zIndex: 10, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 }}>
                <TouchableOpacity onPress={() => setShowMapModal(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F2F4F6' }}>
                  <Feather name="arrow-left" size={20} color="#191C1E" />
                </TouchableOpacity>
                <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 18, marginLeft: 15 }}>Fija tu ubicación exacta</Text>
              </View>

              <View style={{ flex: 1 }}>
                <MapView 
                  style={{ flex: 1 }} 
                  initialRegion={mapRegion}
                  onRegionChangeComplete={(region) => setMapRegion(region)}
                  showsUserLocation={true}
                  userInterfaceStyle="dark"
                  customMapStyle={[
                    { "elementType": "geometry", "stylers": [{"color": "#FFFFFF"}] },
                    { "elementType": "labels.text.fill", "stylers": [{"color": "#8B8FA8"}] },
                    { "elementType": "labels.text.stroke", "stylers": [{"color": "#F8F9FB"}] },
                    { "featureType": "road", "elementType": "geometry", "stylers": [{"color": "#F8F9FB"}] },
                    { "featureType": "water", "elementType": "geometry", "stylers": [{"color": "#1A6BFF"}] }
                  ]}
                />
                
                {/* FIXED CENTER PIN (UBER STYLE) */}
                <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -24, marginTop: -48, pointerEvents: 'none', alignItems: 'center' }}>
                  <View style={{ backgroundColor: '#1A6BFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 }}>
                    <Text style={{ color: '#FFFFFF', fontFamily: 'Montserrat_700Bold', fontSize: 12 }}>Estoy aquí</Text>
                  </View>
                  <View style={{ width: 4, height: 20, backgroundColor: '#1A6BFF', marginBottom: -5 }} />
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#F8F9FB', borderWidth: 3, borderColor: '#1A6BFF' }} />
                </View>

                {/* BOTTOM CONFIRM BOX */}
                <View style={{ position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, shadowColor: '#000', shadowOpacity: 1, shadowRadius: 20, elevation: 20 }}>
                  <Text style={{ color: '#424655', fontFamily: 'Montserrat_700Bold', fontSize: 13, marginBottom: 15, textAlign: 'center' }}>Mueve el mapa para afinar la ubicación exacta del servicio.</Text>
                  <TouchableOpacity 
                    onPress={async () => {
                      try {
                        let geocode = await Location.reverseGeocodeAsync({ latitude: mapRegion.latitude, longitude: mapRegion.longitude });
                        if (geocode && geocode.length > 0) {
                          const place = geocode[0];
                          const street = place.street || place.name || '';
                          const city = place.city || place.subregion || '';
                          const newLoc = `${street ? street + ', ' : ''}${city}`.trim().replace(/^, |, $/g, '');
                          const fullLabel = newLoc || 'Ubicación en mapa';
                          
                          setLocTempBase(fullLabel);
                          setShowLocationDetailForm(true); // Transition to Phase 2
                        } else {
                          setLocation('Ubicación personalizada');
                          setShowMapModal(false);
                        }
                      } catch (e) {
                         setLocation('Ubicación en mapa');
                         setShowMapModal(false);
                      }
                    }}
                    style={{ backgroundColor: '#1A6BFF', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#1A6BFF', shadowOpacity: 0.4, shadowRadius: 10 }}
                  >
                    <Text style={{ fontFamily: 'Montserrat_900Black', color: '#FFFFFF', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 }}>CONFIRMAR UBICACIÓN</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}

  if (selectedCategory) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
        <Animated.View style={{ flex: 1, opacity: mainFadeAnim }}>
          <View style={{ padding: 24, paddingTop: Platform.OS === 'android' ? 60 : 20, flex: 1 }}>
          
          {/* SEARCH BAR & BACK BUTTON */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
            <TouchableOpacity 
              onPress={() => {
                setSelectedCategory(null);
                setSelectedSubs([]);
                resetFormState();
                transitionToStep('category');
              }} 
              style={{ width: 45, height: 45, borderRadius: 23, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F2F4F6' }}
            >
              <Feather name="arrow-left" size={20} color="#191C1E" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 15, height: 45, borderWidth: 1, borderColor: '#F2F4F6' }}>
              <Feather name="search" size={18} color="#424655" />
              <TextInput 
                placeholder="Busca un servicio..." 
                placeholderTextcolor="#424655" 
                style={{ color: '#191C1E', fontFamily: 'Montserrat_400Regular', marginLeft: 10, flex: 1, fontSize: 13 }} 
                onSubmitEditing={(e) => handleSmartSearch(e.nativeEvent.text)}
                returnKeyType="search"
              />
            </View>
          </View>

          {/* HORIZONTAL CATEGORY TABS (TASKRABBIT STYLE) */}
          <View style={{ marginBottom: 25, borderBottomWidth: 1, borderBottomColor: '#F2F4F6', paddingBottom: 15 }}>
            <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 0 }}>
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory.id === cat.id;
                return (
                  <TouchableOpacity 
                    key={cat.id} 
                    onPress={() => {
                      setSelectedCategory(cat);
                      setSelectedSubs([]); // Reset subs when changing main category
                    }}
                    style={{ alignItems: 'center', marginRight: 25, paddingBottom: 5 }}
                  >
                    <View style={{ 
                      width: 54, height: 54, borderRadius: 27, 
                      backgroundColor: isActive ? 'rgba(26, 107, 255, 0.15)' : '#F8F9FB', 
                      alignItems: 'center', justifyContent: 'center', 
                      marginBottom: 8,
                      borderWidth: isActive ? 2 : 0,
                      borderColor: '#1A6BFF'
                    }}>
                      <MaterialCommunityIcons name={cat.iconName} size={26} color={isActive ? '#1A6BFF' : '#8B8FA8'} />
                    </View>
                    <Text style={{ 
                      fontFamily: isActive ? 'Montserrat_700Bold' : 'Montserrat_400Regular', 
                      color: isActive ? '#191C1E' : '#8B8FA8', 
                      fontSize: 11 
                    }}>{cat.label}</Text>
                    {isActive && <View style={{ position: 'absolute', bottom: -16, width: '40%', height: 3, backgroundColor: '#1A6BFF', borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
            {/* SUB-CATEGORIES CHIPS CLOUD */}
            <View style={{ paddingBottom: 20 }}>
               <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 18, marginBottom: 8 }}>{selectedCategory.label}</Text>
               <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 13, marginBottom: 20 }}>Selecciona los servicios que requiere tu proyecto</Text>
               
               <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                 {selectedCategory.subs.map((sub, idx) => {
                   const isSelected = selectedSubs.includes(sub.name);
                   return (
                     <TouchableOpacity 
                       key={idx} 
                       onPress={() => toggleSub(sub.name)}
                       style={{ 
                         paddingHorizontal: 20, 
                         paddingVertical: 12, 
                         borderRadius: 25, 
                         backgroundColor: isSelected ? selectedCategory.color : selectedCategory.pastelColor, 
                         borderWidth: 1, 
                         borderColor: isSelected ? selectedCategory.color : 'rgba(0,0,0,0.02)',
                         marginRight: 10,
                         marginBottom: 12,
                         shadowColor: isSelected ? selectedCategory.color : '#000',
                         shadowOffset: { width: 0, height: 2 },
                         shadowOpacity: isSelected ? 0.3 : 0.05,
                         shadowRadius: 5,
                         elevation: isSelected ? 4 : 1
                       }}
                     >
                       <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <Text style={{ 
                           fontFamily: 'Montserrat_700Bold', 
                           color: isSelected ? '#FFFFFF' : '#424655', 
                           fontSize: 13 
                         }}>{sub.name}</Text>
                       </View>
                     </TouchableOpacity>
                   );
                 })}
               </View>
            </View>
          </ScrollView>

          {/* AI SEARCH LOADING OVERLAY */}
          {isSearching && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 100, borderRadius: 20 }}>
              <ActivityIndicator size="large" color="#1A6BFF" />
              <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', marginTop: 15 }}>La IA de ServiTask está analizando...</Text>
            </View>
          )}

          {/* FLOATING ACTION BUTTON FOR MULTI-SELECT */}
          {selectedSubs.length > 0 && (
            <View style={{ position: 'absolute', bottom: 30, left: 24, right: 24 }}>
              <TouchableOpacity onPress={() => transitionToStep('form')} style={{ backgroundColor: '#1A6BFF', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#1A6BFF', shadowOpacity: 0.4, shadowRadius: 15, elevation: 8, flexDirection: 'row', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'Montserrat_900Black', color: '#FFFFFF', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1, marginRight: 10 }}>Continuar</Text>
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: '#1A6BFF', fontFamily: 'Montserrat_900Black', fontSize: 14 }}>{selectedSubs.length}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
      <Animated.View style={{ flex: 1, opacity: mainFadeAnim }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={{ paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 25, zIndex: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <TouchableOpacity onPress={() => setShowLocationMenu(true)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 13 }}>📍 {location} ▾</Text>
              </TouchableOpacity>
              <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 24, letterSpacing: -0.5 }}>Hola, {userName} 👋</Text>
            </View>
            <TouchableOpacity onPress={handleSignOut} style={{ width: 45, height: 45, backgroundColor: '#F2F4F6', borderRadius: 25, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="log-out" size={20} color="#FF5C3A" />
            </TouchableOpacity>
          </View>

          {/* SEARCH TRIGGER */}
          <TouchableOpacity onPress={() => transitionToStep('search')} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F4F6', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)' }}>
            <Feather name="search" size={20} color="#424655" style={{ marginRight: 10 }} />
            <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 15 }}>¿Qué servicio necesitas?</Text>
          </TouchableOpacity>
        </View>

        {/* PROMO BANNER */}
        <View style={{ marginHorizontal: 24, marginTop: 20, marginBottom: 20, backgroundColor: '#1A6BFF', borderRadius: 20, padding: 20, overflow: 'hidden' }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 10 }}>
            <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#FFF', fontSize: 11 }}>🔥 Oferta del día</Text>
          </View>
          <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#FFF', fontSize: 18, marginBottom: 4 }}>Primer servicio 20% OFF</Text>
          <Text style={{ fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Usa el código SERVI20 al contratar</Text>
        </View>

        {/* CATEGORIES GRID */}
        <View style={{ paddingHorizontal: 24, marginBottom: 15 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 18 }}>Categorías</Text>
            <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', fontSize: 13 }}>Ver todas</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
            {CATEGORIES.map((cat, index) => (
              <TouchableOpacity 
                key={cat.id} 
                onPress={() => {
                  setSelectedCategory(cat);
                  setSelectedSubs([]);
                  resetFormState();
                  transitionToStep('category'); // We stay in categories but show sub-grid
                }} 
                style={{ width: '31%', backgroundColor: '#F2F4F6', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#F2F4F6', marginRight: (index + 1) % 3 === 0 ? 0 : '3.5%' }}
              >
                <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: cat.color + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <MaterialCommunityIcons name={cat.iconName} size={30} color={cat.color} />
                </View>
                <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#424655', fontSize: 10, textAlign: 'center', letterSpacing: 0.2 }}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* TRUST TRIGGER: VERIFIED TASKERS (TASKRABBIT STYLE) */}
        <View style={{ paddingHorizontal: 24, marginBottom: 15 }}>
          <View style={{ width: '100%', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
            <ExpoImage 
              source={require('../../assets/images/Handyman-maintenance-skills.jpg')} 
              style={{ width: '100%', height: 160 }} 
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={300}
            />
            
            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(34, 197, 94, 0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Feather name="shield" size={16} color="#22C55E" />
                </View>
                <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 18, letterSpacing: -0.5 }}>Taskers Verificados</Text>
              </View>
              
              <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 13, lineHeight: 20, marginBottom: 15 }}>
                Cada Tasker en ServiTask ha pasado por un riguroso proceso de verificación de identidad para garantizar la seguridad de tu hogar.
              </Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15, marginBottom: 5 }}>
                  <Feather name="check" size={14} color="#1A6BFF" style={{ marginRight: 6 }} />
                  <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 12 }}>Identidad verificada</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15, marginBottom: 5 }}>
                  <Feather name="check" size={14} color="#1A6BFF" style={{ marginRight: 6 }} />
                  <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 12 }}>Garantía 100%</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                  <Feather name="check" size={14} color="#1A6BFF" style={{ marginRight: 6 }} />
                  <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 12 }}>Reseñas reales</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* POPULAR SERVICES */}
        {/* POPULAR PROJECTS: 6 SLOTS FOR FUTURE DATA */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 50 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 18 }}>Proyectos populares</Text>
            <View style={{ backgroundColor: 'rgba(26,107,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
              <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', fontSize: 10 }}>PRÓXIMAMENTE</Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={{ width: '48%', height: 140, backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: '#F2F4F6', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8F9FB', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <MaterialCommunityIcons name="star-outline" size={24} color="#D1D5DB" />
                </View>
                <View style={{ width: '80%', height: 8, backgroundColor: '#F8F9FB', borderRadius: 4, marginBottom: 6 }} />
                <View style={{ width: '50%', height: 8, backgroundColor: '#F8F9FB', borderRadius: 4 }} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM NAV BAR */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 15, backgroundColor: '#F8F9FB', borderTopWidth: 1, borderTopColor: '#F2F4F6' }}>
        <TouchableOpacity onPress={() => { setSelectedCategory(null); setSelectedSubs([]); resetFormState(); transitionToStep('category'); }} style={{ alignItems: 'center' }}>
          <Feather name="home" size={24} color="#1A6BFF" />
          <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', fontSize: 10, marginTop: 4 }}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => transitionToStep('orders')} style={{ alignItems: 'center' }}>
          <Feather name="clipboard" size={24} color="#424655" />
          <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 10, marginTop: 4 }}>Pedidos</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => transitionToStep('profile')} style={{ alignItems: 'center' }}>
          <Feather name="user" size={24} color="#424655" />
          <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 10, marginTop: 4 }}>Perfil</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM SHEET: SAVED LOCATIONS */}
      {showLocationMenu && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 300, justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowLocationMenu(false)} />
          
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, shadowColor: '#000', shadowOpacity: 1, shadowRadius: 20, elevation: 20 }}>
            {/* Drag Handle */}
            <View style={{ width: 45, height: 5, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 3, alignSelf: 'center', marginBottom: 25 }} />
            
            <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 20, marginBottom: 20 }}>Tus direcciones</Text>
            
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 350 }}>
              {savedLocations.map(loc => {
                const isSelected = location === loc.name || location === loc.address || (loc.isCurrent && location === 'Buscando...');
                return (
                  <TouchableOpacity 
                    key={loc.id} 
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F2F4F6' }}
                    onPress={() => {
                      if (loc.isCurrent) {
                        handleGetLocation(); // Triggers GPS fetch and sets MapModal true
                        setShowLocationMenu(false);
                      } else {
                        setLocation(loc.name);
                        setShowLocationMenu(false);
                      }
                    }}
                  >
                    <View style={{ width: 45, height: 45, borderRadius: 23, backgroundColor: '#F2F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
                      <Feather name={loc.icon} size={20} color={loc.isCurrent ? "#1A6BFF" : "#8B8FA8"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 15, marginBottom: 3 }}>{loc.name}</Text>
                      <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 12 }}>{loc.address}</Text>
                    </View>
                    {isSelected && (
                      <Feather name="check-circle" size={20} color="#1A6BFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
              
              {/* Add New Button */}
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 18, marginTop: 5 }}
                onPress={() => {
                  setShowLocationMenu(false);
                  setShowMapModal(true);
                }}
              >
                <View style={{ width: 45, height: 45, borderRadius: 23, backgroundColor: 'rgba(26, 107, 255, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 15, borderWidth: 1, borderColor: 'rgba(26, 107, 255, 0.3)' }}>
                  <Feather name="plus" size={20} color="#1A6BFF" />
                </View>
                <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', fontSize: 15 }}>Agregar una nueva ubicación</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {/* REUSED MAP MODAL FOR MAIN FEED */}
      {showMapModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#F8F9FB', zIndex: 350 }}>
          <View style={{ paddingTop: Platform.OS === 'android' ? 50 : 50, paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', zIndex: 10, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 }}>
            <TouchableOpacity onPress={() => setShowMapModal(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F2F4F6' }}>
              <Feather name="arrow-left" size={20} color="#191C1E" />
            </TouchableOpacity>
            <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 18, marginLeft: 15 }}>Fija tu ubicación exacta</Text>
          </View>

          <View style={{ flex: 1 }}>
            <MapView 
              style={{ flex: 1 }} 
              initialRegion={mapRegion}
              onRegionChangeComplete={(region) => setMapRegion(region)}
              showsUserLocation={true}
              userInterfaceStyle="dark"
              customMapStyle={[
                { "elementType": "geometry", "stylers": [{"color": "#FFFFFF"}] },
                { "elementType": "labels.text.fill", "stylers": [{"color": "#8B8FA8"}] },
                { "elementType": "labels.text.stroke", "stylers": [{"color": "#F8F9FB"}] },
                { "featureType": "road", "elementType": "geometry", "stylers": [{"color": "#F8F9FB"}] },
                { "featureType": "water", "elementType": "geometry", "stylers": [{"color": "#1A6BFF"}] }
              ]}
            />
            
            <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -24, marginTop: -48, pointerEvents: 'none', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#1A6BFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 }}>
                <Text style={{ color: '#FFFFFF', fontFamily: 'Montserrat_700Bold', fontSize: 12 }}>Estoy aquí</Text>
              </View>
              <View style={{ width: 4, height: 20, backgroundColor: '#1A6BFF', marginBottom: -5 }} />
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#F8F9FB', borderWidth: 3, borderColor: '#1A6BFF' }} />
            </View>

            <View style={{ position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, shadowColor: '#000', shadowOpacity: 1, shadowRadius: 20, elevation: 20 }}>
              <Text style={{ color: '#424655', fontFamily: 'Montserrat_700Bold', fontSize: 13, marginBottom: 15, textAlign: 'center' }}>Mueve el mapa para afinar la ubicación exacta del servicio.</Text>
              <TouchableOpacity 
                onPress={async () => {
                  try {
                    let geocode = await Location.reverseGeocodeAsync({ latitude: mapRegion.latitude, longitude: mapRegion.longitude });
                    if (geocode && geocode.length > 0) {
                      const place = geocode[0];
                      const street = place.street || place.name || '';
                      const city = place.city || place.subregion || '';
                      const newLoc = `${street ? street + ', ' : ''}${city}`.trim().replace(/^, |, $/g, '');
                      const fullLabel = newLoc || 'Ubicación en mapa';
                      
                      setLocTempBase(fullLabel);
                      setShowLocationDetailForm(true); // Transition to Phase 2
                    } else {
                      setLocation('Ubicación personalizada');
                      setShowMapModal(false);
                    }
                  } catch (e) {
                     setLocation('Ubicación en mapa');
                     setShowMapModal(false);
                  }
                }}
                style={{ backgroundColor: '#1A6BFF', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#1A6BFF', shadowOpacity: 0.4, shadowRadius: 10 }}
              >
                <Text style={{ fontFamily: 'Montserrat_900Black', color: '#FFFFFF', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 }}>CONFIRMAR UBICACIÓN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* PHASE 2: DETAILED LOCATION FORM (PEDIDOSYA STYLE) */}
      {showLocationDetailForm && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 400, justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 20 }}>
              <View style={{ width: 45, height: 5, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 3, alignSelf: 'center', marginBottom: 20 }} />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity onPress={() => setShowLocationDetailForm(false)} style={{ marginRight: 15 }}>
                  <Feather name="arrow-left" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={{ fontFamily: 'Montserrat_900Black', color: '#1E293B', fontSize: 18 }}>Casi listo... Danos el detalle</Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={{ backgroundColor: '#F8FAFC', padding: 15, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' }}>
                   <Text style={{ fontSize: 10, fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', textTransform: 'uppercase', marginBottom: 4 }}>Punto en el mapa</Text>
                   <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#1E293B', fontSize: 13 }}>{locTempBase}</Text>
                </View>

                {/* FIELDS GRID */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 15 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Montserrat_700Bold', color: '#475569', marginBottom: 6 }}>Manzana *</Text>
                    <TextInput value={locMz} onChangeText={setLocMz} placeholder="Mz. 40" style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', fontFamily: 'Montserrat_400Regular', fontSize: 14 }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Montserrat_700Bold', color: '#475569', marginBottom: 6 }}>Villa / Casa *</Text>
                    <TextInput value={locVilla} onChangeText={setLocVilla} placeholder="Villa 12" style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', fontFamily: 'Montserrat_400Regular', fontSize: 14 }} />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 15 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Montserrat_700Bold', color: '#475569', marginBottom: 6 }}>Solar *</Text>
                    <TextInput value={locSolar} onChangeText={setLocSolar} placeholder="Solar 5" style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', fontFamily: 'Montserrat_400Regular', fontSize: 14 }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Montserrat_400Regular', color: '#64748B', marginBottom: 6 }}>Piso / Depto (Opcional)</Text>
                    <TextInput value={locDepto} onChangeText={setLocDepto} placeholder="Apt 2B" style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', fontFamily: 'Montserrat_400Regular', fontSize: 14 }} />
                  </View>
                </View>

                <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Montserrat_700Bold', color: '#475569', marginBottom: 6 }}>Referencias adicionales de llegada *</Text>
                  <TextInput value={locRef} onChangeText={setLocRef} placeholder="A lado de la farmacia azul..." style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', fontFamily: 'Montserrat_400Regular', fontSize: 14 }} />
                </View>

                <View style={{ marginBottom: 25 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Montserrat_700Bold', color: '#475569', marginBottom: 6 }}>Nombre de la dirección (Alias) *</Text>
                  <TextInput value={locAlias} onChangeText={setLocAlias} placeholder="Casa Playa, Casa Mamá..." style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 2, borderColor: '#1A6BFF22', fontFamily: 'Montserrat_700Bold', fontSize: 14, color: '#1A6BFF' }} />
                </View>

                <TouchableOpacity 
                   onPress={() => {
                     if (!locMz || !locVilla || !locSolar || !locRef || !locAlias) {
                        Alert.alert("Campos incompletos", "Por favor llena todos los campos marcados como obligatorios (*)");
                        return;
                     }
                     
                     const structuredAddress = `${locTempBase} - Mz. ${locMz}, Villa ${locVilla}${locDepto ? ', Apt ' + locDepto : ''}`;
                     const finalLabel = locAlias;
                     
                     setSavedLocations(prev => [
                       ...prev,
                       { 
                         id: Date.now().toString(), 
                         name: finalLabel, 
                         address: structuredAddress, 
                         icon: 'map-pin',
                         details: { mz: locMz, villa: locVilla, depto: locDepto, ref: locRef }
                       }
                     ]);
                     
                     setLocation(finalLabel);
                     setShowLocationDetailForm(false);
                     setShowMapModal(false);
                     
                     // Reset helper states
                     setLocMz(''); setLocVilla(''); setLocSolar(''); setLocDepto(''); setLocRef(''); setLocAlias('');
                   }}
                   style={{ backgroundColor: '#1A6BFF', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#1A6BFF', shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 }}
                >
                  <Text style={{ fontFamily: 'Montserrat_900Black', color: '#FFFFFF', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 }}>GUARDAR DIRECCIÓN</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
      </Animated.View>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════
// AUTHENTICATION SCREEN
// ══════════════════════════════════════════
function AuthScreen({ setSession }) {
  const [mode, setModeState] = useState('welcome'); 
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const imageFadeAnim = React.useRef(new Animated.Value(0)).current;

  const onImageLoad = () => {
    Animated.timing(imageFadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateIsSet, setDateIsSet] = useState(false);
  
  const [frontId, setFrontId] = useState(null);
  const [backId, setBackId] = useState(null);
  const [selfie, setSelfie] = useState(null);

  const [isLocating, setIsLocating] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapRegion, setMapRegion] = useState({ latitude: -2.1894, longitude: -79.8890, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  const [authLocation, setAuthLocation] = useState('Ubicación personalizada');

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
    
    // Solo limpiamos los inputs si estamos cerrando el registro o cambiando entre login/welcome
    // NO limpiamos los datos si solo estamos pasando al paso 2 o paso 3 del registro!
    if (newMode === 'welcome' || newMode === 'login') {
      setEmail('');
      setPassword('');
      setName('');
      setConfirmPassword('');
      setOtpCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setFrontId(null);
      setBackId(null);
      setSelfie(null);
      setBirthDate(new Date());
      setDateIsSet(false);
      setAuthLocation('Ubicación personalizada');
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update_password');
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  
  const Requirement = ({ met, text }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
      <Feather name={met ? "check-circle" : "circle"} size={14} color={met ? "#22C55E" : "#8B8FA8"} />
      <Text style={{ color: met ? '#22C55E' : '#8B8FA8', marginLeft: 8, fontSize: 13, fontFamily: 'Montserrat_400Regular' }}>{text}</Text>
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

  const handleGetLocation = async () => {
    try {
      setIsLocating(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('GPS Obligatorio 📍', 'Por favor habilita el GPS para encontrar tu ubicación exacta.');
        setIsLocating(false);
        return;
      }
      let locationObj = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setMapRegion({ latitude: locationObj.coords.latitude, longitude: locationObj.coords.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 });
      setShowMapModal(true);
    } catch (err) {
      setShowMapModal(true);
    } finally {
      setIsLocating(false);
    }
  };

  const Stepper = ({ step, title, subtitle }) => (
    <View style={{ alignItems: 'center', marginBottom: 25, marginTop: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#1A6BFF', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <Feather name={step > 1 ? "check" : "user"} size={14} color="#FFF" />
        </View>
        <View style={{ width: 35, height: 3, backgroundColor: step >= 2 ? '#1A6BFF' : 'rgba(0,0,0,0.07)', marginLeft: -5, marginRight: -5, zIndex: 1 }} />
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: step >= 2 ? '#1A6BFF' : 'transparent', borderWidth: step >= 2 ? 0 : 2, borderColor: step >= 2 ? 'transparent' : 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <Feather name={step > 2 ? "check" : "map-pin"} size={14} color={step >= 2 ? "#FFF" : "#8B8FA8"} />
        </View>
        <View style={{ width: 35, height: 3, backgroundColor: step >= 3 ? '#1A6BFF' : 'rgba(0,0,0,0.07)', marginLeft: -5, marginRight: -5, zIndex: 1 }} />
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: step >= 3 ? '#1A6BFF' : 'transparent', borderWidth: step >= 3 ? 0 : 2, borderColor: step >= 3 ? 'transparent' : 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <Feather name="camera" size={14} color={step >= 3 ? "#FFF" : "#8B8FA8"} />
        </View>
      </View>
      <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 18, marginBottom: 4 }}>{title}</Text>
      {subtitle && <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 13, textAlign: 'center' }}>{subtitle}</Text>}
    </View>
  );

  const goBack = () => {
    if (mode === 'login' || mode === 'register_step1') setMode('welcome');
    else if (mode === 'register_step2') setMode('register_step1');
    else if (mode === 'register_step3') setMode('register_step2');
     else if (mode === 'forgot_password') setMode('login');
    else if (mode === 'verify_otp') setMode('welcome');
    else if (mode === 'update_password') setMode('login');
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
      options: { data: { full_name: name, birth_date: birthDate, location: authLocation } }
    });
    
    if (error) {
      Alert.alert("Error de registro", error.message);
    } else if (data?.user?.identities && data.user.identities.length === 0) {
      // Supabase anti-spam security check: identities is empty if email already exists
      Alert.alert(
        "¡Correo en uso! ⚠️", 
        "Este correo electrónico ya está registrado en SERVITASK. Por favor, intenta conectar desde Iniciar Sesión o usa un correo totalmente nuevo."
      );
    } else {
      // Si la base de datos no exige confirmación, inicia sesión automáticamente
      if (data.session) {
         if (setSession) setSession(data.session);
      } else {
         // Si la base de datos SÍ exige confirmación, vamos a la pantalla de código
         setMode('verify_otp');
      }
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Datos incompletos", "Por favor ingresa tu correo y contraseña.");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return Alert.alert("Correo inválido", "El formato del correo es incorrecto.");
    
    // Cuenta DEMO secreta para pruebas rápidas
    if (email.toLowerCase() === 'demo@servitask.com' && password === '123456') {
      if (setSession) setSession({ user: { user_metadata: { full_name: 'Daniel (Demo)' } } });
      return;
    }

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
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL('/auth/callback'),
    });
    if (error) Alert.alert("Error", error.message);
    else Alert.alert("Enviado", "Revisa tu buzón para el enlace mágico.");
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) return Alert.alert("Datos faltantes", "Ingresa tu nueva contraseña.");
    if (newPassword !== confirmNewPassword) return Alert.alert("No coinciden", "Las contraseñas no son iguales.");
    
    // Check requirements (optional but recommended)
    const hasMinLength = newPassword.length >= 8;
    if (!hasMinLength) return Alert.alert("Seguridad", "La contraseña debe tener al menos 8 caracteres.");

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("¡Éxito! 🎉", "Tu contraseña ha sido actualizada. Ahora puedes iniciar sesión.");
      setMode('login');
    }
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

  return (
    <>
    <StatusBar translucent backgroundColor="transparent" style={mode === 'welcome' ? 'light' : 'dark'} />
    <SafeAreaView style={{ flex: 1, backgroundColor: mode === 'welcome' ? '#4facfe' : '#F8F9FB' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          scrollEnabled={mode !== 'welcome'}
          bounces={mode !== 'welcome'}
        >
          
          {/* HEADER SECTION (Persistent Logo) */}
          <View style={[styles.header, mode === 'welcome' && { paddingTop: 0, paddingBottom: 0, height: 420, justifyContent: 'center', overflow: 'hidden' }]}>
            {mode !== 'welcome' && (
              <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginTop: Platform.OS === 'ios' ? 50 : 30, paddingHorizontal: 20 }}>
                <TouchableOpacity style={{ padding: 10, backgroundColor: '#F2F4F6', borderRadius: 8, flexDirection: 'row', alignItems: 'center' }} onPress={goBack}>
                  <Text style={styles.backButtonText}>← Atrás</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Simplified Background (Solid Celeste) */}
            {mode === 'welcome' && (
              <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#4facfe' }} />
            )}

            {/* LOGO IMAGE */}
            <View style={{ 
              alignItems: 'center', 
              marginTop: mode === 'welcome' ? 60 : 15, 
              marginBottom: mode === 'welcome' ? 10 : 25 
            }}>
              <ExpoImage 
                source={require('../../assets/images/logo3.png')} 
                style={{ width: mode === 'welcome' ? 260 : 200, height: mode === 'welcome' ? 260 : 200 }}
                contentFit="contain"
                transition={0}
                cachePolicy="memory-disk"
              />
            </View>
          </View>

          <Animated.View style={[styles.formContainer, { opacity: fadeAnim }, mode === 'welcome' && { padding: 0, backgroundColor: 'transparent', marginTop: 0 }]}>
            {mode === 'welcome' && (
              <View style={styles.bottomSheet}>
                <Text style={[styles.bottomSheetTitle, { marginBottom: 6 }]}>Elige cómo quieres ingresar</Text>
                <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', fontSize: 14, textAlign: 'center', marginBottom: 28 }}>Accede a tu cuenta para continuar</Text>

                <TouchableOpacity style={[styles.socialButton, {backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.10, shadowRadius: 10, elevation: 4}]} onPress={handleGoogleLogin}>
                  <View style={styles.socialIconWrapper}><Ionicons name="logo-google" size={20} color="#000" /></View>
                  <Text style={[styles.socialButtonText, {color: '#000'}]}>Continuar con Google</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.socialButton, {backgroundColor: '#000'}]} onPress={() => Alert.alert("Apple", "Próximamente")}>
                  <View style={styles.socialIconWrapper}><Ionicons name="logo-apple" size={20} color="#FFF" /></View>
                  <Text style={[styles.socialButtonText, {color: '#FFFFFF'}]}>Continuar con Apple</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.socialButton, {backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', marginTop: 8}]} onPress={() => setMode('login')}>
                  <Text style={[styles.socialButtonText, {color: '#191C1E'}]}>Ingresar con Correo</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'login' && (
              <View>
                <Text style={styles.label}>Correo electrónico</Text>
                <TextInput style={[styles.input, { color: '#191C1E' }]} placeholder="correo@ejemplo.com" placeholderTextcolor="#424655" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                <Text style={styles.label}>Contraseña</Text>
                <TextInput style={[styles.input, { color: '#191C1E' }]} placeholder="••••••••" placeholderTextcolor="#424655" secureTextEntry value={password} onChangeText={setPassword} />
                <TouchableOpacity style={{ alignItems: 'flex-end', marginBottom: 25 }} onPress={() => setMode('forgot_password')}><Text style={{ fontFamily: 'Montserrat_700Bold', color: '#1A6BFF', fontSize: 13 }}>¿Olvidaste tu clave?</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}><Text style={styles.primaryButtonText}>Entrar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)' }]} onPress={() => setMode('register_step1')}><Text style={[styles.primaryButtonText, { color: '#424655' }]}>Registrarme</Text></TouchableOpacity>
              </View>
            )}

            {mode === 'register_step1' && (
              <View>
                <Stepper step={1} title="Datos Personales" subtitle="Información básica de tu cuenta" />
                <Text style={styles.label}>Nombre completo</Text>
                <TextInput style={[styles.input, { color: '#191C1E' }]} placeholder="Ej. Daniel Alarcón" placeholderTextcolor="#424655" value={name} onChangeText={setName} />
                <Text style={styles.label}>Fecha de Nacimiento</Text>
                <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
                    <Text style={{ fontFamily: 'Montserrat_400Regular', color: dateIsSet ? '#191C1E' : '#9EA3B0', fontSize: 15 }}>
                     {dateIsSet ? formatDate(birthDate) : "Toca para abrir calendario 📅"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && <DateTimePicker value={birthDate} mode="date" display="spinner" maximumDate={new Date()} onChange={onDateChange} textColor="#191C1E" themeVariant="light" />}
                {Platform.OS === 'ios' && showDatePicker && (
                  <TouchableOpacity style={{backgroundColor: '#1A6BFF', padding: 10, borderRadius: 8, alignItems:'center', marginBottom:20}} onPress={() => setShowDatePicker(false)}>
                    <Text style={{fontFamily: 'Montserrat_700Bold', color:'#FFF'}}>Confirmar Fecha</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.label}>Correo electrónico</Text>
                <TextInput style={[styles.input, { color: '#191C1E' }]} placeholder="correo@ejemplo.com" placeholderTextcolor="#424655" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                <Text style={styles.label}>Crea tu Contraseña</Text>
                <TextInput style={[styles.input, { color: '#191C1E', marginBottom: 10 }]} placeholder="••••••••" placeholderTextcolor="#424655" secureTextEntry value={password} onChangeText={setPassword} />
                <View style={{ marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.03)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#F2F4F6' }}>
                  <Text style={{ color: '#191C1E', fontFamily: 'Montserrat_700Bold', marginBottom: 10, fontSize: 13 }}>Tu contraseña debe contener:</Text>
                  <Requirement met={hasUpperCase} text="1 Letra mayúscula" />
                  <Requirement met={hasLowerCase} text="1 Letra minúscula" />
                  <Requirement met={hasNumber} text="1 Número" />
                  <Requirement met={hasSpecialChar} text="1 Carácter especial (ej. !?<>@#$%)" />
                  <Requirement met={hasMinLength} text="8 Caracteres o más" />
                </View>
                <Text style={styles.label}>Confirmar Contraseña</Text>
                <TextInput style={[styles.input, { color: '#191C1E' }]} placeholder="••••••••" placeholderTextcolor="#424655" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
                <TouchableOpacity style={styles.primaryButton} onPress={validateStep1AndProceed}>
                  <Text style={styles.primaryButtonText}>Siguiente Paso ➔</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'register_step2' && (
              <View>
                <Stepper step={2} title="Tu Dirección" subtitle="Esta ubicación es un referente para conectarte cerca" />
                <Text style={[styles.label, {marginTop: 10}]}>¿Dónde te ubicas?</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 25 }}>
                  <TouchableOpacity onPress={() => setShowMapModal(true)} style={[styles.inputContainer, { flex: 1, paddingVertical: 18, marginBottom: 0 }]}>
                    <Feather name="map-pin" size={18} color="#424655" style={{ marginRight: 10 }} />
                    <Text style={{ flex: 1, color: '#191C1E', fontFamily: 'Montserrat_700Bold', fontSize: 13 }} numberOfLines={1}>{authLocation}</Text>
                    <Feather name="chevron-down" size={18} color="#424655" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleGetLocation} disabled={isLocating} style={{ width: 56, height: 56, backgroundColor: 'rgba(26, 107, 255, 0.15)', borderRadius: 12, marginLeft: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(26, 107, 255, 0.3)' }}>
                    {isLocating ? <ActivityIndicator color="#1A6BFF" size="small" /> : <Feather name="crosshair" size={20} color="#1A6BFF" />}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.primaryButton} onPress={() => setMode('register_step3')}>
                  <Text style={styles.primaryButtonText}>Siguiente Paso ➔</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'register_step3' && (
              <View>
                <Stepper step={3} title="Verificación de Identidad" subtitle="Toca los botones para adjuntar las fotos de tus documentos" />
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
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#16A34A' }]} onPress={handleSignUp}>
                  <Text style={styles.primaryButtonText}>Crear Cuenta de SERVITASK</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'verify_otp' && (
               <View style={{ alignItems: 'center' }}>
                <View style={{ backgroundColor: 'rgba(26, 107, 255, 0.1)', padding: 20, borderRadius: 100, marginBottom: 20 }}>
                  <Text style={{ fontSize: 40 }}>✉️</Text>
                </View>
                <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 24, marginBottom: 10 }}>Verifica tu correo</Text>
                <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', textAlign: 'center', marginBottom: 30, fontSize: 15, lineHeight: 22 }}>
                  Hemos enviado un código mágico de 6 dígitos a: {"\n"}<Text style={{color: '#1A6BFF', fontWeight: 'bold'}}>{email}</Text>
                </Text>
                <TextInput style={[styles.input, { color: '#191C1E', fontSize: 32, textAlign: 'center', letterSpacing: 15, width: '100%', marginBottom: 30 }]} placeholder="000000" placeholderTextColor="rgba(139, 143, 168, 0.3)" keyboardType="numeric" maxLength={6} value={otpCode} onChangeText={setOtpCode} />
                <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp}>
                  <Text style={styles.primaryButtonText}>Verificar Código</Text>
                </TouchableOpacity>
              </View>
            )}

    {mode === 'forgot_password' && (
      <View>
        <Text style={styles.label}>Correo para recuperar</Text>
        <TextInput style={[styles.input, { color: '#191C1E' }]} placeholder="correo@gmail.com" placeholderTextColor="#424655" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TouchableOpacity style={styles.primaryButton} onPress={handleForgotPassword}><Text style={styles.primaryButtonText}>Enviar Enlace</Text></TouchableOpacity>
      </View>
    )}

    {mode === 'update_password' && (
      <View>
        <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#191C1E', fontSize: 20, marginBottom: 10, textAlign: 'center' }}>Nueva Contraseña</Text>
        <Text style={{ fontFamily: 'Montserrat_400Regular', color: '#424655', textAlign: 'center', marginBottom: 25, fontSize: 14 }}>
          Ingresa tu nueva clave de acceso para SERVITASK
        </Text>
        
        <Text style={styles.label}>Nueva Contraseña</Text>
        <TextInput 
          style={[styles.input, { color: '#191C1E' }]} 
          placeholder="••••••••" 
          placeholderTextColor="#424655" 
          secureTextEntry 
          value={newPassword} 
          onChangeText={setNewPassword} 
        />
        
        <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
        <TextInput 
          style={[styles.input, { color: '#191C1E' }]} 
          placeholder="••••••••" 
          placeholderTextColor="#424655" 
          secureTextEntry 
          value={confirmNewPassword} 
          onChangeText={setConfirmNewPassword} 
        />
        
        <TouchableOpacity style={styles.primaryButton} onPress={handleUpdatePassword}>
          <Text style={styles.primaryButtonText}>Actualizar Clave</Text>
        </TouchableOpacity>
      </View>
    )}
  </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* INTERACTIVE FULLSCREEN MAP MODAL (AUTH) */}
      {showMapModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#F8F9FB', zIndex: 200 }}>
          <View style={{ paddingTop: Platform.OS === 'android' ? 50 : 50, paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', zIndex: 10, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 }}>
            <TouchableOpacity onPress={() => setShowMapModal(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F2F4F6' }}>
              <Feather name="arrow-left" size={20} color="#191C1E" />
            </TouchableOpacity>
            <Text style={{ fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 18, marginLeft: 15 }}>Fija tu ubicación exacta</Text>
          </View>

          <View style={{ flex: 1 }}>
            <MapView 
              style={{ flex: 1 }} 
              initialRegion={mapRegion}
              onRegionChangeComplete={(region) => setMapRegion(region)}
              showsUserLocation={true}
              userInterfaceStyle="dark"
              customMapStyle={[
                { "elementType": "geometry", "stylers": [{"color": "#FFFFFF"}] },
                { "elementType": "labels.text.fill", "stylers": [{"color": "#8B8FA8"}] },
                { "elementType": "labels.text.stroke", "stylers": [{"color": "#F8F9FB"}] },
                { "featureType": "road", "elementType": "geometry", "stylers": [{"color": "#F8F9FB"}] },
                { "featureType": "water", "elementType": "geometry", "stylers": [{"color": "#1A6BFF"}] }
              ]}
            />
            
            <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -24, marginTop: -48, pointerEvents: 'none', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#1A6BFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 }}>
                <Text style={{ color: '#FFFFFF', fontFamily: 'Montserrat_700Bold', fontSize: 12 }}>Estoy aquí</Text>
              </View>
              <View style={{ width: 4, height: 20, backgroundColor: '#1A6BFF', marginBottom: -5 }} />
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#F8F9FB', borderWidth: 3, borderColor: '#1A6BFF' }} />
            </View>

            <View style={{ position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, shadowColor: '#000', shadowOpacity: 1, shadowRadius: 20, elevation: 20 }}>
              <Text style={{ color: '#424655', fontFamily: 'Montserrat_700Bold', fontSize: 13, marginBottom: 15, textAlign: 'center' }}>Mueve el mapa para afinar tu ubicación y conectar cerca.</Text>
              <TouchableOpacity 
                onPress={async () => {
                  try {
                    let geocode = await Location.reverseGeocodeAsync({ latitude: mapRegion.latitude, longitude: mapRegion.longitude });
                    if (geocode && geocode.length > 0) {
                      const place = geocode[0];
                      const street = place.street || place.name || '';
                      const city = place.city || place.subregion || '';
                      const newLoc = `${street ? street + ', ' : ''}${city}`.trim().replace(/^, |, $/g, '');
                      setAuthLocation(newLoc || 'Ubicación en mapa');
                    } else {
                      setAuthLocation('Ubicación personalizada al pin');
                    }
                  } catch (e) {
                     setAuthLocation('Ubicación en mapa');
                  }
                  setShowMapModal(false);
                }}
                style={{ backgroundColor: '#1A6BFF', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#1A6BFF', shadowOpacity: 0.4, shadowRadius: 10 }}
              >
                <Text style={{ fontFamily: 'Montserrat_900Black', color: '#FFFFFF', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 }}>CONFIRMAR UBICACIÓN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
    </>
  );
}

// ══════════════════════════════════════════
// PREMIUM SPLASH SCREEN (UBER STYLE)
// ══════════════════════════════════════════
const ServiTaskSplashScreen = ({ onFinish }) => {
  const scaleValue = React.useRef(new Animated.Value(0.4)).current;
  const opacityValue = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(15)).current;
  
  React.useEffect(() => {
    // Initial entrance animation
    Animated.parallel([
      Animated.timing(opacityValue, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(scaleValue, { toValue: 1, tension: 15, friction: 3.5, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ]).start();
    
    // Hold then fade out smoothly
    const timer = setTimeout(() => {
       Animated.timing(opacityValue, { toValue: 0, duration: 600, useNativeDriver: true }).start(onFinish);
    }, 2300);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#1A6BFF', justifyContent: 'center', alignItems: 'center' }}>
      <StatusBar style="light" />
      <Animated.View style={{ 
        alignItems: 'center',
        opacity: opacityValue, 
        transform: [
          { scale: scaleValue },
          { translateY: translateY }
        ] 
      }}>
         <View style={{ alignItems: 'baseline', flexDirection: 'row' }}>
            <Text style={{ fontFamily: 'Montserrat_900Black', fontSize: 52, color: '#191C1E', letterSpacing: -2 }}>SERVITASK</Text>
         </View>
      </Animated.View>
      
      {/* HIDDEN PRELOADER FOR HD LOGO */}
      <ExpoImage 
        source={require('../../assets/images/logo3.png')} 
        style={{ width: 10, height: 10, opacity: 0.01, position: 'absolute' }} 
        cachePolicy="memory-disk"
      />
    </View>
  );
};

// ══════════════════════════════════════════
// MAIN APP ROUTER (Decides Auth vs Home)
// ══════════════════════════════════════════
export default function App() {
  let [fontsLoaded] = useFonts({ Montserrat_400Regular, Montserrat_700Bold, Montserrat_900Black });
  const [session, setSession] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);

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
    return (
       <View style={{ flex: 1, backgroundColor: '#1A6BFF', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#000000" size="large" />
       </View>
    );
  }

  // Show Premium Splash Screen
  if (!isAppReady) {
    return <ServiTaskSplashScreen onFinish={() => setIsAppReady(true)} />;
  }

  if (session && session.user) {
    return <HomeScreen session={session} setSession={setSession} />;
  }

  return <AuthScreen setSession={setSession} />;
}

const styles = StyleSheet.create({
  welcomeContainer: { flex: 1, backgroundColor: '#F8F9FB' },
  heroSection: { flex: 1, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  heroImage: { position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: { position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(13, 15, 26, 0.65)' },
  heroLogoContainer: { position: 'absolute', alignItems: 'center', bottom: -5, zIndex: 10 },
  heroLogoText: { fontFamily: 'Montserrat_900Black', fontSize: 50, color: '#FFFFFF', letterSpacing: -1, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 10 },
  bottomSheet: { backgroundColor: '#F8F9FB', paddingHorizontal: 24, paddingTop: 36, paddingBottom: 60, borderTopLeftRadius: 40, borderTopRightRadius: 40, borderTopWidth: 1, borderTopColor: '#ECEEF2', marginTop: -35, flex: 1, minHeight: 400 },
  bottomSheetTitle: { fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 22, marginBottom: 25, textAlign: 'center', letterSpacing: -0.5 },
  socialButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 30, marginBottom: 12 },
  socialIconWrapper: { position: 'absolute', left: 24 },
  socialButtonText: { fontFamily: 'Montserrat_700Bold', fontSize: 16 },

  container: { flex: 1, backgroundColor: '#F8F9FB' },
  backButton: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, zIndex: 10, padding: 10, backgroundColor: '#F2F4F6', borderRadius: 8 },
  backButtonText: { fontFamily: 'Montserrat_700Bold', color: '#424655' },
  scrollContent: { flexGrow: 1, justifyContent: 'flex-start', paddingBottom: 0 },
  header: { paddingTop: 0, paddingBottom: 0, alignItems: 'center' },
  icon: { fontSize: 48, marginBottom: 10 },
  logo: { fontFamily: 'Montserrat_900Black', fontSize: 32, color: '#191C1E', letterSpacing: -1 },
  logoHighlight: { color: '#1A6BFF' },
  formContainer: { paddingHorizontal: 24, width: '100%', maxWidth: 450, alignSelf: 'center' },
  label: { fontFamily: 'Montserrat_700Bold', color: '#424655', fontSize: 12, marginBottom: 8, textTransform: 'uppercase' },
  input: { fontFamily: 'Montserrat_400Regular', color: '#191C1E', backgroundColor: '#F2F4F6', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 18, fontSize: 15 },
  datePickerButton: { backgroundColor: '#F2F4F6', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 18, justifyContent: 'center' },
  imagePicker: { width: '100%', height: 110, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 2, borderColor: 'rgba(0,0,0,0.07)', borderStyle: 'dashed', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePickerText: { fontFamily: 'Montserrat_700Bold', color: '#1A6BFF' },
  primaryButton: { backgroundColor: '#1A6BFF', padding: 16, borderRadius: 10, alignItems: 'center', width: '100%', marginBottom: 15 },
  primaryButtonText: { fontFamily: 'Montserrat_700Bold', color: '#FFFFFF', fontSize: 16 },

  // Request Form Styles
  formLabel: { fontFamily: 'Montserrat_900Black', color: '#191C1E', fontSize: 13, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 25, borderWidth: 1, borderColor: '#F2F4F6' },
  choiceBtn: { width: '31%', backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  choiceBtnActive: { backgroundColor: 'rgba(26, 107, 255, 0.15)', borderColor: '#1A6BFF', borderWidth: 2 },
  choiceText: { color: '#424655', fontFamily: 'Montserrat_700Bold', fontSize: 11, textAlign: 'center' },
  choiceTextActive: { color: '#191C1E' }
});


