// ===== firebase.js =====
// Multi-tenant Firebase API for Badminton Court Platform
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, getDoc, getDocFromServer, doc,
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

/** Lấy court slug từ URL path hoặc query parameter */
export function getCourtSlug() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramSlug = urlParams.get('slug') || urlParams.get('court');
  if (paramSlug) return paramSlug;

  const parts = window.location.pathname.split('/').filter(Boolean);
  const first = parts[0] ? parts[0].replace('.html', '') : null;
  
  // Tránh nhầm lẫn các trang tĩnh hệ thống làm court slug khi mở local file HTML
  const systemPages = ['index', 'register', 'super-admin', 'manage', 'court', 'login', 'migrate'];
  if (first && !systemPages.includes(first)) {
    return first;
  }
  return null;
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
      const settings = data.settings || {};
      return {
        ...settings,
        name: settings.name || data.name || '',
        phone: settings.phone || data.phone || '',
        address: settings.address || data.address || '',
        description: settings.description || data.description || ''
      };
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

// ===== USER ROLE API =====

/** Lấy thông tin role của user (tự động đồng bộ quyền theo email, đơn đăng ký hoặc thông tin sân nếu UID bị thay đổi) */
export async function getUserRole(uid, email) {
  if (!uid) return null;
  const userRef = doc(db, 'users', uid);
  
  let snap;
  try {
    // Đọc trực tiếp từ Server để bỏ qua Cache cũ của trình duyệt
    snap = await getDocFromServer(userRef);
  } catch (e) {
    snap = await getDoc(userRef);
  }

  let userData = snap.exists() ? snap.data() : null;

  if (userData && userData.role && userData.courtId) {
    return userData;
  }

  const userEmail = email || (auth.currentUser && auth.currentUser.uid === uid ? auth.currentUser.email : null);
  if (!userEmail) return userData;

  try {
    // Fallback 1: Dò tìm trong collection 'users' xem email này đã từng có quyền ở UID khác chưa
    const qUser = query(collection(db, 'users'), where('email', '==', userEmail));
    const userSnap = await getDocs(qUser);
    const matchedUserDoc = userSnap.docs.find(d => d.id !== uid && d.data() && d.data().role && d.data().courtId);

    if (matchedUserDoc) {
      const roleInfo = {
        role: matchedUserDoc.data().role,
        courtId: matchedUserDoc.data().courtId,
        email: userEmail,
        updatedAt: serverTimestamp()
      };
      await setDoc(userRef, roleInfo, { merge: true });
      return { ...(userData || {}), ...roleInfo };
    }

    // Fallback 2: Dò tìm trong đơn đăng ký 'registrations' đã duyệt theo email
    const qReg = query(collection(db, 'registrations'), where('email', '==', userEmail), where('status', '==', 'approved'));
    const regSnap = await getDocs(qReg);
    if (!regSnap.empty) {
      const regData = regSnap.docs[0].data();
      if (regData.slug) {
        const roleInfo = {
          role: 'admin',
          courtId: regData.slug,
          email: userEmail,
          updatedAt: serverTimestamp()
        };
        await setDoc(userRef, roleInfo, { merge: true });
        return { ...(userData || {}), ...roleInfo };
      }
    }

    // Fallback 3: Dò tìm trong collection 'courts' nơi adminUid == uid
    const qCourt = query(collection(db, 'courts'), where('adminUid', '==', uid));
    const courtSnap = await getDocs(qCourt);
    if (!courtSnap.empty) {
      const courtDoc = courtSnap.docs[0];
      const roleInfo = {
        role: 'admin',
        courtId: courtDoc.id,
        email: userEmail,
        updatedAt: serverTimestamp()
      };
      await setDoc(userRef, roleInfo, { merge: true });
      return { ...(userData || {}), ...roleInfo };
    }

  } catch (e) {
    console.error('Self-healing getUserRole error:', e);
  }

  return userData;
}

/** Lưu/cập nhật thông tin user */
export async function setUserRole(uid, data) {
  return await setDoc(doc(db, 'users', uid), data, { merge: true });
}

/** Lấy toàn bộ người dùng (Super Admin) */
export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

/** Cập nhật quyền người dùng (Super Admin) */
export async function updateUserRole(uid, roleData) {
  return await updateDoc(doc(db, 'users', uid), roleData);
}

/** Kiểm tra user có quyền quản lý sân hiện tại không */
export async function checkStaffAccess(uid, email) {
  if (!uid || !currentCourtSlug) return false;
  if (uid === SUPER_ADMIN_UID) return true;
  const userEmail = email || (auth.currentUser && auth.currentUser.uid === uid ? auth.currentUser.email : null);
  const userData = await getUserRole(uid, userEmail);
  if (!userData) return false;
  return (userData.role === 'admin' || userData.role === 'manager')
    && userData.courtId === currentCourtSlug;
}

/** Kiểm tra user có phải admin của sân không */
export async function checkAdminAccess(uid, email) {
  if (!uid || !currentCourtSlug) return false;
  if (uid === SUPER_ADMIN_UID) return true;
  const userEmail = email || (auth.currentUser && auth.currentUser.uid === uid ? auth.currentUser.email : null);
  const userData = await getUserRole(uid, userEmail);
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
    name: courtName || '',
    adminUid: uid,
    managerUids: [],
    phone: phone || '',
    address: address || '',
    description: description || '',
    settings: {
      name: courtName || '',
      phone: phone || '',
      address: address || '',
      description: description || '',
      notice: 'Sau khi gửi, chúng tôi sẽ liên hệ xác nhận trong vòng 15 phút. Vui lòng giữ máy!'
    }
  });
  await setUserRole(uid, {
    role: 'admin',
    courtId: slug,
    email: email || '',
    displayName: displayName || '',
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

async function syncUserToFirestore(user) {
  if (!user) return;
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    lastLoginAt: serverTimestamp()
  }, { merge: true });
}

/** Đăng nhập Google (và đồng bộ nếu đang ẩn danh) */
export async function loginWithGoogle() {
  const user = auth.currentUser;
  if (user && user.isAnonymous) {
    try {
      const result = await linkWithPopup(user, googleProvider);
      await syncUserToFirestore(result.user);
      return result.user;
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        throw error;
      }
      try {
        const credential = GoogleAuthProvider.credentialFromError(error);
        if (credential) {
          const result = await signInWithCredential(auth, credential);
          await syncUserToFirestore(result.user);
          return result.user;
        }
      } catch (e) { /* ignore */ }
      const result = await signInWithPopup(auth, googleProvider);
      await syncUserToFirestore(result.user);
      return result.user;
    }
  } else {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserToFirestore(result.user);
    return result.user;
  }
}

/** Đăng xuất */
export async function logoutUser() {
  return await signOut(auth);
}

/** Lắng nghe trạng thái đăng nhập */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    if (user && !user.isAnonymous) {
      // Background sync cho user đã đăng nhập từ trước
      syncUserToFirestore(user).catch(e => console.error('Sync user error:', e));
    }
    callback(user);
  });
}
