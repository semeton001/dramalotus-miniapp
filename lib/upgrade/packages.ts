export type VipPackageKey = '1d' | '3d' | '7d' | '15d' | '30d' | '90d';

export type VipPackage = {
  key: VipPackageKey;
  title: string;
  days: number;
  priceLabel: string;
  amount: number;
};

export const VIP_PACKAGES: VipPackage[] = [
  { key: '1d', title: 'VIP 1 Hari', days: 1, priceLabel: 'Rp 5.000', amount: 5000 },
  { key: '3d', title: 'VIP 3 Hari', days: 3, priceLabel: 'Rp 12.000', amount: 12000 },
  { key: '7d', title: 'VIP 7 Hari', days: 7, priceLabel: 'Rp 25.000', amount: 25000 },
  { key: '15d', title: 'VIP 15 Hari', days: 15, priceLabel: 'Rp 45.000', amount: 45000 },
  { key: '30d', title: 'VIP 30 Hari', days: 30, priceLabel: 'Rp 79.000', amount: 79000 },
  { key: '90d', title: 'VIP 90 Hari', days: 90, priceLabel: 'Rp 199.000', amount: 199000 },
];

export const VIP_PACKAGE_MAP = new Map<VipPackageKey, VipPackage>(
  VIP_PACKAGES.map((item) => [item.key, item]),
);
