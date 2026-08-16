import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { farben } from '@/lib/theme';

// Symbole vorerst als Emoji. Sobald die visuelle Richtung steht, kommen hier
// echte Icons rein (SF Symbols über expo-symbols auf iOS).
function TabZeichen({ zeichen, aktiv }: { zeichen: string; aktiv: boolean }) {
  return <Text style={{ fontSize: 20, opacity: aktiv ? 1 : 0.45 }}>{zeichen}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: farben.akzent,
        tabBarInactiveTintColor: farben.gedaempft,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => <TabZeichen zeichen="💬" aktiv={focused} />,
        }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          title: 'Aufgaben',
          tabBarIcon: ({ focused }) => <TabZeichen zeichen="📝" aktiv={focused} />,
        }}
      />
      <Tabs.Screen
        name="kalender"
        options={{
          title: 'Kalender',
          tabBarIcon: ({ focused }) => <TabZeichen zeichen="📅" aktiv={focused} />,
        }}
      />
    </Tabs>
  );
}
