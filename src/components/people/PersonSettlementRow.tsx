export default function PersonSettlementRow({
  fromName,
  toName,
  dateLabel,
  amount,
  currency,
  note,
  groupName,
}: {
  fromName: string;
  toName: string;
  dateLabel: string;
  amount: number;
  currency: string;
  note: string | null;
  groupName: string;
}) {
  return (
    <div className="flex items-center justify-between px-2 py-3">
      <div>
        <div className="text-xs font-medium text-primary">{groupName}</div>
        <div className="font-medium text-text">
          {fromName} → {toName}
        </div>
        <div className="text-sm text-text-muted">
          {dateLabel}
          {note && ` · ${note}`}
        </div>
      </div>
      <div className="font-medium text-text">
        {amount.toFixed(2)} {currency}
      </div>
    </div>
  );
}
