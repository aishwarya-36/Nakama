export interface Member {
  id: string;
  displayName: string;
}

export interface Debt {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: number;
  currency: string;
}
