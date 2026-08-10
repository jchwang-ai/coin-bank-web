'use client';

interface Transaction {
  type: string;
  amount: number;
  description: string;
  created_at: string;
  request_date?: string | null;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface HeartHistorySheetProps {
  childName: string;
  transactions: Transaction[];
  onClose: () => void;
}

function iconFor(tx: Transaction) {
  if (tx.type === 'buy') return '🛍️';
  if (tx.type === 'use') return '🎟️';
  if (tx.amount < 0) return '💔';
  return '💖';
}

export default function HeartHistorySheet({ childName, transactions, onClose }: HeartHistorySheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8 safe-bottom animate-sheet-up max-h-[80vh] flex flex-col">
        <div className="w-10 h-1.5 bg-black/10 rounded-full mx-auto mb-4 shrink-0" />
        <p className="text-[17px] font-bold text-[#1c1c1e] mb-1 shrink-0">💖 {childName}의 하트 내역</p>
        <p className="text-[13px] text-[#8e8e93] mb-4 shrink-0">언제, 어떻게 하트를 받고 썼는지 볼 수 있어요</p>

        <div className="overflow-y-auto -mx-5 px-5">
          {transactions.length === 0 ? (
            <p className="text-center text-[#8e8e93] py-10 text-[15px]">아직 기록이 없어요</p>
          ) : (
            <div className="rounded-2xl bg-black/[0.02] overflow-hidden">
              {transactions.map((tx, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 px-4 py-3.5 ${idx !== transactions.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
                >
                  <span className="text-xl shrink-0">{iconFor(tx)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[15px] text-[#1c1c1e] truncate">{tx.description || '하트 변경'}</p>
                    <p className="text-[12px] text-[#8e8e93]">
                      {tx.request_date ? (
                        <>
                          요청: {formatDateTime(tx.request_date)} · 승인: {formatDateTime(tx.created_at)}
                        </>
                      ) : (
                        formatDateTime(tx.created_at)
                      )}
                    </p>
                  </div>
                  <p
                    className={`font-bold text-[15px] shrink-0 ${
                      tx.amount > 0 ? 'text-green-600' : tx.amount < 0 ? 'text-red-500' : 'text-[#8e8e93]'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : ''}
                    {tx.amount} 💖
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 bg-black/5 text-[#8e8e93] font-semibold rounded-xl active:scale-[0.98] transition-all mt-4 shrink-0"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
