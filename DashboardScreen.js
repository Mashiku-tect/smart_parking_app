// 📦 your imports
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

//const RECHARGE_URL = 'http://mashiku.infinityfreeapp.com/azampay/';

const DashboardScreen = ({ navigation, route }) => {
  const [username, setUsername] = useState('');
  const [parkingSlots, setParkingSlots] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [plateModalVisible, setPlateModalVisible] = useState(false);
  const [plateNumber, setPlateNumber] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);

  const fetchParkingSlots = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch('https://367d-197-186-6-199.ngrok-free.app/api/slots', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const mappedData = data.map(slot => ({
          ...slot,
          isAvailable: slot.status === 'available',
        }));
        setParkingSlots(mappedData);
      } else {
        if (response.status === 401) {
          Alert.alert('Session expired', 'Please log in again');
          navigation.replace('Login');
        } else {
          Alert.alert('Error', 'Failed to fetch parking slots');
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Something went wrong while fetching slots.');
    }
  }, [navigation]);

  const fetchUserInfo = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');

    try {
      const response = await fetch('https://367d-197-186-6-199.ngrok-free.app/api/info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setUsername(data.username || 'User');
        setBalance(data.balance ?? 0);
      } else {
        Alert.alert('Error', 'Failed to fetch user info');
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
      Alert.alert('Error', 'Something went wrong fetching your info');
    }
  }, []);

  useEffect(() => {
    fetchUserInfo();
    fetchParkingSlots();
  }, [fetchUserInfo, fetchParkingSlots]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchParkingSlots();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.replace('Login');
  };

  const handleSlotPress = (slot) => {
    setSelectedSlot(slot);
    setPlateModalVisible(true);
  };

  const handleReserveSlot = async () => {
    const plateRegex = /^T \d{3} [A-E][A-Z]{2}$/;

    if (!plateNumber.trim()) {
      Alert.alert('Error', 'Please enter a plate number');
      return;
    }

    if (!plateRegex.test(plateNumber.trim().toUpperCase())) {
      Alert.alert(
        'Invalid Plate Format',
        'Plate must follow the format: T 123 ABC (where A is A-E)'
      );
      return;
    }

    setLoading(true);
    const token = await AsyncStorage.getItem('token');

    try {
      const response = await fetch(`https://367d-197-186-6-199.ngrok-free.app/api/slots/${selectedSlot.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'reserved',
          plate_number: plateNumber.trim().toUpperCase(),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Slot reserved successfully!');
        fetchParkingSlots();
      } else {
        Alert.alert('Failed', data.message || 'Could not reserve slot');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to reserve slot');
    } finally {
      setLoading(false);
      setPlateModalVisible(false);
      setPlateNumber('');
      setSelectedSlot(null);
    }
  };

  const handleRechargePress = () => {
    //Linking.openURL(RECHARGE_URL);
     navigation.navigate('Payment');
  };

  const renderSlot = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.slot,
        { backgroundColor: item.isAvailable ? '#28a745' : '#dc3545' },
      ]}
      onPress={() => item.isAvailable && handleSlotPress(item)}
      disabled={!item.isAvailable}
    >
      <Text style={styles.slotText}>
        Slot {item.id} - {item.isAvailable ? 'Available' : 'Occupied'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome {username}</Text>

      <View style={styles.balanceContainer}>
        <Text style={styles.balanceText}>Balance: Tsh.{balance}</Text>
        <TouchableOpacity style={styles.rechargeButton} onPress={handleRechargePress}>
          <Text style={styles.rechargeButtonText}>Recharge</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.instructionText}>Select A Slot To Reserve</Text>

      <FlatList
        data={parkingSlots}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSlot}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* 🚗 Plate Modal */}
      <Modal
        visible={plateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPlateModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#28a745" />
            ) : (
              <>
                <Text style={styles.modalTitle}>Enter Plate Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="T 123 ABC"
                  value={plateNumber}
                  onChangeText={(text) => setPlateNumber(text.toUpperCase())} // 👈 Uppercase as user types
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.confirmButton} onPress={handleReserveSlot}>
                  <Text style={styles.confirmButtonText}>Reserve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setPlateModalVisible(false);
                    setPlateNumber('');
                    setSelectedSlot(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  rechargeButton: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  rechargeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  slot: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
  },
  slotText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  confirmButton: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
});

export default DashboardScreen;
