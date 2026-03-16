/**
 * Device presets for screenshot testing.
 * Covers the most common desktop and mobile viewports.
 */
export const devices = [
  // Mobile
  { name: "iphone-se",       width:  375, height:  667, mobile: true },
  { name: "iphone-14",       width:  390, height:  844, mobile: true },
  { name: "iphone-14-pro-max", width: 430, height: 932, mobile: true },
  { name: "pixel-7",         width:  412, height:  915, mobile: true },

  // Tablet
  { name: "ipad-mini",       width:  768, height: 1024, mobile: true },
  { name: "ipad-pro-11",     width:  834, height: 1194, mobile: true },

  // Desktop
  { name: "laptop-13",       width: 1280, height:  800, mobile: false },
  { name: "desktop-1080p",   width: 1920, height: 1080, mobile: false },
  { name: "desktop-1440p",   width: 2560, height: 1440, mobile: false },
];
