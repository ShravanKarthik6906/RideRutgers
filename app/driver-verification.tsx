import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { applyForDriverVerification, uploadDriverDocument } from '../lib/api';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, spacing, fontSizes, radius } from '../constants/theme';

export default function DriverVerification() {
  const { session, refreshProfile } = useAuth();
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [licensePhotoUri, setLicensePhotoUri] = useState<string | null>(null);
  const [insurancePhotoUri, setInsurancePhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickPhoto = async (onPicked: (uri: string) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Enable photo library access to upload your documents.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      onPicked(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!session) return;
    if (!licenseNumber || !vehicleMake || !vehicleModel || !vehiclePlate) {
      setError('Please fill in every field.');
      return;
    }
    if (!licensePhotoUri || !insurancePhotoUri) {
      setError('Please upload a photo of your license and insurance card.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const [licensePhotoPath, insurancePhotoPath] = await Promise.all([
        uploadDriverDocument(session.user.id, licensePhotoUri, 'license.jpg'),
        uploadDriverDocument(session.user.id, insurancePhotoUri, 'insurance.jpg'),
      ]);
      await applyForDriverVerification({
        userId: session.user.id,
        licenseNumber: licenseNumber.trim(),
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        licensePhotoPath,
        insurancePhotoPath,
      });
      await refreshProfile();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Verified drivers must be current Rutgers students with a valid license and registered vehicle. Applications
        are reviewed manually before your account is approved to post rides.
      </Text>

      <Field label="Driver's license number" value={licenseNumber} onChangeText={setLicenseNumber} />
      <Field label="Vehicle make" placeholder="Honda" value={vehicleMake} onChangeText={setVehicleMake} />
      <Field label="Vehicle model" placeholder="Civic" value={vehicleModel} onChangeText={setVehicleModel} />
      <Field
        label="License plate"
        placeholder="ABC1234"
        value={vehiclePlate}
        onChangeText={setVehiclePlate}
        autoCapitalize="characters"
      />

      <PhotoField
        label="Driver's license photo"
        uri={licensePhotoUri}
        onPress={() => pickPhoto(setLicensePhotoUri)}
      />
      <PhotoField
        label="Insurance card photo"
        uri={insurancePhotoUri}
        onPress={() => pickPhoto(setInsurancePhotoUri)}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton title="Submit application" onPress={handleSubmit} loading={loading} style={styles.button} />
    </ScrollView>
  );
}

function PhotoField({ label, uri, onPress }: { label: string; uri: string | null; onPress: () => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.photoPicker} onPress={onPress}>
        {uri ? (
          <Image source={{ uri }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera" size={22} color={colors.gray600} />
            <Text style={styles.photoPlaceholderText}>Tap to upload a photo</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        placeholder={props.placeholder}
        placeholderTextColor={colors.gray400}
        value={props.value}
        onChangeText={props.onChangeText}
        autoCapitalize={props.autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing.lg,
  },
  intro: {
    fontSize: fontSizes.sm,
    color: colors.gray600,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  error: {
    color: colors.danger,
    fontSize: fontSizes.xs,
    marginBottom: spacing.sm,
  },
  photoPicker: {
    height: 140,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray50,
  },
  photoPlaceholderText: {
    fontSize: fontSizes.xs,
    color: colors.gray600,
    marginTop: spacing.xs,
  },
  button: {
    marginTop: spacing.sm,
  },
});
