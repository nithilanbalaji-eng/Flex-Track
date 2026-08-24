import React from "react";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import { colors } from "../theme";

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Shared wrapper so every icon has identical stroke behaviour. */
function Icon({
  size = 22,
  color = colors.slate[400],
  strokeWidth = 2,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export const IconDashboard = (p: IconProps) => (
  <Icon {...p}>
    <Rect x="3" y="3" width="7" height="9" rx="1.5" />
    <Rect x="14" y="3" width="7" height="5" rx="1.5" />
    <Rect x="14" y="12" width="7" height="9" rx="1.5" />
    <Rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Icon>
);

export const IconDumbbell = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />
  </Icon>
);

export const IconSparkles = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    <Path d="M19 15l.7 2.1L22 18l-2.3.9L19 21l-.7-2.1L16 18l2.3-.9L19 15z" />
  </Icon>
);

export const IconCalendarCheck = (p: IconProps) => (
  <Icon {...p}>
    <Rect x="3" y="4" width="18" height="17" rx="2" />
    <Path d="M16 2v4M8 2v4M3 10h18M9 15l2 2 4-4" />
  </Icon>
);

export const IconUtensils = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M3 2v7a2 2 0 0 0 2 2h1v11M6 2v6M9 2v6M15 2c-1.5 1.5-2 3-2 5.5S14 12 15 12v10M15 2v20" />
  </Icon>
);

export const IconUsers = (p: IconProps) => (
  <Icon {...p}>
    <Circle cx="9" cy="8" r="3.5" />
    <Path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <Circle cx="17.5" cy="9" r="3" />
    <Path d="M15.5 13.5c3 .3 5 2.5 5 6.5" />
  </Icon>
);

export const IconFlame = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 2c1.5 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.4-2-1-3 2 1 3.5 3.5 3.5 6a6.5 6.5 0 1 1-13 0c0-4 2-6 4.5-10z" />
  </Icon>
);

export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <Circle cx="12" cy="12" r="3" />
    <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
  </Icon>
);

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M9 6l6 6-6 6" />
  </Icon>
);

export const IconLogout = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </Icon>
);

export const IconApple = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M17.5 12.5c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.4 2.9 2.3 1.1 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.8-2.3.7-1 1-1.9 1.5-2.9-1.6-.6-2.1-2.4-2.1-3.2z" />
    <Path d="M15 3.5c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-1 1.5-.8 2.4.9.1 1.8-.5 2.3-1.1z" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M20 6L9 17l-5-5" />
  </Icon>
);
