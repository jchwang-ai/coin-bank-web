'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import TabBar from '@/components/TabBar';
import AvatarUpload from '@/components/AvatarUpload';
import { getChildData, buyCoupon, useCoupon, updateChildPhoto } from './actions';

const TABS = [
  { id: 'shop', label: '상점', icon: '🛍️' },
  { id: 'coupons', label: '내 쿠폰', icon: '🎟️' },
  { id: 'history', label: '기록', icon: '📜' },
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
  const [childName, setChildName] = useState<string>('나');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [toast, setToast] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getChildData();
        if (data.child) {
          setBalance((data.child as any).balance);
          setChildName((data.child as any).name || '나');
          setPhotoUrl((data.child as any).photo_data || null);
        }
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
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePhotoUpload = async (dataUrl: string) => {
    try {
      await updateChildPhoto(dataUrl);
      setPhotoUrl(dataUrl);
      setToast('사진을 바꿨어요! 📷');
    } catch (error) {
      setToast('사진 저장에 실패했어요');
      console.error(error);
    }
  };

  const handleBuyCoupon = async (item: ShopItem) => {
    if (balance < item.price) {
      setToast('하트가 부족해요');
      return;
    }
    if (!window.confirm(`"${item.name}" 쿠폰을 ${item.price}하트로 살까요?`)) return;

    try {
      setIsLoading(true);
      await buyCoupon(item.id);
      setBalance(balance - item.price);
      setCoupons([
        {
          id: Math.random().toString(),
          emoji: item.emoji,
          name: item.name,
          used: false,
          purchased_at: new Date().toISOString(),
        },
        ...coupons,
      ]);
      setToast('쿠폰을 샀어요! 🎉');

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
    if (!window.confirm(`"${couponName}" 쿠폰을 지금 사용할까요?\n부모님께 보여주세요!`)) return;

    try {
      setIsLoading(true);
      await useCoupon(couponId);
      setCoupons(coupons.map((c) => (c.id === couponId ? { ...c, used: true } : c)));
      setToast('쿠폰 사용! 즐거운 시간 보내 ✨');

      const data = await getChildData();
      if (data.coupons) setCoupons(data.coupons as Coupon[]);
    } catch (error) {
      setToast('오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => router.push('/');

  if (isLoading && balance === 0 && shops.length === 0) {
    return <div className="text-center pt-24 text-[#8e8e93]">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 safe-top">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <AvatarUpload
              photoUrl={photoUrl}
              editable
              size={56}
              onUpload={handlePhotoUpload}
              fallbackEmoji="👧"
            />
            <div>
              <p className="text-[13px] text-[#8e8e93]">안녕하세요</p>
              <p className="text-[19px] font-bold text-[#1c1c1e]">{childName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-[13px] font-medium text-[#8e8e93] px-3 py-1.5 rounded-full bg-black/5 active:bg-black/10 transition-colors"
          >
            나가기
          </button>
        </div>

        {/* Balance Hero Card */}
        <div className="rounded-3xl p-6 bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500 shadow-lg shadow-pink-500/25 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-8xl opacity-20">💖</div>
          <p className="text-white/80 text-[13px] font-medium relative">내가 모은 하트</p>
          <p className="text-white text-[44px] font-bold leading-tight mt-1 relative">
            {balance}
            <span className="text-2xl ml-2">💖</span>
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-5">
        {activeTab === 'shop' && (
          <div className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
            {shops.length === 0 ? (
              <p className="text-center text-[#8e8e93] py-10 text-[15px]">상점이 비어있어요</p>
            ) : (
              shops.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${idx !== shops.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
                >
                  <div className="w-11 h-11 rounded-full bg-pink-50 flex items-center justify-center text-xl shrink-0">
                    {item.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[15px] text-[#1c1c1e] truncate">{item.name}</p>
                    <p className="text-[13px] font-semibold text-pink-500">{item.price} 💖</p>
                  </div>
                  <button
                    onClick={() => handleBuyCoupon(item)}
                    disabled={isLoading || balance < item.price}
                    className={`px-4 py-2 rounded-full font-semibold text-[13px] shrink-0 transition-all active:scale-95 ${
                      balance >= item.price
                        ? 'bg-[#1c1c1e] text-white'
                        : 'bg-black/5 text-[#c7c7cc]'
                    }`}
                  >
                    사기
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
            {coupons.length === 0 ? (
              <p className="text-center text-[#8e8e93] py-10 text-[15px]">아직 쿠폰이 없어요</p>
            ) : (
              coupons.map((coupon, idx) => (
                <div
                  key={coupon.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${idx !== coupons.length - 1 ? 'border-b border-black/[0.06]' : ''} ${coupon.used ? 'opacity-40' : ''}`}
                >
                  <div className="w-11 h-11 rounded-full bg-purple-50 flex items-center justify-center text-xl shrink-0">
                    {coupon.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[15px] text-[#1c1c1e] truncate">{coupon.name}</p>
                    <p className="text-[12px] text-[#8e8e93]">
                      {new Date(coupon.purchased_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  {coupon.used ? (
                    <span className="text-[12px] font-medium text-[#8e8e93] shrink-0">사용완료 ✔</span>
                  ) : (
                    <button
                      onClick={() => handleUseCoupon(coupon.id, coupon.name)}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-full font-semibold text-[13px] bg-purple-600 text-white shrink-0 active:scale-95 transition-all"
                    >
                      사용하기
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
            {transactions.length === 0 ? (
              <p className="text-center text-[#8e8e93] py-10 text-[15px]">아직 기록이 없어요</p>
            ) : (
              transactions.map((tx, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between items-center px-4 py-3.5 ${idx !== transactions.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[15px] text-[#1c1c1e] truncate">{tx.description}</p>
                    <p className="text-[12px] text-[#8e8e93]">
                      {new Date(tx.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <p className={`font-semibold text-[15px] shrink-0 ${tx.amount > 0 ? 'text-green-600' : tx.amount < 0 ? 'text-red-500' : 'text-[#8e8e93]'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} 💖
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <TabBar items={TABS} activeId={activeTab} onChange={setActiveTab} accentColor="#db2777" />
      <Toast message={toast} visible={!!toast} onClose={() => setToast('')} />
    </div>
  );
}
