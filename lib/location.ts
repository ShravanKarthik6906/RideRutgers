import { Share } from 'react-native';
import * as Location from 'expo-location';

export async function shareCurrentLocation(labelPrefix = 'My current location'): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required to share your location.');
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = position.coords;
  const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
  await Share.share({
    message: `${labelPrefix}: ${mapsUrl}`,
  });
}
