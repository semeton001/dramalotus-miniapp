export type GamSlotConfig = {
  slotName: "player_gate_portrait";
  adUnitPath: string;
  sizes: Array<[number, number]>;
  divId: string;
};

export const PLAYER_GATE_PORTRAIT_SLOT: GamSlotConfig = {
  slotName: "player_gate_portrait",
  adUnitPath: "/1234567/dramalotus/player_gate_portrait",
  sizes: [[300, 250]],
  divId: "gam-player-gate-portrait-slot",
};