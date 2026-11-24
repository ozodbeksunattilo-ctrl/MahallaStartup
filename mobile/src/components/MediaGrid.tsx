import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import type { Media } from '@/lib/types';

/** Post/tadbir mediasi. Havolalar 5 daqiqa amal qiladi, shuning uchun keshlanmaydi (har so'rovda yangi keladi). */
export function MediaGrid({ media }: { media: Media[] }) {
  const { colors, radius } = useTheme();
  if (media.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {media.map((m) => (
        <Pressable
          key={m.id}
          accessibilityRole="imagebutton"
          accessibilityLabel={m.kind === 'VIDEO' ? 'Videoni ochish' : 'Rasmni ochish'}
          onPress={() => void Linking.openURL(m.url)}
          style={{
            width: media.length === 1 ? '100%' : '48.5%',
            aspectRatio: media.length === 1 ? 4 / 3 : 1,
            borderRadius: radius.md,
            overflow: 'hidden',
            backgroundColor: colors.surfaceAlt,
          }}
        >
          <Image
            source={{ uri: m.kind === 'VIDEO' ? (m.thumbUrl ?? undefined) : m.url }}
            style={{ flex: 1 }}
            contentFit="cover"
            transition={150}
          />
          {m.kind === 'VIDEO' ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
              ]}
            >
              <Ionicons name="play-circle" size={48} color="#fff" />
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
