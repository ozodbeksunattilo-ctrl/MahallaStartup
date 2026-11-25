import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Linking, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { useTheme } from '@/theme';
import type { Media } from '@/lib/types';

/** Post/tadbir mediasi. Havolalar 5 daqiqa amal qiladi, shuning uchun keshlanmaydi (har so'rovda yangi keladi). */
export function MediaGrid({ media }: { media: Media[] }) {
  const { colors, radius } = useTheme();
  const [openAt, setOpenAt] = useState<number | null>(null);
  if (media.length === 0) return null;

  const open = (i: number) => {
    const m = media[i];
    // Video ilova ichida emas, tizim pleyerida ochiladi
    if (m?.kind === 'VIDEO') void Linking.openURL(m.url);
    else setOpenAt(i);
  };

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {media.map((m, i) => (
          <PressableScale
            key={m.id}
            accessibilityRole="imagebutton"
            accessibilityLabel={m.kind === 'VIDEO' ? 'Videoni ochish' : 'Rasmni ochish'}
            onPress={() => open(i)}
            scaleTo={0.97}
            style={{
              width: media.length === 1 ? '100%' : '48.5%',
              aspectRatio: media.length === 1 ? 4 / 3 : 1,
              borderRadius: radius.md,
              overflow: 'hidden',
              backgroundColor: colors.surfaceAlt,
            }}
          >
            <Image
              source={{ uri: m.kind === 'VIDEO' ? (m.thumbUrl ?? undefined) : (m.thumbUrl ?? m.url) }}
              style={{ flex: 1 }}
              contentFit="cover"
              transition={200}
            />
            {m.kind === 'VIDEO' ? (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
                ]}
              >
                <Ionicons name="play-circle" size={52} color="#fff" />
              </View>
            ) : null}
          </PressableScale>
        ))}
      </View>
      {openAt !== null ? <Viewer media={media.filter((m) => m.kind === 'IMAGE')} start={media.slice(0, openAt).filter((m) => m.kind === 'IMAGE').length} onClose={() => setOpenAt(null)} /> : null}
    </>
  );
}

/** To'liq ekranli rasm ko'ruvchi: chapga-o'ngga surib almashtiriladi. */
function Viewer({ media, start, onClose }: { media: Media[]; start: number; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(start);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1, backgroundColor: '#000' }}>
        <FlatList
          data={media}
          horizontal
          pagingEnabled
          initialScrollIndex={start}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(m) => m.id}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <Pressable onPress={onClose} style={{ width, height, justifyContent: 'center' }}>
              <Image source={{ uri: item.url }} placeholder={{ uri: item.thumbUrl ?? undefined }} style={{ width, height: height * 0.8 }} contentFit="contain" transition={200} />
            </Pressable>
          )}
        />
        <View
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: 16,
            right: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }} raw>
            {media.length > 1 ? `${index + 1} / ${media.length}` : ''}
          </Text>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Yopish"
            onPress={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </PressableScale>
        </View>
      </Animated.View>
    </Modal>
  );
}
