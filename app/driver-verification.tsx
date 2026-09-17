import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { applyForDriverVerification } from '../lib/api';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, spacing, fontSizes, radius } from '../constants/theme';

export default function DriverVerification() {
  const { session, refreshProfile } = useAuth();
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!session) return;
    if (!licenseNumber || !vehicleMake || !vehicleModel || !vehiclePlate) {
      setError('Please fill in every field.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await applyForDriverVerification({
        userId: session.user.id,
        licenseNumber: licenseNumber.trim(),
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton title="Submit application" onPress={handleSubmit} loading={loading} style={styles.button} />
    </ScrollView>
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
  button: {
    marginTop: spacing.sm,
  },
});
