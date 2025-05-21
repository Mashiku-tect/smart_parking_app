

const AZAMPAY_AUTH_URL = "https://authenticator-sandbox.azampay.co.tz/AppRegistration/GenerateToken";

export const getAuthToken = async (appName, clientId, clientSecret) => {
  try {
    const response = await fetch(AZAMPAY_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appName,
        clientId,
        clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    return data.data.accessToken;
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw error;
  }
};
