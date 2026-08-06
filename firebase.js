// ===== firebase.js =====
// Import Firebase SDK (ES Module via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  signOut, onAuthStateChanged
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

// ===== BOOKINGS API =====

/** Lấy lịch đặt theo ngày */
export async function getBookingsByDate(date) {
  const q = query(collection(db, 'bookings'), where('date', '==', date));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Lấy tất cả lịch đặt (dùng cho admin) */
export async function getAllBookings() {
  const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Thêm một hoặc nhiều lịch đặt (batch) */
export async function addBookings(bookingsArray) {
  const results = [];
  for (const data of bookingsArray) {
    const ref = await addDoc(collection(db, 'bookings'), {
      ...data,
      createdAt: serverTimestamp()
    });
    results.push(ref.id);
  }
  return results;
}

/** Cập nhật lịch đặt */
export async function updateBooking(id, data) {
  return await updateDoc(doc(db, 'bookings', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

/** Xóa lịch đặt */
export async function deleteBooking(id) {
  return await deleteDoc(doc(db, 'bookings', id));
}

// ===== SETTINGS API =====

/** Lấy cấu hình thông tin sân từ Firestore (nếu chưa có trả về null) */
export async function getSettings() {
  try {
    const docRef = doc(db, 'settings', 'config');
    const snap = await getDocs(query(collection(db, 'settings')));
    const configDoc = snap.docs.find(d => d.id === 'config');
    return configDoc ? configDoc.data() : null;
  } catch (e) {
    console.error("Error fetching settings:", e);
    return null;
  }
}

/** Lưu cấu hình sân vào Firestore document settings/config */
export async function saveSettings(data) {
  const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  return await setDoc(doc(db, 'settings', 'config'), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

// ===== AUTH API =====

/** Đăng nhập Google */
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/** Đăng xuất */
export async function logoutUser() {
  return await signOut(auth);
}

/** Lắng nghe trạng thái đăng nhập (gọi 1 lần khi load trang) */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
