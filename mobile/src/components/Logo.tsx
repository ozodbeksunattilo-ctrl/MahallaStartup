import { Image } from 'expo-image';
import { View } from 'react-native';

/** Mahalladosh logotipi. `full` — yozuvli (ko'k) variant, aks holda faqat belgi. `tint` — butun logotipni bir rangga bo'yaydi (masalan, qora fonda oq). */
export function Logo({ size = 72, full = false, tint }: { size?: number; full?: boolean; tint?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Image
        source={full ? require('../../assets/logo-full.png') : require('../../assets/logo-mark.png')}
        style={full ? { width: size * 1.46, height: size } : { width: size, height: size }}
        contentFit="contain"
        tintColor={tint}
        accessibilityLabel="Mahalladosh"
      />
    </View>
  );
}
