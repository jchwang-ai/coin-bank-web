'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { getChildData, buyCoupon, useCoupon } from './actions';

interface Tab {
  id: string;
  label: string;
}

const TABS: Tab[] = [
  { id: 'shop', label: '🛍️ 상점' },
  { id: 'coupons', label: '🎟️ 내 쿠폰' },
  { id: 'history', label: '📜 기록' },
];

interface ShopItem {
  id: string;
  emoji: string;
  name: string;
  price: number;
}

interface Coupon {
  id: string;
  emoji: string;
  name: string;
  used: boolean;
  purchased_at: string;
}

interface Transaction {
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

export default function ChildPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('shop');
  const [balance, setBalance] = useState<number>(0);
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [toast, setToast] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getChildData();
        if (data.child) setBalance((data.child as any).balance);
        if (data.shops) setShops(data.shops as ShopItem[]);
        if (data.coupons) setCoupons(data.coupons as Coupon[]);
        if (data.transactions) setTransactions(data.transactions as Transaction[]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleBuyCoupon = async (item: ShopItem) => {
    if (balance < item.price) {
      setToast('코인이 부족해요');
      return;
    }

    if (!window.confirm(`"${item.name}" 쿠폰을 ${item.price}코인으로 살까요?`)) {
      return;
    }

    try {
      setIsLoading(true);
      await buyCoupon(item.id);
      setBalance(balance - item.price);

      // Add new coupon
      const newCoupon: Coupon = {
        id: Math.random().toString(),
        emoji: item.emoji,
        name: item.name,
        used: false,
        purchased_at: new Date().toISOString(),
      };
      setCoupons([newCoupon, ...coupons]);
      setToast('쿠폰을 샀어요! 🎉');

      // Reload all data
      const data = await getChildData();
      if (data.child) setBalance((data.child as any).balance);
    } catch (error) {
      setToast('오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseCoupon = async (couponId: string, couponName: string) => {
    if (!window.confirm(`"${couponName}" 쿠폰을 지금 사용할까요?\n부모님께 보여주세요!`)) {
      return;
    }

    try {
      setIsLoading(true);
      await useCoupon(couponId);

      // Mark coupon as used
      setCoupons(
        coupons.map((c) =>
          c.id === couponId ? { ...c, used: true } : c
        )
      );
      setToast('쿠폰 사용! 즐거운 시간 보내 ✨');

      // Reload data
      const data = await getChildData();
      if (data.coupons) setCoupons(data.coupons as Coupon[]);
    } catch (error) {
      setToast('오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    router.push('/');
  };

  if (isLoading && balance === 0) {
    return <div className="text-center">로딩 중...</div>;
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-pink-700">🧒 내 코인 지갑</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-300"
        >
          나가기
        </button>
      </div>

      {/* Balance */}
      <div className="bg-yellow-100 rounded-2xl p-6 mb-6 text-center">
        <p className="text-yellow-800 font-bold text-sm">내가 모은 코인</p>
        <p className="text-5xl font-bold text-yellow-600 mt-2">
          {balance} <span className="text-3xl">🪙</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Shop Tab */}
      {activeTab === 'shop' && (
        <div className="space-y-3">
          {shops.length === 0 ? (
            <p className="text-center text-gray-500 py-6">상점이 비어있어요</p>
          ) : (
            shops.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-pink-50 p-4 rounded-2xl border-2 border-pink-200"
              >
                <span className="text-3xl">{item.emoji}</span>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{item.name}</p>
                  <p className="text-sm font-bold text-yellow-600">{item.price} 🪙</p>
                </div>
                <button
                  onClick={() => handleBuyCoupon(item)}
                  disabled={isLoading || balance < item.price}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    balance >= item.price
                      ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  사기
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Coupons Tab */}
      {activeTab === 'coupons' && (
        <div className="space-y-3">
          {coupons.length === 0 ? (
            <p className="text-center text-gray-500 py-6">아직 쿠폰이 없어요</p>
          ) : (
            coupons.map((coupon) => (
              <div
                key={coupon.id}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed ${
                  coupon.used
                    ? 'bg-gray-100 border-gray-300 opacity-50'
                    : 'bg-purple-50 border-purple-300'
                }`}
              >
                <span className="text-2xl">{coupon.emoji}</span>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{coupon.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(coupon.purchased_at).toLocaleDateString()}
                  </p>
                </div>
                {coupon.used ? (
                  <p className="font-bold text-gray-600 text-sm">사용 완료 ✔</p>
                ) : (
                  <button
                    onClick={() => handleUseCoupon(coupon.id, coupon.name)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50"
                  >
                    사용하기
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-6">아직 기록이 없어요</p>
          ) : (
            transactions.map((tx, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center py-3 border-b border-gray-200"
              >
                <div>
                  <p className="font-bold text-gray-800">{tx.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p
                  className={`font-bold ${
                    tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {tx.amount > 0 ? '+' : ''}{tx.amount} 🪙
                </p>
              </div>
            ))
          )}
        </div>
      )}

      <Toast message={toast} visible={!!toast} onClose={() => setToast('')} />
    </div>
  );
}
