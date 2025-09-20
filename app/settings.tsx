import { SettingsScreen } from '@/screens/SettingsScreen';
import { useRouter } from 'expo-router';

export default function SettingsRoute() {
  const router = useRouter();

  const navigation = {
    goBack: () => router.back(),
  };

  return <SettingsScreen navigation={navigation} />;
}