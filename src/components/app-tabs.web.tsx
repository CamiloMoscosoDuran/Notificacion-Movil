import {
  TabList,
  Tabs,
  TabSlot,
  TabTrigger,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ExternalLink } from './external-link';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.tabSlot} />
      <TabList style={styles.navBar}>
        <Text style={styles.brandText}>AgroTecno</Text>
        <TabTrigger name="index" href="/" asChild>
          <TabButton>Insumos</TabButton>
        </TabTrigger>
        <TabTrigger name="formula" href="/formula" asChild>
          <TabButton>Fórmulas</TabButton>
        </TabTrigger>
        <TabTrigger name="cliente" href="/cliente" asChild>
          <TabButton>Clientes</TabButton>
        </TabTrigger>
        <TabTrigger name="explore" href="/explore" asChild>
          <TabButton>Explore</TabButton>
        </TabTrigger>
        <ExternalLink href="https://docs.expo.dev" asChild>
          <Pressable style={styles.externalPressable}>
            <Text style={styles.docsText}>Docs</Text>
            <SymbolView tintColor="#475569" name={{ ios: 'arrow.up.right.square', web: 'link' }} size={12} />
          </Pressable>
        </ExternalLink>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: any) {
  return (
    <Pressable
      {...props}
      style={({ pressed }: { pressed: boolean }) => [
        styles.pressable,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.tabButtonView, isFocused && styles.tabButtonSelected]}>
        <Text style={[styles.tabText, isFocused && styles.tabTextSelected]}>{children}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabSlot: {
    height: '100%',
    paddingTop: 64,
  },
  navBar: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    marginHorizontal: 'auto',
    width: '92%',
    maxWidth: MaxContentWidth,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  brandText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 'auto',
  },
  pressable: {
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    backgroundColor: '#F8FAFC',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  tabButtonSelected: {
    backgroundColor: '#CCFBF1',
  },
  tabText: {
    color: '#64748B',
    fontSize: 12,
  },
  tabTextSelected: {
    color: '#0F766E',
    fontWeight: '800',
  },
  docsText: {
    color: '#475569',
    fontSize: 12,
  },
  externalPressable: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginLeft: Spacing.three,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
});
