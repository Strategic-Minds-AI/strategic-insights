// Platform definitions for Strategic Analytics
// Each platform the skip-trace can search. Connected ones are live; others are connectable.

export const PLATFORMS = [
  { id: "google_analytics", name: "Google Analytics", category: "Web Analytics", icon: "BarChart3", color: "#e8710a", connected: true, description: "Traffic, audience, conversions" },
  { id: "google_search_console", name: "Search Console", category: "SEO", icon: "Search", color: "#4285f4", connected: true, description: "Search queries, indexing, rankings" },
  { id: "google_ads", name: "Google Ads", category: "Advertising", icon: "Target", color: "#34a853", connected: false, description: "Search & display ad performance" },
  { id: "meta_ads", name: "Meta Ads", category: "Advertising", icon: "Facebook", color: "#1877f2", connected: false, description: "Facebook & Instagram ad ROI" },
  { id: "google_analytics_4", name: "GA4 Events", category: "Tracking", icon: "Zap", color: "#f9ab00", connected: false, description: "Custom event & conversion tracking" },
  { id: "hubspot", name: "HubSpot", category: "CRM", icon: "Users", color: "#ff7a59", connected: false, description: "Pipeline, leads, lifecycle stages" },
  { id: "linkedin", name: "LinkedIn", category: "Social", icon: "Linkedin", color: "#0a66c2", connected: false, description: "Audience & campaign analytics" },
  { id: "tiktok", name: "TikTok", category: "Social", icon: "Music2", color: "#ff0050", connected: false, description: "Video performance & reach" },
  { id: "ai_web_search", name: "AI Market Intel", category: "Trends", icon: "Brain", color: "#7c3aed", connected: true, description: "Live market, economic & industry trends" },
];

export const CONNECTED_PLATFORMS = PLATFORMS.filter(p => p.connected);
export const AVAILABLE_PLATFORMS = PLATFORMS.filter(p => !p.connected);