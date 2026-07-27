'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { getParentData, giveCoins, addShopItem, updateShopItem, deleteShopItem, updateChildPin, getAccessLogs } from './actions';

const QUICK_AMOUNTS = [1, 3, 5, 10];
const RANDOM_EMOJIS = ['🎁', '⭐', '🌈', '🍭', '🧸', '🎪', '🎨', '🍩', '🦄', '💝'];

interface Tab {
  id: string;
  label: string;
}

const TABS: Tab[] = [
  { id: 'coins', label: '💖 하트 관리' },
  { id: 'shop', label: '🛍️ 쿠폰 관리' },
  { id: 'settings', label: '⚙️ 설정' },
  { id: 'logs', label: '📜 접속 기록' },
];

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

export default function ParentPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('coins');
  const [balance, setBalance] = useState<number>(0);
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [toast, setToast] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [reason, setReason] = useState<string>('');
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemPrice, setNewItemPrice] = useState<string>('');
  const [newChildPin, setNewChildPin] = useState<string>('');

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getParentData();
        if (data.child) setBalance((data.child as any).balance);
        if (data.shops) setShops(data.shops as ShopItem[]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleGiveCoins = async (amount: number) => {
    try {
      setIsLoading(true);
      const desc = reason || (amount > 0 ? '잘했어요!' : '하트 차감');
      await giveCoins(amount, desc);
      setBalance(balance + amount);
      setReason('');
      setToast(amount > 0 ? `+${amount} 하트를 줬어요 💖` : `${amount} 하트 뺐어요`);

      // Reload data
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

      // Reload shops
      const data = await getParentData();
      if (data.shops) setShops(data.shops as ShopItem[]);
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
    if (!newChildPin.trim()) {
      setToast('새 비밀번호를 입력해주세요');
      return;
    }

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

  const handleLogout = () => {
    router.push('/');
  };

  if (isLoading && balance === 0 && shops.length === 0) {
    return <div className="text-center">로딩 중...</div>;
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-purple-700">👨‍👩‍👧 부모님 관리</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-300"
        >
          나가기
        </button>
      </div>

      {/* Balance */}
      <div className="bg-pink-100 rounded-2xl p-6 mb-6 text-center">
        <p className="text-pink-800 font-bold text-sm">아이의 하트</p>
        <p className="text-5xl font-bold text-pink-600 mt-2">
          {balance} <span className="text-3xl">💖</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Coins Tab */}
      {activeTab === 'coins' && (
        <div className="space-y-4">
          <p className="font-bold text-purple-700">💖 하트 주기 / 빼기</p>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => handleGiveCoins(amount)}
                disabled={isLoading}
                className="py-3 bg-pink-100 text-pink-700 font-bold rounded-lg hover:bg-pink-200 active:scale-95 transition-all disabled:opacity-50"
              >
                +{amount}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleGiveCoins(-1)}
              disabled={isLoading}
              className="col-span-4 py-3 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200 active:scale-95 transition-all disabled:opacity-50"
            >
              -1
            </button>
          </div>

          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="이유 (예: 숙제 다 했어요!)"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
      )}

      {/* Shop Tab */}
      {activeTab === 'shop' && (
        <div className="space-y-4">
          {shops.map((item) => (
            <div key={item.id} className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg">
              <span className="text-3xl">{item.emoji}</span>
              <div className="flex-1">
                <p className="font-bold text-gray-800">{item.name}</p>
                <p className="text-sm text-gray-600">{item.price} 💖</p>
              </div>
              <button
                onClick={() => setEditingItemId(item.id)}
                className="px-3 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded hover:bg-blue-200"
              >
                수정
              </button>
              <button
                onClick={() => handleDeleteItem(item.id)}
                disabled={isLoading}
                className="px-3 py-2 bg-red-100 text-red-700 text-xs font-bold rounded hover:bg-red-200 disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          ))}

          <div className="border-t-2 border-gray-200 pt-4">
            <p className="font-bold text-purple-700 mb-3">새 쿠폰 추가</p>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="쿠폰 이름"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-3 focus:outline-none focus:border-purple-500"
            />
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="하트"
                min="1"
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              onClick={handleAddItem}
              disabled={isLoading}
              className="w-full py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50"
            >
              쿠폰 추가하기
            </button>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <p className="font-bold text-purple-700">자녀 비밀번호 변경</p>
          <input
            type="text"
            value={newChildPin}
            onChange={(e) => setNewChildPin(e.target.value)}
            placeholder="새 4자리 비밀번호"
            maxLength={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleUpdatePin}
            disabled={isLoading}
            className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50"
          >
            비밀번호 변경
          </button>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-3">
          <p className="font-bold text-purple-700 mb-4">📜 최근 접속 기록</p>
          <p className="text-sm text-gray-600">로그인 기록이 여기에 표시됩니다</p>
        </div>
      )}

      <Toast message={toast} visible={!!toast} onClose={() => setToast('')} />
    </div>
  );
}
