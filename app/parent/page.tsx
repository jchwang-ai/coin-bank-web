'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import TabBar from '@/components/TabBar';
import AvatarUpload from '@/components/AvatarUpload';
import SwipeableViews from '@/components/SwipeableViews';
import {
  getParentData,
  giveCoins,
  addShopItem,
  updateShopItem,
  deleteShopItem,
  updateChildPin,
  updateChildName,
  getAccessLogs,
} from './actions';

const QUICK_AMOUNTS = [1, 3, 5, 10];
const RANDOM_EMOJIS = ['🎁', '⭐', '🌈', '🍭', '🧸', '🎪', '🎨', '🍩', '🦄', '💝'];

const TABS = [
  { id: 'coins', label: '하트', icon: '💖' },
  { id: 'shop', label: '쿠폰', icon: '🛍️' },
  { id: 'settings', label: '설정', icon: '⚙️' },
  { id: 'logs', label: '기록', icon: '📋' },
];
const TAB_IDS = TABS.map((t) => t.id);

interface ShopItem {
  id: string;
  emoji: string;
  name: string;
  price: number;
}

interface AccessLog {
  role: string;
  user_agent: string;
  logged_in_at: string;
  logged_out_at: string | null;
}

function deviceLabel(userAgent: string) {
  if (!userAgent) return '알 수 없는 기기';
  if (/iphone/i.test(userAgent)) return '📱 아이폰';
  if (/ipad/i.test(userAgent)) return '📱 아이패드';
  if (/android/i.test(userAgent)) return '📱 안드로이드';
  if (/macintosh/i.test(userAgent)) return '💻 맥';
  if (/windows/i.test(userAgent)) return '💻 윈도우';
  return '🖥️ 기타 기기';
}

export default function ParentPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('coins');
  const [balance, setBalance] = useState<number>(0);
  const [childName, setChildName] = useState<string>('나');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [toast, setToast] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');

  const [reason, setReason] = useState<string>('');
  const [amount, setAmount] = useState<string>('1');
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemPrice, setNewItemPrice] = useState<string>('');
  const [newChildPin, setNewChildPin] = useState<string>('');
  const [newChildName, setNewChildName] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getParentData();
        if (data.child) {
          setBalance((data.child as any).balance);
          setChildName((data.child as any).name || '나');
          setPhotoUrl((data.child as any).photo_data || null);
        }
        if (data.shops) setShops(data.shops as ShopItem[]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      getAccessLogs()
        .then((rows) => setLogs(rows as AccessLog[]))
        .catch((err) => console.error(err));
    }
  }, [activeTab]);

  const handleGiveCoins = async (isGive: boolean) => {
    const qty = parseInt(amount, 10);
    if (!qty || qty < 1) {
      setToast('하트 개수를 입력해주세요');
      return;
    }
    if (!reason.trim()) {
      setToast('이유를 적어주세요 ✏️');
      return;
    }

    const delta = isGive ? qty : -qty;
    try {
      setIsLoading(true);
      await giveCoins(delta, reason.trim());
      setBalance(balance + delta);
      setToast(isGive ? `+${qty} 하트를 줬어요 💖` : `−${qty} 하트를 뺐어요`);
      setReason('');
      setAmount('1');

      const data = await getParentData();
      if (data.child) setBalance((data.child as any).balance);
    } catch (error) {
      setToast('오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemPrice.trim()) {
      setToast('이름과 가격을 입력해주세요');
      return;
    }
    try {
      setIsLoading(true);
      const emoji = RANDOM_EMOJIS[Math.floor(Math.random() * RANDOM_EMOJIS.length)];
      await addShopItem(emoji, newItemName, parseInt(newItemPrice));
      setNewItemName('');
      setNewItemPrice('');
      setToast('쿠폰을 추가했어요! 🛍️');

      const data = await getParentData();
      if (data.shops) setShops(data.shops as ShopItem[]);
    } catch (error) {
      setToast('오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditItem = (item: ShopItem) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditPrice(String(item.price));
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim() || !editPrice.trim() || parseInt(editPrice) < 1) {
      setToast('이름과 가격을 확인해주세요');
      return;
    }
    try {
      setIsLoading(true);
      const price = parseInt(editPrice);
      await updateShopItem(id, editName.trim(), price);
      setShops(shops.map((s) => (s.id === id ? { ...s, name: editName.trim(), price } : s)));
      setEditingItemId(null);
      setToast('쿠폰을 수정했어요! ✏️');
    } catch (error) {
      setToast('오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('이 쿠폰을 삭제할까요?')) return;
    try {
      setIsLoading(true);
      await deleteShopItem(id);
      setShops(shops.filter((s) => s.id !== id));
      setToast('쿠폰을 삭제했어요');
    } catch (error) {
      setToast('오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePin = async () => {
    if (newChildPin.length !== 4) {
      setToast('비밀번호는 4자리여야 해요');
      return;
    }
    try {
      setIsLoading(true);
      await updateChildPin(newChildPin);
      setNewChildPin('');
      setToast('자녀 비밀번호를 변경했어요!');
    } catch (error) {
      setToast('오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!newChildName.trim()) {
      setToast('이름을 입력해주세요');
      return;
    }
    try {
      setIsLoading(true);
      await updateChildName(newChildName.trim());
      setChildName(newChildName.trim());
      setNewChildName('');
      setToast('이름을 바꿨어요!');
    } catch (error) {
      setToast('오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => router.push('/');
  const handlePreviewChild = () => router.push('/child?preview=parent');

  const activeIndex = Math.max(TAB_IDS.indexOf(activeTab), 0);

  if (isLoading && balance === 0 && shops.length === 0) {
    return <div className="text-center pt-24 text-[#8e8e93]">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 safe-top">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <AvatarUpload photoUrl={photoUrl} size={56} fallbackEmoji="👧" />
            <div>
              <p className="text-[13px] text-[#8e8e93]">부모님 화면</p>
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
        <div className="rounded-3xl p-6 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-lg shadow-purple-500/25 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-8xl opacity-20">💖</div>
          <p className="text-white/80 text-[13px] font-medium relative">{childName}의 하트</p>
          <p className="text-white text-[44px] font-bold leading-tight mt-1 relative">
            {balance}
            <span className="text-2xl ml-2">💖</span>
          </p>
        </div>
      </div>

      {/* Content */}
      <SwipeableViews
        activeIndex={activeIndex}
        onIndexChange={(i) => setActiveTab(TAB_IDS[i])}
      >
        {[
          <div key="coins" className="space-y-5">
            <div className="rounded-2xl bg-white shadow-sm border border-black/5 p-4">
              <p className="text-[13px] font-semibold text-[#8e8e93] mb-3 px-1">하트 개수</p>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {QUICK_AMOUNTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setAmount(String(q))}
                    className={`py-3.5 font-bold rounded-xl transition-all active:scale-95 ${
                      amount === String(q) ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-600'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                placeholder="직접 입력"
                className="w-full px-4 py-3 bg-black/[0.03] rounded-xl text-[15px] text-center font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-black/5 p-4">
              <p className="text-[13px] font-semibold text-[#8e8e93] mb-2 px-1">
                이유 <span className="text-pink-400">*필수</span>
              </p>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 숙제 다 했어요!"
                className="w-full px-4 py-3 bg-black/[0.03] rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleGiveCoins(true)}
                disabled={isLoading}
                className="py-4 bg-pink-500 text-white font-bold rounded-xl active:scale-[0.97] transition-all disabled:opacity-50"
              >
                💖 하트 주기
              </button>
              <button
                onClick={() => handleGiveCoins(false)}
                disabled={isLoading}
                className="py-4 bg-red-50 text-red-500 font-bold rounded-xl active:scale-[0.97] transition-all disabled:opacity-50"
              >
                💔 하트 빼기
              </button>
            </div>
          </div>,

          <div key="shop" className="space-y-5">
            <div className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
              {shops.length === 0 ? (
                <p className="text-center text-[#8e8e93] py-10 text-[15px]">쿠폰이 없어요</p>
              ) : (
                shops.map((item, idx) => {
                  const isEditing = editingItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`px-4 py-3.5 ${idx !== shops.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 min-w-0 px-3 py-2 bg-black/[0.04] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-300"
                          />
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            min="1"
                            className="w-16 px-2 py-2 bg-black/[0.04] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-300"
                          />
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={isLoading}
                            className="px-3 py-2 rounded-lg bg-green-600 text-white text-[13px] font-semibold shrink-0 active:scale-95 transition-all"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setEditingItemId(null)}
                            className="px-3 py-2 rounded-lg bg-black/5 text-[#8e8e93] text-[13px] font-semibold shrink-0 active:scale-95 transition-all"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-pink-50 flex items-center justify-center text-xl shrink-0">
                            {item.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[15px] text-[#1c1c1e] truncate">{item.name}</p>
                            <p className="text-[13px] text-[#8e8e93]">{item.price} 💖</p>
                          </div>
                          <button
                            onClick={() => startEditItem(item)}
                            className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-[13px] shrink-0 active:scale-90 transition-all"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={isLoading}
                            className="w-8 h-8 rounded-full bg-red-50 text-red-500 text-[15px] shrink-0 active:scale-90 transition-all disabled:opacity-50"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-black/5 p-4">
              <p className="text-[13px] font-semibold text-[#8e8e93] mb-3 px-1">새 쿠폰 추가</p>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="쿠폰 이름"
                className="w-full px-4 py-3 bg-black/[0.03] rounded-xl text-[15px] mb-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <input
                type="number"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="하트 가격"
                min="1"
                className="w-full px-4 py-3 bg-black/[0.03] rounded-xl text-[15px] mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <button
                onClick={handleAddItem}
                disabled={isLoading}
                className="w-full py-3.5 bg-[#1c1c1e] text-white font-semibold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50"
              >
                쿠폰 추가하기
              </button>
            </div>
          </div>,

          <div key="settings" className="space-y-5">
            <div className="rounded-2xl bg-white shadow-sm border border-black/5 p-4">
              <p className="text-[13px] font-semibold text-[#8e8e93] mb-3 px-1">아이 화면 미리보기</p>
              <button
                onClick={handlePreviewChild}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>👀</span>
                아이 화면으로 들어가보기
              </button>
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-black/5 p-4">
              <p className="text-[13px] font-semibold text-[#8e8e93] mb-3 px-1">자녀 이름</p>
              <input
                type="text"
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                placeholder={childName}
                maxLength={10}
                className="w-full px-4 py-3 bg-black/[0.03] rounded-xl text-[15px] mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <button
                onClick={handleUpdateName}
                disabled={isLoading}
                className="w-full py-3.5 bg-purple-600 text-white font-semibold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50"
              >
                이름 변경
              </button>
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-black/5 p-4">
              <p className="text-[13px] font-semibold text-[#8e8e93] mb-3 px-1">자녀 비밀번호 변경</p>
              <input
                type="text"
                inputMode="numeric"
                value={newChildPin}
                onChange={(e) => setNewChildPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="새 4자리 비밀번호"
                maxLength={4}
                className="w-full px-4 py-3 bg-black/[0.03] rounded-xl text-[15px] mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300 tracking-widest"
              />
              <button
                onClick={handleUpdatePin}
                disabled={isLoading}
                className="w-full py-3.5 bg-purple-600 text-white font-semibold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50"
              >
                비밀번호 변경
              </button>
            </div>
          </div>,

          <div key="logs" className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
            {logs.length === 0 ? (
              <p className="text-center text-[#8e8e93] py-10 text-[15px]">접속 기록이 없어요</p>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between px-4 py-3.5 ${idx !== logs.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">{log.role === 'parent' ? '👨‍👩‍👧' : '👧'}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-[14px] text-[#1c1c1e]">
                        {log.role === 'parent' ? '부모님' : '아이'} 접속
                      </p>
                      <p className="text-[12px] text-[#8e8e93] truncate">{deviceLabel(log.user_agent)}</p>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#8e8e93] shrink-0">
                    {new Date(log.logged_in_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
          </div>,
        ]}
      </SwipeableViews>

      <TabBar items={TABS} activeId={activeTab} onChange={setActiveTab} accentColor="#9333ea" />
      <Toast message={toast} visible={!!toast} onClose={() => setToast('')} />
    </div>
  );
}
