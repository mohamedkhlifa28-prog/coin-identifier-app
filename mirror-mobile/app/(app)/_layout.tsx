import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../src/lib/constants';

type TabIconProps = {
  focused: boolean;
  symbol: string;
  label: string;
};

function TabIcon({ focused, symbol, label }: TabIconProps) {
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabSymbol, focused && styles.tabSymbolFocused]}>
        {symbol}
      </Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {label}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
          borderBottomColor: Colors.border,
          borderBottomWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          color: Colors.text,
          fontSize: 18,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 80 : 64,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.muted,
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Mirror',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} symbol="◈" label="Chat" />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Memory Vault',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} symbol="◉" label="Vault" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} symbol="⊙" label="Settings" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabSymbol: {
    fontSize: 22,
    color: Colors.muted,
    lineHeight: 26,
  },
  tabSymbolFocused: {
    color: Colors.accent,
  },
  tabLabel: {
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 0.3,
  },
  tabLabelFocused: {
    color: Colors.accent,
  },
});
