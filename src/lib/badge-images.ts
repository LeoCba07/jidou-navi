// Map badge slugs to local assets
// This is necessary because React Native require() doesn't support dynamic strings

export const BADGE_IMAGES: Record<string, any> = {
  explorer_1: require('../../assets/badges/explorer_1.png'),
  explorer_5: require('../../assets/badges/explorer_5.png'),
  explorer_10: require('../../assets/badges/explorer_10.png'),
  explorer_25: require('../../assets/badges/explorer_25.png'),
  explorer_50: require('../../assets/badges/explorer_50.png'),
  explorer_100: require('../../assets/badges/explorer_100.png'),
  explorer_200: require('../../assets/badges/explorer_200.png'),
  
  pioneer_1: require('../../assets/badges/pioneer_1.png'),
  pioneer_5: require('../../assets/badges/pioneer_5.png'),
  pioneer_10: require('../../assets/badges/pioneer_10.png'),
  pioneer_25: require('../../assets/badges/pioneer_25.png'),
  pioneer_50: require('../../assets/badges/pioneer_50.png'),
  
  spec_eats_5: require('../../assets/badges/spec_eats_5.png'),
  spec_eats_20: require('../../assets/badges/spec_eats_20.png'),
  spec_gacha_5: require('../../assets/badges/spec_gacha_5.png'),
  spec_gacha_20: require('../../assets/badges/spec_gacha_20.png'),
  spec_weird_5: require('../../assets/badges/spec_weird_5.png'),
  spec_weird_15: require('../../assets/badges/spec_weird_15.png'),
  spec_retro_5: require('../../assets/badges/spec_retro_5.png'),
  spec_retro_15: require('../../assets/badges/spec_retro_15.png'),
  spec_gems_5: require('../../assets/badges/spec_gems_5.png'),
  spec_gems_15: require('../../assets/badges/spec_gems_15.png'),
  
  guard_5: require('../../assets/badges/guard_5.png'),
  guard_10: require('../../assets/badges/guard_10.png'),
  guard_25: require('../../assets/badges/guard_25.png'),
  guard_50: require('../../assets/badges/guard_50.png'),
  guard_100: require('../../assets/badges/guard_100.png'),
  guard_150: require('../../assets/badges/guard_150.png'),
  guard_250: require('../../assets/badges/guard_250.png'),
  
  team_hunt: require('../../assets/badges/team_hunt.png'),
  epic_master: require('../../assets/badges/epic_master.png'),
};

export function getBadgeImage(slug: string): any {
  return BADGE_IMAGES[slug] || null;
}
