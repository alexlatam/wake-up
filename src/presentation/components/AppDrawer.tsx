import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '~/components/ui/text';

// ── Context ──────────────────────────────────────────────────────────────────

interface DrawerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const DrawerContext = createContext<DrawerContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
});

export function useDrawer() {
  return useContext(DrawerContext);
}

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  return (
    <DrawerContext.Provider value={{ isOpen, open, close }}>
      {children}
    </DrawerContext.Provider>
  );
}

// ── Drawer Menu ───────────────────────────────────────────────────────────────

const DRAWER_WIDTH = 280;

interface MenuItem {
  icon: string;
  label: string;
  onPress: () => void;
}

export function DrawerMenu() {
  const { isOpen, close } = useDrawer();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: isOpen ? 0 : -DRAWER_WIDTH,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: isOpen ? 0.55 : 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen, translateX, backdropOpacity]);

  const handleShare = useCallback(async () => {
    close();
    await Share.share({
      title: 'WakeUpBuddy',
      message: 'Check out WakeUpBuddy — the alarm app that actually wakes you up!',
    });
  }, [close]);

  const handleFeedback = useCallback(() => {
    close();
    Linking.openURL('mailto:alexisamm9261@gmail.com?subject=WakeUpBuddy+Feedback');
  }, [close]);

  const menuItems: MenuItem[] = [
    { icon: 'ℹ️', label: 'About', onPress: close },
    { icon: '❓', label: 'Help', onPress: close },
    { icon: '📤', label: 'Share', onPress: handleShare },
    { icon: '⭐', label: 'Send Feedback / Rate', onPress: handleFeedback },
  ];

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={isOpen ? 'auto' : 'none'}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View
        style={[styles.drawer, { transform: [{ translateX }], paddingTop: insets.top }]}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>WakeUpBuddy</Text>
        </View>

        <View style={styles.drawerBody}>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={item.onPress}
            >
              <Text style={styles.menuItemIcon}>{item.icon}</Text>
              <Text style={styles.menuItemLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#0f1f11',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerHeader: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2d5230',
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e8f5e8',
  },
  drawerBody: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemPressed: {
    backgroundColor: '#1e3a21',
  },
  menuItemIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  menuItemLabel: {
    fontSize: 16,
    color: '#e8f5e8',
  },
});
