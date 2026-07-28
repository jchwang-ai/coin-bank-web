'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import TabBar from '@/components/TabBar';
import AvatarUpload from '@/components/AvatarUpload';
import SwipeableViews from '@/components/SwipeableViews';
import EmojiPicker from '@/components/EmojiPicker';
import NumberStepper from '@/components/NumberStepper';
import ReorderableList from '@/components/ReorderableList';
import { useUnlockAudio } from '@/hooks/useUnlockAudio';
import { playChime, playSoftDown } from '@/lib/sound';
import {
  getParentData,
  giveCoins,
  addShopItem,
  updateShopItem,
  deleteShopItem,
  updateChildPin,
  updateChildName,
  addMission,
  updateMission,
  deleteMission,
  approveMissionRequest,
  rejectMissionRequest,
  approveShopItemRequest,
  rejectShopItemRequest,
  reorderShopItems,
  reorderMissions,
  getAccessLogs,
  getActivityLogs,
} from './actions';

const QUICK_AMOUNTS = [1, 3, 5, 10];

const TABS = [
  { id: 'coins', label: '하트', icon: '💖' },
  { id: 'shop', label: '쿠폰', icon: '🛍️' },
  { id: 'missions', label: '미션', icon: '🎯' },
  { id: 'settings', label: '설정', icon: '⚙️' },
  { id: 'logs', label: '기록', icon: '📋' },
];
const TAB_IDS = TABS.map((t) => t.id);

interface ShopItem {
  id: string;
  emoji: string;
  name: string;
  price: number;
  sort_order?: number | null;
}

interface Mission {
  id: string;
  emoji: string;
  name: string;
  reward: number;
  sort_order?: number | null;
}

interface PendingRequest {
  id: string;
  mission_id: string | null;
  is_custom: boolean;
  emoji: string;
  name: string;
  reward: number | null;
  photo_data: string | null;
  requested_at: string;
}

interface PendingShopRequest {
  id: string;
  emoji: string;
  name: string;
  requested_price: number;
  requested_at: string;
}

interface AccessLog {
  role: string;
  user_agent: string;
  logged_in_at: string;
  logged_out_at: string | null;
}

interface ActivityLog {
  actor: string;
  action: string;
  detail: string | null;
  created_at: string;
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
  useUnlockAudio();

  const [activeTab, setActiveTab] = useState<string>('coins');
  const [balance, setBalance] = useState<number>(0);
  const [childName, setChildName] = useState<string>('나');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [pendingShopRequests, setPendingShopRequests] = useState<PendingShopRequest[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [direction, setDirection] = useState<'give' | 'take'>('give');
  const [toast, setToast] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editPrice, setEditPrice] = useState<number>(1);
  const [editItemEmoji, setEditItemEmoji] = useState<string>('🎁');

  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [editMissionName, setEditMissionName] = useState<string>('');
  const [editMissionReward, setEditMissionReward] = useState<number>(1);
  const [editMissionEmoji, setEditMissionEmoji] = useState<string>('🎯');
  const [newMissionName, setNewMissionName] = useState<string>('');
  const [newMissionReward, setNewMissionReward] = useState<number>(1);
  const [newMissionEmoji, setNewMissionEmoji] = useState<string>('🎯');
  const [approveRewardInputs, setApproveRewardInputs] = useState<Record<string, number>>({});
  const [shopApprovePriceInputs, setShopApprovePriceInputs] = useState<Record<string, number>>({});

  const [reason, setReason] = useState<string>('');
  const [amount, setAmount] = useState<number>(1);
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemPrice, setNewItemPrice] = useState<number>(1);
  const [newItemEmoji, setNewItemEmoji] = useState<string>('🎁');
  const [newChildPin, setNewChildPin] = useState<string>('');
  const [newChildName, setNewChildName] = useState<string>('');
  const [logDayIndex, setLogDayIndex] = useState<number>(0);

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
        if (data.missions) setMissions(data.missions as Mission[]);
        if (data.pendingRequests) setPendingRequests(data.pendingRequests as PendingRequest[]);
        if (data.pendingShopRequests) setPendingShopRequests(data.pendingShopRequests as PendingShopRequest[]);
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
      getActivityLogs()
        .then((rows) => setActivityLogs(rows as ActivityLog[]))
        .catch((err) => console.error(err));
      setLogDayIndex(0);
    }
  }, [activeTab]);

  const logDateKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };

  const logDays = Array.from(new Set(logs.map((l) => logDateKey(l.logged_in_at))));
  const selectedDayKey = logDays[logDayIndex];
  const logsForSelectedDay = logs.filter((l) => logDateKey(l.logged_in_at) === selectedDayKey);
  const selectedDayLabel = selectedDayKey
    ? new Date(logs.find((l) => logDateKey(l.logged_in_at) === selectedDayKey)!.logged_in_at).toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      })
    : '';
  const isToday = selectedDayKey === logDateKey(new Date().toISOString());

  const handleGiveCoins = async (isGive: boolean) => {
    const qty = amount;
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
      setAmount(1);
      if (isGive) playChime();

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
    if (!newItemName.trim()) {
      setToast('이름을 입력해주세요');
      return;
    }
    try {
      setIsLoading(true);
      await addShopItem(newItemEmoji, newItemName, newItemPrice);
      setNewItemName('');
      setNewItemPrice(1);
      setNewItemEmoji('🎁');
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
    setEditPrice(item.price);
    setEditItemEmoji(item.emoji);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      setToast('이름을 확인해주세요');
      return;
    }
    try {
      setIsLoading(true);
      await updateShopItem(id, editName.trim(), editPrice, editItemEmoji);
      setShops(shops.map((s) => (s.id === id ? { ...s, name: editName.trim(), price: editPrice, emoji: editItemEmoji } : s)));
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

  const handleReorderShop = async (newOrder: ShopItem[]) => {
    setShops(newOrder);
    try {
      await reorderShopItems(newOrder.map((s) => s.id));
    } catch (error) {
      console.error('Error reordering shop items:', error);
    }
  };

  const handleAddMission = async () => {
    if (!newMissionName.trim()) {
      setToast('미션 이름을 입력해주세요');
      return;
    }
    try {
      setIsLoading(true);
      await addMission(newMissionEmoji, newMissionName.trim(), newMissionReward);
      setNewMissionName('');
      setNewMissionReward(1);
      setNewMissionEmoji('🎯');
      setToast('미션을 추가했어요! 🎯');

      const data = await getParentData();
      if (data.missions) setMissions(data.missions as Mission[]);
    } catch (error) {
      setToast('오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditMission = (mission: Mission) => {
    setEditingMissionId(mission.id);
    setEditMissionName(mission.name);
    setEditMissionReward(mission.reward);
    setEditMissionEmoji(mission.emoji);
  };

  const handleSaveEditMission = async (id: string) => {
    if (!editMissionName.trim()) {
      setToast('이름을 확인해주세요');
      return;
    }
    try {
      setIsLoading(true);
      await updateMission(id, editMissionName.trim(), editMissionReward, editMissionEmoji);
      setMissions(missions.map((m) => (m.id === id ? { ...m, name: editMissionName.trim(), reward: editMissionReward, emoji: editMissionEmoji } : m)));
      setEditingMissionId(null);
      setToast('미션을 수정했어요! ✏️');
    } catch (error) {
      setToast('오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMission = async (id: string) => {
    if (!window.confirm('이 미션을 삭제할까요?')) return;
    try {
      setIsLoading(true);
      await deleteMission(id);
      setMissions(missions.filter((m) => m.id !== id));
      setToast('미션을 삭제했어요');
    } catch (error) {
      setToast('오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorderMissions = async (newOrder: Mission[]) => {
    setMissions(newOrder);
    try {
      await reorderMissions(newOrder.map((m) => m.id));
    } catch (error) {
      console.error('Error reordering missions:', error);
    }
  };

  const handleApproveRequest = async (request: PendingRequest) => {
    let overrideReward: number | undefined;
    if (request.reward === null) {
      const parsed = approveRewardInputs[request.id] ?? 1;
      if (!parsed || parsed < 1) {
        setToast('하트 개수를 입력해주세요');
        return;
      }
      overrideReward = parsed;
    }

    try {
      setIsLoading(true);
      const result = await approveMissionRequest(request.id, overrideReward);
      setPendingRequests(pendingRequests.filter((r) => r.id !== request.id));
      setBalance(balance + ((result as any).reward || 0));
      playChime();
      setToast(`+${(result as any).reward} 하트를 승인했어요! 💖`);

      const data = await getParentData();
      if (data.child) setBalance((data.child as any).balance);
    } catch (error) {
      setToast(error instanceof Error ? error.message : '오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!window.confirm('이 요청을 거절할까요?')) return;
    try {
      setIsLoading(true);
      await rejectMissionRequest(requestId);
      setPendingRequests(pendingRequests.filter((r) => r.id !== requestId));
      playSoftDown();
      setToast('요청을 거절했어요');
    } catch (error) {
      setToast('오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveShopRequest = async (request: PendingShopRequest) => {
    const finalPrice = shopApprovePriceInputs[request.id] ?? request.requested_price;
    if (!finalPrice || finalPrice < 1) {
      setToast('하트 개수를 입력해주세요');
      return;
    }

    try {
      setIsLoading(true);
      await approveShopItemRequest(request.id, finalPrice);
      setPendingShopRequests(pendingShopRequests.filter((r) => r.id !== request.id));
      playChime();
      setToast('상점에 새 아이템을 추가했어요! 🛍️');

      const data = await getParentData();
      if (data.shops) setShops(data.shops as ShopItem[]);
    } catch (error) {
      setToast(error instanceof Error ? error.message : '오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectShopRequest = async (requestId: string) => {
    if (!window.confirm('이 제안을 거절할까요?')) return;
    try {
      setIsLoading(true);
      await rejectShopItemRequest(requestId);
      setPendingShopRequests(pendingShopRequests.filter((r) => r.id !== requestId));
      playSoftDown();
      setToast('제안을 거절했어요');
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

  const tabsWithBadge = TABS.map((t) => {
    if (t.id === 'missions' && pendingRequests.length > 0) return { ...t, badge: pendingRequests.length };
    if (t.id === 'shop' && pendingShopRequests.length > 0) return { ...t, badge: pendingShopRequests.length };
    return t;
  });
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
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDirection('give')}
                className={`py-3.5 font-bold rounded-xl transition-all active:scale-[0.97] ${
                  direction === 'give' ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-500'
                }`}
              >
                💖 하트 주기
              </button>
              <button
                onClick={() => setDirection('take')}
                className={`py-3.5 font-bold rounded-xl transition-all active:scale-[0.97] ${
                  direction === 'take' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-500'
                }`}
              >
                💔 하트 빼기
              </button>
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-black/5 p-4">
              <p className="text-[13px] font-semibold text-[#8e8e93] mb-3 px-1">하트 개수</p>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {QUICK_AMOUNTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setAmount(q)}
                    className={`py-3.5 font-bold rounded-xl transition-all active:scale-95 ${
                      amount === q
                        ? direction === 'give'
                          ? 'bg-pink-500 text-white'
                          : 'bg-red-500 text-white'
                        : direction === 'give'
                          ? 'bg-pink-50 text-pink-600'
                          : 'bg-red-50 text-red-500'
                    }`}
                  >
                    {direction === 'give' ? `+${q}` : `−${q}`}
                  </button>
                ))}
              </div>
              <NumberStepper
                value={amount}
                onChange={setAmount}
                signPrefix={direction === 'give' ? '+' : '−'}
                valueColorClassName={direction === 'give' ? 'text-pink-500' : 'text-red-500'}
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

            <button
              onClick={() => handleGiveCoins(direction === 'give')}
              disabled={isLoading}
              className={`w-full py-4 text-white font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 ${
                direction === 'give' ? 'bg-pink-500' : 'bg-red-500'
              }`}
            >
              {direction === 'give' ? `💖 +${amount} 하트 주기` : `💔 −${amount} 하트 빼기`}
            </button>
          </div>,

          <div key="shop" className="space-y-5">
            {pendingShopRequests.length > 0 && (
              <div className="rounded-2xl bg-white shadow-sm border border-pink-200 overflow-hidden">
                <p className="text-[13px] font-semibold text-pink-500 px-4 pt-4 pb-2">
                  🔔 아이가 아이템을 제안했어요 ({pendingShopRequests.length})
                </p>
                {pendingShopRequests.map((req, idx) => (
                  <div
                    key={req.id}
                    className={`px-4 py-3.5 ${idx !== pendingShopRequests.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-full bg-pink-50 flex items-center justify-center text-xl shrink-0">
                        {req.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[15px] text-[#1c1c1e]">{req.name}</p>
                        <p className="text-[12px] text-[#8e8e93]">
                          {new Date(req.requested_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          <span className="ml-1.5 font-semibold text-pink-500">· 제안: {req.requested_price} 💖</span>
                        </p>
                        <div className="mt-2">
                          <NumberStepper
                            value={shopApprovePriceInputs[req.id] ?? req.requested_price}
                            onChange={(v) => setShopApprovePriceInputs({ ...shopApprovePriceInputs, [req.id]: v })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <button
                            onClick={() => handleApproveShopRequest(req)}
                            disabled={isLoading}
                            className="py-2.5 bg-pink-500 text-white font-semibold text-[13px] rounded-lg active:scale-[0.97] transition-all disabled:opacity-50"
                          >
                            승인 💖
                          </button>
                          <button
                            onClick={() => handleRejectShopRequest(req.id)}
                            disabled={isLoading}
                            className="py-2.5 bg-black/5 text-[#8e8e93] font-semibold text-[13px] rounded-lg active:scale-[0.97] transition-all disabled:opacity-50"
                          >
                            거절
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
              {shops.length === 0 ? (
                <p className="text-center text-[#8e8e93] py-10 text-[15px]">쿠폰이 없어요</p>
              ) : (
                <ReorderableList
                  items={shops}
                  onReorder={handleReorderShop}
                  disabled={editingItemId !== null}
                  renderItem={(item) => {
                  const idx = shops.findIndex((s) => s.id === item.id);
                  const isEditing = editingItemId === item.id;
                  return (
                    <div
                      className={`px-4 py-3.5 ${idx !== shops.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <EmojiPicker value={editItemEmoji} onChange={setEditItemEmoji} />
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 min-w-0 px-3 py-2 bg-black/[0.04] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-300"
                            />
                          </div>
                          <NumberStepper value={editPrice} onChange={setEditPrice} />
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              disabled={isLoading}
                              className="py-2 rounded-lg bg-green-600 text-white text-[13px] font-semibold active:scale-95 transition-all"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="py-2 rounded-lg bg-black/5 text-[#8e8e93] text-[13px] font-semibold active:scale-95 transition-all"
                            >
                              취소
                            </button>
                          </div>
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
                  }}
                />
              )}
            </div>

            <p className="text-[12px] text-[#8e8e93] text-center px-4">⠿ 을 눌러서 위아래로 끌면 순서를 바꿀 수 있어요</p>

            <div className="rounded-2xl bg-white shadow-sm border border-black/5 p-4">
              <p className="text-[13px] font-semibold text-[#8e8e93] mb-3 px-1">새 쿠폰 추가</p>
              <div className="flex items-center gap-2 mb-3">
                <EmojiPicker value={newItemEmoji} onChange={setNewItemEmoji} />
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="쿠폰 이름"
                  className="flex-1 min-w-0 px-4 py-3 bg-black/[0.03] rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <p className="text-[13px] font-semibold text-[#8e8e93] mb-2 px-1">하트 가격</p>
              <div className="mb-3">
                <NumberStepper value={newItemPrice} onChange={setNewItemPrice} />
              </div>
              <button
                onClick={handleAddItem}
                disabled={isLoading}
                className="w-full py-3.5 bg-[#1c1c1e] text-white font-semibold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50"
              >
                쿠폰 추가하기
              </button>
            </div>
          </div>,

          <div key="missions" className="space-y-5">
            {pendingRequests.length > 0 && (
              <div className="rounded-2xl bg-white shadow-sm border border-pink-200 overflow-hidden">
                <p className="text-[13px] font-semibold text-pink-500 px-4 pt-4 pb-2">
                  🔔 아이가 요청했어요 ({pendingRequests.length})
                </p>
                {pendingRequests.map((req, idx) => (
                  <div
                    key={req.id}
                    className={`px-4 py-3.5 ${idx !== pendingRequests.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-full bg-pink-50 flex items-center justify-center text-xl shrink-0">
                        {req.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[15px] text-[#1c1c1e]">{req.name}</p>
                        <p className="text-[12px] text-[#8e8e93]">
                          {new Date(req.requested_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {req.reward !== null && <span className="ml-1.5 font-semibold text-pink-500">· {req.reward} 💖</span>}
                        </p>
                        {req.photo_data && (
                          <button onClick={() => setViewingPhoto(req.photo_data)} className="mt-2 block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={req.photo_data} alt="첨부 사진" className="w-full max-w-[200px] rounded-xl border border-black/5" />
                          </button>
                        )}
                        {req.reward === null && (
                          <div className="mt-2">
                            <NumberStepper
                              value={approveRewardInputs[req.id] ?? 1}
                              onChange={(v) => setApproveRewardInputs({ ...approveRewardInputs, [req.id]: v })}
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <button
                            onClick={() => handleApproveRequest(req)}
                            disabled={isLoading}
                            className="py-2.5 bg-pink-500 text-white font-semibold text-[13px] rounded-lg active:scale-[0.97] transition-all disabled:opacity-50"
                          >
                            승인 💖
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            disabled={isLoading}
                            className="py-2.5 bg-black/5 text-[#8e8e93] font-semibold text-[13px] rounded-lg active:scale-[0.97] transition-all disabled:opacity-50"
                          >
                            거절
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
              {missions.length === 0 ? (
                <p className="text-center text-[#8e8e93] py-10 text-[15px]">미션이 없어요</p>
              ) : (
                <ReorderableList
                  items={missions}
                  onReorder={handleReorderMissions}
                  disabled={editingMissionId !== null}
                  renderItem={(mission) => {
                  const idx = missions.findIndex((m) => m.id === mission.id);
                  const isEditing = editingMissionId === mission.id;
                  return (
                    <div
                      className={`px-4 py-3.5 ${idx !== missions.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <EmojiPicker value={editMissionEmoji} onChange={setEditMissionEmoji} />
                            <input
                              type="text"
                              value={editMissionName}
                              onChange={(e) => setEditMissionName(e.target.value)}
                              className="flex-1 min-w-0 px-3 py-2 bg-black/[0.04] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-300"
                            />
                          </div>
                          <NumberStepper value={editMissionReward} onChange={setEditMissionReward} />
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleSaveEditMission(mission.id)}
                              disabled={isLoading}
                              className="py-2 rounded-lg bg-green-600 text-white text-[13px] font-semibold active:scale-95 transition-all"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditingMissionId(null)}
                              className="py-2 rounded-lg bg-black/5 text-[#8e8e93] text-[13px] font-semibold active:scale-95 transition-all"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-purple-50 flex items-center justify-center text-xl shrink-0">
                            {mission.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[15px] text-[#1c1c1e] truncate">{mission.name}</p>
                            <p className="text-[13px] text-[#8e8e93]">{mission.reward} 💖</p>
                          </div>
                          <button
                            onClick={() => startEditMission(mission)}
                            className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-[13px] shrink-0 active:scale-90 transition-all"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteMission(mission.id)}
                            disabled={isLoading}
                            className="w-8 h-8 rounded-full bg-red-50 text-red-500 text-[15px] shrink-0 active:scale-90 transition-all disabled:opacity-50"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  );
                  }}
                />
              )}
            </div>

            <p className="text-[12px] text-[#8e8e93] text-center px-4">⠿ 을 눌러서 위아래로 끌면 순서를 바꿀 수 있어요</p>

            <div className="rounded-2xl bg-white shadow-sm border border-black/5 p-4">
              <p className="text-[13px] font-semibold text-[#8e8e93] mb-3 px-1">새 미션 추가</p>
              <div className="flex items-center gap-2 mb-3">
                <EmojiPicker value={newMissionEmoji} onChange={setNewMissionEmoji} />
                <input
                  type="text"
                  value={newMissionName}
                  onChange={(e) => setNewMissionName(e.target.value)}
                  placeholder="미션 이름 (예: 책 읽기)"
                  className="flex-1 min-w-0 px-4 py-3 bg-black/[0.03] rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <p className="text-[13px] font-semibold text-[#8e8e93] mb-2 px-1">완료 시 줄 하트 개수</p>
              <div className="mb-3">
                <NumberStepper value={newMissionReward} onChange={setNewMissionReward} />
              </div>
              <button
                onClick={handleAddMission}
                disabled={isLoading}
                className="w-full py-3.5 bg-[#1c1c1e] text-white font-semibold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50"
              >
                미션 추가하기
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

          <div key="logs" className="space-y-5">
            <div className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
              <p className="text-[13px] font-semibold text-[#8e8e93] px-4 pt-4 pb-2">📋 변경 기록</p>
              {activityLogs.length === 0 ? (
                <p className="text-center text-[#8e8e93] py-10 text-[15px]">변경 기록이 없어요</p>
              ) : (
                activityLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between px-4 py-3.5 ${idx !== activityLogs.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">{log.actor === 'parent' ? '👨‍👩‍👧' : '👧'}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-[14px] text-[#1c1c1e]">{log.action}</p>
                        {log.detail && <p className="text-[12px] text-[#8e8e93] truncate">{log.detail}</p>}
                      </div>
                    </div>
                    <p className="text-[12px] text-[#8e8e93] shrink-0">
                      {new Date(log.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <p className="text-[13px] font-semibold text-[#8e8e93]">🔑 로그인 기록</p>
                {logDays.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setLogDayIndex((i) => Math.min(logDays.length - 1, i + 1))}
                      disabled={logDayIndex >= logDays.length - 1}
                      className="w-7 h-7 rounded-full bg-black/5 text-[#1c1c1e] text-[13px] flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
                      aria-label="이전 날짜"
                    >
                      ←
                    </button>
                    <span className="text-[12px] font-semibold text-[#1c1c1e] px-1 min-w-[92px] text-center">
                      {isToday ? '오늘' : selectedDayLabel}
                    </span>
                    <button
                      onClick={() => setLogDayIndex((i) => Math.max(0, i - 1))}
                      disabled={isToday}
                      className="w-7 h-7 rounded-full bg-black/5 text-[#1c1c1e] text-[13px] flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
                      aria-label="다음 날짜"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
              {logsForSelectedDay.length === 0 ? (
                <p className="text-center text-[#8e8e93] py-10 text-[15px]">접속 기록이 없어요</p>
              ) : (
                logsForSelectedDay.map((log, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between px-4 py-3.5 ${idx !== logsForSelectedDay.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
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
            </div>
          </div>,
        ]}
      </SwipeableViews>

      <TabBar items={tabsWithBadge} activeId={activeTab} onChange={setActiveTab} accentColor="#9333ea" />
      <Toast message={toast} visible={!!toast} onClose={() => setToast('')} />

      {viewingPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setViewingPhoto(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewingPhoto} alt="첨부 사진 크게 보기" className="max-w-full max-h-full rounded-2xl" />
        </div>
      )}
    </div>
  );
}
