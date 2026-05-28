import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/home/HomeScreen";
import FamilyScreen from "../screens/family/FamilyScreen";
import EducationScreen from "../screens/education/EducationScreen";
import AlertsScreen from "../screens/alerts/AlertsScreen";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Familia" component={FamilyScreen} />
      <Tab.Screen name="Educacion" component={EducationScreen} />
      <Tab.Screen name="Alertas" component={AlertsScreen} />
    </Tab.Navigator>
  );
}