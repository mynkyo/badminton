// ===== firebase.js =====
// Multi-tenant Firebase API for Badminton Court Platform
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, getDoc, doc,
  updateDoc, deleteDoc, query, where, orderBy, serverTimestamp,
  setDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential,
  signOut, onAuthStateChanged, signInAnonymously, linkWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ===== CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyDBrWAhDiMHRD-T0daNSvJPP1MHuL7QmNg",
  authDomain: "badminton-20d52.firebaseapp.com",
  projectId: "badminton-20d52",
  storageBucket: "badminton-20d52.firebasestorage.app",
  messagingSenderId: "111258987522",
  appId: "1:111258987522:web:2e1e7e9a8a0134d03b0b1b",
  measurementId: "G-CZ9VE482YX"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ===== SUPER ADMIN CONFIG =====
export const SUPER_ADMIN_UID = 'kxPAhAAG4rOK432QLoLFOgWcgwq2';

// ===== MULTI-TENANT CONTEXT =====
let currentCourtSlug = null;

/** Đặt court slug hiện tại (gọi ngay đầu mỗi trang) */
export function setCurrentCourt(slug) {
  currentCourtSlug = slug;
}

/** Lấy court slug từ URL path */
export function getCourtSlug() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[0] || null;
}

/** Lấy đường dẫn collection bookings */
function bookingsCol() {
  if (!currentCourtSlug) throw new Error('Court slug chua duoc dat');
  return collection(db, 'courts', currentCourtSlug, 'bookings');
}

// ===== BOOKINGS API =====

/** Lấy lịch đặt theo ngày */
export async function getBookingsByDate(date) {
  const q = query(bookingsCol(), where('date', '==', date));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Lấy tất cả lịch đặt (dùng cho admin) */
export async function getAllBookings() {
  const q = query(bookingsCol(), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Lấy danh sách lịch đặt của User */
export async function getUserBookings(userId) {
  if (!userId) return [];
  const q = query(bookingsCol(), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Thêm một hoặc nhiều lịch đặt (batch) */
export async function addBookings(bookingsArray) {
  const results = [];
  for (const data of bookingsArray) {
    const ref = await addDoc(bookingsCol(), {
      ...data,
      createdAt: serverTimestamp()
    });
    results.push(ref.id);
  }
  return results;
}

/** Cập nhật lịch đặt */
export async function updateBooking(id, data) {
  return await updateDoc(doc(db, 'courts', currentCourtSlug, 'bookings', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

/** Xóa lịch đặt */
export async function deleteBooking(id) {
  return await deleteDoc(doc(db, 'courts', currentCourtSlug, 'bookings', id));
}

// ===== SETTINGS API =====

/** Lấy cấu hình sân từ Firestore */
export async function getSettings() {
  try {
    if (!currentCourtSlug) return null;
    const snap = await getDoc(doc(db, 'courts', currentCourtSlug));
    if (snap.exists()) {
      const data = snap.data();
      return data.settings || null;
    }
    return null;
  } catch (e) {
    console.error("Error fetching settings:", e);
    return null;
  }
}

/** Lắng nghe thay đổi cấu hình thời gian thực */
export function onSettingsChange(callback) {
  if (!currentCourtSlug) return () => {};
  return onSnapshot(doc(db, 'courts', currentCourtSlug), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.settings) callback(data.settings);
    }
  });
}

/** Lưu cấu hình sân vào Firestore */
export async function saveSettings(data) {
  if (!currentCourtSlug) throw new Error('Court slug chua duoc dat');
  return await updateDoc(doc(db, 'courts', currentCourtSlug), {
    settings: { ...data },
    updatedAt: serverTimestamp()
  });
}

// ===== COURT API =====

/** Lấy thông tin sân */
export async function getCourtInfo(slug) {
  const s = slug || currentCourtSlug;
  if (!s) return null;
  const snap = await getDoc(doc(db, 'courts', s));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Lấy tất cả sân active (dùng cho landing page) */
export async function getAllActiveCourts() {
  const q = query(collection(db, 'courts'), where('status', '==', 'active'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Tạo sân mới (super_admin dùng khi duyệt đơn) */
export async function createCourt(slug, courtData) {
  return await setDoc(doc(db, 'courts', slug), {
    ...courtData,
    slug,
    status: 'active',
    createdAt: serverTimestamp()
  });
}

/** Cập nhật trạng thái sân */
export async function updateCourtStatus(slug, status) {
  return await updateDoc(doc(db, 'courts', slug), { status, updatedAt: serverTimestamp() });
}

// ===== USER ROLE API =====

/** Lấy thông tin role của user */
export async function getUserRole(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

/** Lưu/cập nhật thông tin user */
export async function setUserRole(uid, data) {
  return await setDoc(doc(db, 'users', uid), data, { merge: true });
}

/** Kiểm tra user có quyền quản lý sân hiện tại không */
export async function checkStaffAccess(uid) {
  if (!uid || !currentCourtSlug) return false;
  if (uid === SUPER_ADMIN_UID) return true;
  const userData = await getUserRole(uid);
  if (!userData) return false;
  return (userData.role === 'admin' || userData.role === 'manager')
    && userData.courtId === currentCourtSlug;
}

/** Kiểm tra user có phải admin của sân không */
export async function checkAdminAccess(uid) {
  if (!uid || !currentCourtSlug) return false;
  if (uid === SUPER_ADMIN_UID) return true;
  const userData = await getUserRole(uid);
  if (!userData) return false;
  return userData.role === 'admin' && userData.courtId === currentCourtSlug;
}

// ===== REGISTRATION API =====

/** Nộp đơn đăng ký sân mới */
export async function submitRegistration(data) {
  return await addDoc(collection(db, 'registrations'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp()
  });
}

/** Lấy tất cả đơn đăng ký (super_admin) */
export async function getAllRegistrations(status) {
  let q = collection(db, 'registrations');
  if (status) q = query(q, where('status', '==', status));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Duyệt đơn đăng ký: tạo court + set role admin */
export async function approveRegistration(regId, regData) {
  const { slug, uid, email, displayName, courtName, phone, address, description } = regData;
  await createCourt(slug, {
    name: courtName,
    adminUid: uid,
    managerUids: [],
    phone,
    address,
    description,
    settings: {}
  });
  await setUserRole(uid, {
    role: 'admin',
    courtId: slug,
    email,
    displayName,
    updatedAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'registrations', regId), {
    status: 'approved',
    approvedAt: serverTimestamp()
  });
}

/** Từ chối đơn đăng ký */
export async function rejectRegistration(regId, reason) {
  return await updateDoc(doc(db, 'registrations', regId), {
    status: 'rejected',
    rejectedAt: serverTimestamp(),
    rejectReason: reason || ''
  });
}

// ===== AUTH API =====

/** Đăng nhập ẩn danh (tự động cho khách) */
export async function loginAnonymously() {
  return await signInAnonymously(auth);
}

/** Đăng nhập Google (và đồng bộ nếu đang ẩn danh) */
export async function loginWithGoogle() {
  const user = auth.currentUser;
  if (user && user.isAnonymous) {
    try {
      const result = await linkWithPopup(user, googleProvider);
      return result.user;
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        throw error;
      }
      try {
        const credential = GoogleAuthProvider.credentialFromError(error);
        if (credential) {
          const result = await signInWithCredential(auth, credential);
          return result.user;
        }
      } catch (e) { /* ignore */ }
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }
  } else {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }
}

/** Đăng xuất */
export async function logoutUser() {
  return await signOut(auth);
}

/** Lắng nghe trạng thái đăng nhập */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

