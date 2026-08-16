import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useFarben } from '@/lib/theme';

/**
 * Die Symbole sind gezeichnet statt Emoji: drei Striche für das Gespräch, ein
 * Haken für Aufgaben, ein Raster für den Kalender. Emoji sehen auf jedem Gerät
 * anders aus, ignorieren die Farbe und passen zu keiner Gestaltung.
 */
function Symbolflaeche({ aktiv, kind }: { aktiv: boolean; kind: 'chat' | 'aufgaben' | 'kalender' }) {
  const f = useFarben();
  const ton = aktiv ? f.weg : f.schwach;

  if (kind === 'chat') {
    return (
      <View style={stil.feld}>
        <View style={[stil.strich, { backgroundColor: ton, width: 20 }]} />
        <View style={[stil.strich, { backgroundColor: ton, width: 14 }]} />
        <View style={[stil.strich, { backgroundColor: ton, width: 17 }]} />
      </View>
    );
  }
  if (kind === 'aufgaben') {
    return (
      <View style={stil.feld}>
        <View style={[stil.kasten, { borderColor: ton }]}>
          {aktiv && <View style={[stil.kastenFuellung, { backgroundColor: ton }]} />}
        </View>
      </View>
    );
  }
  return (
    <View style={stil.feld}>
      <View style={[stil.raster, { borderColor: ton }]}>
        <View style={[stil.rasterLinie, { backgroundColor: ton }]} />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const f = useFarben();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: f.weg,
        tabBarInactiveTintColor: f.schwach,
        tabBarStyle: { backgroundColor: f.flaeche, borderTopColor: f.linie, height: 88, paddingTop: 8 },
        tabBarLabelStyle: {
          fontFamily: 'BarlowSemiCondensed_600SemiBold',
          fontSize: 12,
          letterSpacing: 0.4,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Gespräch', tabBarIcon: ({ focused }) => <Symbolflaeche aktiv={focused} kind="chat" /> }}
      />
      <Tabs.Screen
        name="todos"
        options={{ title: 'Aufgaben', tabBarIcon: ({ focused }) => <Symbolflaeche aktiv={focused} kind="aufgaben" /> }}
      />
      <Tabs.Screen
        name="kalender"
        options={{ title: 'Kalender', tabBarIcon: ({ focused }) => <Symbolflaeche aktiv={focused} kind="kalender" /> }}
      />
    </Tabs>
  );
}

const stil = StyleSheet.create({
  feld: { width: 22, height: 20, alignItems: 'center', justifyContent: 'center', gap: 3 },
  strich: { height: 2, borderRadius: 1 },
  kasten: { width: 18, height: 18, borderWidth: 2, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  kastenFuellung: { width: 8, height: 8, borderRadius: 1 },
  raster: { width: 18, height: 18, borderWidth: 2, borderRadius: 3, justifyContent: 'flex-start' },
  rasterLinie: { height: 2, width: '100%', marginTop: 2 },
});
