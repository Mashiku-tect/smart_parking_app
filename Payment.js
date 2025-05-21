import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker'; // Correct Picker
import { Buffer } from 'buffer'; // For decoding JWT
import { getAuthToken } from './services/azampayAuth'; // Your service

const getUserIdFromToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    const decoded = JSON.parse(jsonPayload);
    return decoded.id; 
  } catch (error) {
    console.error('Error extracting user ID:', error);
    return null;
  }
};

const CONFIG = {
  APP_NAME: 'smart_app',
  CLIENT_ID: '6dd06df7-a7b3-4c54-b47b-a131a52fb36f',
  CLIENT_SECRET: 'V9vTBa7Ui42jlQyuF/rfbGz+s5Rr8OG+yrmAnaJ2RNEDlmXtD/TB3vfsi63pdv2ye9XxdDP+8Vfv6kFEQxsheoV5WzEH7wgREZzqOY10JHFDdjqhvCRR0pW5Uyf8fVnW1gngcWEt38LK2XX3LqaW8cfdGnvrOcrWms+5n7XSTmMPsoZ3awkQfRzX723m0sPXWKWMusnhFDRPL1Eg539VZWD028ST0cZk4CzVXeJ1CZjcMxFBr6Grj5SNwi1rOYSwqOguF9DW39LrFrV5vMeemsT832NXH56fQWWo8i+Z8k7z7bPqWtu0idxJZek5QaAj6zEKydbak8J5oXc6NNgrfXZZFshP46Y1AGAR48jzuS6lt4CshCd5QpF0wwlwxGFU50JornwlZ1F3TkNw206BArjWyqyP62J1EVItTzpDXcLJy6JmIq+yxWiRo8IEPLU5FCSQFJ8xTEuNLr2ESCQ+bxS1nvvzDnTdBDYH4DGPCtvIQ2PCOj69bxv9M3WqPwApX1KB/8Z3lAN5A71F46UqlOeUkYrlmote8bzhCLa/k4qh3CUSzMgE8zYdkGz8fnmUpBnMqnlIcI1jQyUHRsEd87YMz8ccptyOoTWZ9cTp04AkHGL5Gf9AebWA9oXqura4bNIHmN364QsCa0Glp9EAfE7XbBGXrf+L5+Ht50IWCxE=',
  X_API_KEY: '9b70596d-cfa9-4e3f-bf3b-fce79a112ab6',
  AUTH_URL: 'https://authenticator-sandbox.azampay.co.tz/AppRegistration/GenerateToken',
  PAYMENT_URL: 'https://sandbox.azampay.co.tz/azampay/mno/checkout',
  CALLBACK_URL: 'https://your-callback-url.com/api/azampay/callback'
};

const Payment = ({ amount = '', phoneNumber = '', provider = 'Airtel' }) => {
  const [formData, setFormData] = useState({
    amount,
    phoneNumber,
    provider,
    orderId: `order-${Date.now()}`
  });
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePayment = async () => {
    setIsLoading(true);
    setPaymentStatus(null);

    try {
      const token = await getAuthToken(CONFIG.APP_NAME, CONFIG.CLIENT_ID, CONFIG.CLIENT_SECRET);
      const jwtToken = await AsyncStorage.getItem('token');
      const userId = getUserIdFromToken(jwtToken);

      const paymentData = {
        accountNumber: formData.phoneNumber,
        amount: formData.amount,
        currency: 'TZS',
        externalId: formData.orderId,
        provider: formData.provider,
        additionalProperties: {
          product: "Product Name",
          callbackUrl: CONFIG.CALLBACK_URL,
          userId: userId
        }
      };

      const response = await fetch(CONFIG.PAYMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-API-Key': CONFIG.X_API_KEY
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message || 'Payment failed');

      setPaymentStatus({ success: true, message: 'Payment initiated!', transactionId: result.transactionId });
      startStatusPolling(result.transactionId, formData.provider);

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus({ success: false, message: error.message || 'Payment error' });
    } finally {
      setIsLoading(false);
    }
  };

  const startStatusPolling = (transactionId, provider) => {
    const interval = setInterval(async () => {
      try {
        const token = await getAuthToken(CONFIG.APP_NAME, CONFIG.CLIENT_ID, CONFIG.CLIENT_SECRET);
        
        const url = `https://sandbox.azampay.co.tz/azampay/mno/transactionstatus?referenceId=${transactionId}&provider=${provider}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-API-Key': CONFIG.X_API_KEY
          }
        });

        const result = await response.json();

        if (result?.data?.status?.toLowerCase() === 'completed') {
          clearInterval(interval);
          setPollingInterval(null);
          setPaymentStatus({ success: true, message: 'Payment completed!' });
        } else if (result.success === false) {
          clearInterval(interval);
          setPollingInterval(null);
          setPaymentStatus({ success: false, message: result.message || 'Payment failed' });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);

    setPollingInterval(interval);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recharge Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Amount (TZS)"
        value={formData.amount}
        keyboardType="numeric"
        onChangeText={(value) => handleInputChange('amount', value)}
      />

      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={formData.phoneNumber}
        keyboardType="phone-pad"
        onChangeText={(value) => handleInputChange('phoneNumber', value)}
      />

      <Picker
        selectedValue={formData.provider}
        style={styles.input}
        onValueChange={(itemValue) => handleInputChange('provider', itemValue)}
      >
        <Picker.Item label="Airtel Money" value="Airtel" />
        <Picker.Item label="Tigo Pesa" value="Tigo" />
        <Picker.Item label="Halopesa" value="Halopesa" />
        <Picker.Item label="Azampesa" value="Azampesa" />
        <Picker.Item label="Mpesa" value="Mpesa" />
      </Picker>

      <Button
        title={isLoading ? 'Processing...' : 'Pay Now'}
        onPress={handlePayment}
        disabled={isLoading}
      />

      {isLoading && <ActivityIndicator size="large" color="#0000ff" />}

      {paymentStatus && (
        <View style={paymentStatus.success ? styles.success : styles.error}>
          <Text style={styles.statusText}>{paymentStatus.message}</Text>
          {paymentStatus.transactionId && (
            <Text style={styles.statusText}>Transaction ID: {paymentStatus.transactionId}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
    justifyContent: 'center'
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    borderRadius: 8
  },
  success: {
    backgroundColor: 'green',
    padding: 15,
    marginTop: 20,
    borderRadius: 8,
  },
  error: {
    backgroundColor: 'red',
    padding: 15,
    marginTop: 20,
    borderRadius: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center'
  }
});

export default Payment;
