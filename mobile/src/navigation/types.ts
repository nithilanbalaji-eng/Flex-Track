import type { NavigatorScreenParams } from "@react-navigation/native";

export type TabsParamList = {
  Home: undefined;
  Plans: undefined;
  Coach: undefined;
  Log: undefined;
  Food: undefined;
  Crews: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList>;
  PlanDetail: { planId: string };
  PlanBuilder: { planId?: string } | undefined;
  Settings: undefined;
  Premium: undefined;
  Privacy: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
  Privacy: undefined;
};

/** Lets useNavigation infer the right types without a generic at every call. */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
