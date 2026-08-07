// ===== firebase.js =====
// Multi-tenant Firebase API for Badminton Court Platform
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, getDoc, getDocFromServer, getDocsFromServer, doc,
  updateDoc, deleteDoc, query, where, orderBy, serverTimestamp,
  setDoc, onSnapshot, arrayUnion
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
  let snap;
  try {
    snap = await getDocsFromServer(q);
  } catch (e) {
    snap = await getDocs(q);
  }
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Lấy tất cả lịch đặt (dùng cho admin) */
export async function getAllBookings() {
  const q = query(bookingsCol(), orderBy('createdAt', 'desc'));
  let snap;
  try {
    snap = await getDocsFromServer(q);
  } catch (e) {
    snap = await getDocs(q);
  }
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Lấy danh sách lịch đặt của User */
export async function getUserBookings(userId) {
  if (!userId) return [];
  const q = query(bookingsCol(), where('userId', '==', userId));
  let snap;
  try {
    snap = await getDocsFromServer(q);
  } catch (e) {
    snap = await getDocs(q);
  }
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
      const defaultCourts = ['Sân 1', 'Sân 2', 'Sân 3'];
      return {
        courts: (settings.courts && settings.courts.length > 0) ? settings.courts : defaultCourts,
        startHour: settings.startHour ?? 7,
        endHour: settings.endHour ?? 23,
        priceNormal: settings.priceNormal ?? 80000,
        pricePeak: settings.pricePeak ?? 120000,
        peakStart: settings.peakStart ?? 17,
        peakEnd: settings.peakEnd ?? 20,
        notice: settings.notice || 'Sau khi gửi, chúng tôi sẽ liên hệ xác nhận trong vòng 15 phút. Vui lòng giữ máy!',
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
  return await setDoc(doc(db, 'courts', currentCourtSlug), {
    name: data.name || currentCourtSlug,
    slug: currentCourtSlug,
    status: 'active',
    settings: { ...data },
    updatedAt: serverTimestamp()
  }, { merge: true });
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

/** Dò tìm danh sách email của Chủ sân (Admin) và tất cả Nhân viên (Manager) dựa vào courtId (slug) */
export async function getCourtRecipientsBySlug(courtSlug) {
  const slug = courtSlug || currentCourtSlug;
  if (!slug) return [];

  const emailsSet = new Set();

  try {
    // 1. Dò từ document courts/{slug}
    const courtDoc = await getCourtInfo(slug);
    if (courtDoc) {
      if (courtDoc.settings && courtDoc.settings.contactEmail) {
        emailsSet.add(courtDoc.settings.contactEmail.trim());
      }
      if (courtDoc.email) emailsSet.add(courtDoc.email.trim());
      if (courtDoc.adminEmail) emailsSet.add(courtDoc.adminEmail.trim());
    }

    // 2. Dò từ collection 'users' với courtId == slug & role IN ['admin', 'manager']
    const qUsers = query(collection(db, 'users'), where('courtId', '==', slug));
    const usersSnap = await getDocs(qUsers);
    usersSnap.docs.forEach(docSnap => {
      const uData = docSnap.data();
      if (uData && (uData.role === 'admin' || uData.role === 'manager') && uData.email) {
        emailsSet.add(uData.email.trim());
      }
    });

    // 3. Dò từ collection 'registrations' với slug == slug & status == 'approved'
    const qReg = query(collection(db, 'registrations'), where('slug', '==', slug), where('status', '==', 'approved'));
    const regSnap = await getDocs(qReg);
    if (!regSnap.empty) {
      const regData = regSnap.docs[0].data();
      if (regData.email) emailsSet.add(regData.email.trim());
    }
  } catch (e) {
    console.error("Error looking up recipient emails for court:", slug, e);
  }

  return Array.from(emailsSet).filter(Boolean);
}

// Backward compatibility alias
export const getOwnerEmailByCourtId = getCourtRecipientsBySlug;

/** Gửi Email thông báo chung qua Formsubmit */
async function sendEmailViaFormsubmit(toEmail, subject, tableData) {
  return fetch('https://formsubmit.co/ajax/' + encodeURIComponent(toEmail), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      _subject: subject,
      _template: 'table',
      _captcha: 'false',
      _language: 'vi',
      ...tableData
    })
  }).then(() => {
    console.log('[Email] Đã gửi tới:', toEmail);
  }).catch(err => {
    console.error('[Email] Lỗi gửi tới:', toEmail, err);
  });
}

/** Gửi Email thông báo đặt sân mới tới Chủ Sân và tất cả Nhân Viên Quản Lý */
export async function sendBookingEmailNotification({ courtSlug, ownerEmail, recipientEmails, guestName, guestPhone, newBookings, totalAmount }) {
  let emails = recipientEmails;
  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    emails = ownerEmail ? (Array.isArray(ownerEmail) ? ownerEmail : [ownerEmail]) : [];
  }
  if (emails.length === 0) {
    console.warn('[Email] Không tìm thấy địa chỉ email người nhận cho sân:', courtSlug);
    return;
  }

  // Gom tất cả ngày duy nhất trong đơn đặt
  const uniqueDates = [...new Set(newBookings.map(b => b.date).filter(Boolean))];
  const dateDisplay = uniqueDates.join(', ');

  const courtName = (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.name) ? window.CONFIG.name : (courtSlug || 'Sân Cầu Lông');

  // Gom slot theo từng ngày để hiển thị rõ ràng
  const groupedByDate = {};
  newBookings.forEach(b => {
    const key = b.date || 'Không rõ ngày';
    if (!groupedByDate[key]) groupedByDate[key] = [];
    const courtTitle = (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.courts && window.CONFIG.courts[b.court]) ? window.CONFIG.courts[b.court] : `Sân ${b.court + 1}`;
    groupedByDate[key].push(`${courtTitle} ${String(b.hour).padStart(2, '0')}:00-${String(b.hour + 1).padStart(2, '0')}:00 (${String(b.amount).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ)`);
  });

  const itemsSummary = Object.entries(groupedByDate)
    .map(([date, slots]) => `[${date}] ${slots.join(' | ')}`)
    .join(' || ');

  const manageUrl = (typeof window !== 'undefined') ? `${window.location.protocol}//${window.location.host}/${courtSlug}/manage` : `https://dat-san-cau-long.web.app/${courtSlug}/manage`;

  const tableData = {
    'Tên Sân Cầu Lông': courtName,
    'Họ Và Tên Khách': guestName,
    'Số Điện Thoại Khách': guestPhone,
    'Ngày Đặt Sân': dateDisplay,
    'Chi Tiết Khung Giờ': itemsSummary,
    'Tổng Tiền Đơn Đặt': String(totalAmount).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' VNĐ',
    'Trạng Thái Đơn': 'Chờ xác nhận',
    'Đường Dẫn Quản Lý': manageUrl
  };

  const subject = `[Đặt Sân Mới] Khách hàng ${guestName} vừa đặt ${newBookings.length} khung giờ tại ${courtName}`;

  await Promise.allSettled(emails.map(email => sendEmailViaFormsubmit(email, subject, tableData)));
}

/** Gửi Email thông báo tới Super Admin khi có đơn đăng ký mở sân mới */
export async function sendNewRegistrationNotificationEmail({ regData }) {
  // Tìm email của Super Admin từ collection users hoặc dùng mặc định
  let superAdminEmail = 'namtv95.it@gmail.com';
  try {
    const userSnap = await getDoc(doc(db, 'users', SUPER_ADMIN_UID));
    if (userSnap.exists() && userSnap.data().email) {
      superAdminEmail = userSnap.data().email;
    }
  } catch (e) {
    console.warn('Cannot fetch super admin email, using fallback:', e);
  }

  const tableData = {
    'Thông Báo': 'Có đơn đăng ký mở sân mới cần duyệt trên hệ thống!',
    'Tên Sân': regData.courtName || regData.slug,
    'Họ Và Tên Chủ Sân': regData.displayName || regData.email,
    'Email Liên Hệ': regData.email,
    'Số Điện Thoại': regData.phone || 'Chưa cung cấp',
    'Địa Chỉ Sân': regData.address || 'Chưa cung cấp',
    'Slug URL Đường Dẫn': regData.slug,
    'Trang Duyệt Đơn': 'https://dat-san-cau-long.web.app/super-admin'
  };

  const subject = `[Đăng Ký Mở Sân Mới] Yêu cầu duyệt sân "${regData.courtName || regData.slug}" từ ${regData.displayName || regData.email}`;
  await sendEmailViaFormsubmit(superAdminEmail, subject, tableData);
}

/** Gửi Email thông báo tới Chủ Sân khi đơn đăng ký được duyệt */
export async function sendRegistrationApprovedEmail({ toEmail, displayName, courtName, courtSlug }) {
  if (!toEmail) return;
  const manageUrl = `https://dat-san-cau-long.web.app/${courtSlug}/manage`;
  const courtUrl  = `https://dat-san-cau-long.web.app/${courtSlug}`;
  const tableData = {
    'Xin Chào': displayName || 'Quý Khách',
    'Thông Báo': 'Đơn đăng ký mở sân cầu lông của bạn đã được HIỆU DƯỢT!',
    'Tên Sân Được Mở': courtName || courtSlug,
    'Đường Dẫn Trang Sân': courtUrl,
    'Trang Quản Lý Sân': manageUrl,
    'Hướng Dẫn': 'Hãy đăng nhập vào Trang Quản Lý để cài đặt thông tin sân, bảng giá và bắt đầu nhận đơn đặt sân!'
  };
  const subject = `[Sân Cầu Lông] Đơn đăng ký mở sân "${courtName || courtSlug}" đã được duyệt!`;
  await sendEmailViaFormsubmit(toEmail, subject, tableData);
}

// ===== USER ROLE API =====

/** Lấy thông tin role của user (đọc trực tiếp từ Firebase Firestore Server) */
export async function getUserRole(uid, email) {
  if (!uid) return null;
  const userRef = doc(db, 'users', uid);
  
  let snap;
  try {
    // Luôn đọc dữ liệu mới nhất 100% từ Firebase Server
    snap = await getDocFromServer(userRef);
  } catch (e) {
    snap = await getDoc(userRef);
  }

  let userData = snap.exists() ? snap.data() : null;

  if (userData && userData.role) {
    return userData;
  }

  const userEmail = email || (auth.currentUser && auth.currentUser.uid === uid ? auth.currentUser.email : null);

  try {
    // Fallback 1: Dò tìm trong collection 'courts' theo adminUid
    if (uid) {
      const qCourt = query(collection(db, 'courts'), where('adminUid', '==', uid));
      const cSnap = await getDocs(qCourt);
      if (!cSnap.empty) {
        const courtData = cSnap.docs[0].data();
        const roleInfo = {
          role: 'admin',
          courtId: cSnap.docs[0].id,
          managedCourts: [cSnap.docs[0].id],
          email: userEmail || ''
        };
        await setDoc(userRef, roleInfo, { merge: true });
        return { ...(userData || {}), ...roleInfo };
      }
    }

    if (userEmail) {
      // Fallback 2: Dò tìm trong collection 'users' theo email có chứa role
      const qUser = query(collection(db, 'users'), where('email', '==', userEmail.toLowerCase()));
      const uSnap = await getDocs(qUser);
      if (!uSnap.empty) {
        const existingUser = uSnap.docs[0].data();
        if (existingUser && existingUser.role) {
          const roleInfo = {
            role: existingUser.role,
            courtId: existingUser.courtId || null,
            managedCourts: existingUser.managedCourts || (existingUser.courtId ? [existingUser.courtId] : []),
            email: userEmail
          };
          await setDoc(userRef, roleInfo, { merge: true });
          return { ...(userData || {}), ...roleInfo };
        }
      }

      // Fallback 3: Dò tìm trong collection 'registrations' đã approved
      const qReg = query(collection(db, 'registrations'), where('email', '==', userEmail.toLowerCase()), where('status', '==', 'approved'));
      const rSnap = await getDocs(qReg);
      if (!rSnap.empty) {
        const regData = rSnap.docs[0].data();
        const roleInfo = {
          role: 'admin',
          courtId: regData.slug,
          managedCourts: [regData.slug],
          email: userEmail,
          courtName: regData.courtName
        };
        await setDoc(userRef, roleInfo, { merge: true });
        return { ...(userData || {}), ...roleInfo };
      }
    }
  } catch (e) {
    console.error('Self-healing getUserRole error:', e);
  }

  return userData;
}

/** Ghi nhận danh sách các sân mà tài khoản đã từng truy cập / sử dụng (dùng arrayUnion lưu thêm không đè) */
export async function trackUserCourtVisit(uid, courtSlug) {
  const slug = courtSlug || currentCourtSlug;
  if (!uid || !slug) return;
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      visitedCourts: arrayUnion(slug),
      lastVisitedCourt: slug,
      lastLoginAt: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.error("Error tracking user court visit:", e);
  }
}

/** Lưu/cập nhật thông tin user */
export async function setUserRole(uid, data) {
  const updateData = { ...data };
  if (data && data.courtId) {
    updateData.managedCourts = arrayUnion(data.courtId);
    updateData.visitedCourts = arrayUnion(data.courtId);
  }
  if (currentCourtSlug) {
    updateData.visitedCourts = arrayUnion(currentCourtSlug);
  }
  return await setDoc(doc(db, 'users', uid), updateData, { merge: true });
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

/** Lấy danh sách nhân viên (admin + manager) của sân */
export async function getCourtStaff(courtSlug) {
  const slug = courtSlug || currentCourtSlug;
  if (!slug) return [];
  try {
    const q = query(collection(db, 'users'), where('courtId', '==', slug));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(u => u.role === 'admin' || u.role === 'manager');
  } catch (e) {
    console.error('getCourtStaff error:', e);
    return [];
  }
}

/** Lấy danh sách khách hàng đã từng truy cập sân */
export async function getCourtCustomers(courtSlug) {
  const slug = courtSlug || currentCourtSlug;
  if (!slug) return [];
  try {
    const q = query(collection(db, 'users'), where('visitedCourts', 'array-contains', slug));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(u => !u.role || u.role === 'customer');
  } catch (e) {
    console.error('getCourtCustomers error:', e);
    return [];
  }
}

/** Thêm Manager theo email (tìm trong Firestore hoặc tạo placeholder nếu chưa có) */
export async function addManagerByEmail(email, courtSlug, courtName) {
  const slug = courtSlug || currentCourtSlug;
  if (!slug || !email) throw new Error('Thiếu email hoặc courtSlug');

  const normalizedEmail = email.trim().toLowerCase();

  // Tìm user theo email trong Firestore
  const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
  const snap = await getDocs(q);

  if (!snap.empty) {
    const userDoc = snap.docs[0];
    const userData = userDoc.data();
    const uid = userDoc.id;

    // Quy tắc: 1 tài khoản chỉ được phép quản lý tối đa 1 sân
    if (userData.role === 'admin') {
      throw new Error(`Tài khoản ${normalizedEmail} đã là Chủ sân (Admin) của một sân khác! Mỗi tài khoản chỉ được quản lý 1 sân.`);
    }
    if (userData.role === 'manager') {
      if (userData.courtId === slug || (userData.managedCourts && userData.managedCourts.includes(slug))) {
        throw new Error(`Tài khoản ${normalizedEmail} đã là Nhân viên (Manager) của sân này rồi!`);
      }
      throw new Error(`Tài khoản ${normalizedEmail} đã là Quản lý của sân "${userData.courtId || 'khác'}". Mỗi tài khoản chỉ được quản lý 1 sân!`);
    }

    // User chưa thuộc sân nào → cập nhật quyền manager
    await setDoc(doc(db, 'users', uid), {
      role: 'manager',
      courtId: slug,
      managedCourts: [slug],
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { uid, existed: true, email: normalizedEmail, ...userData };
  } else {
    // User chưa tồn tại → tạo placeholder với email
    const placeholderRef = doc(collection(db, 'users'));
    await setDoc(placeholderRef, {
      email: normalizedEmail,
      displayName: normalizedEmail.split('@')[0],
      role: 'manager',
      courtId: slug,
      managedCourts: [slug],
      isPlaceholder: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { uid: placeholderRef.id, existed: false, email: normalizedEmail };
  }
}

/** Xóa quyền Manager theo UID */
export async function removeManagerByUid(uid, courtSlug) {
  const slug = courtSlug || currentCourtSlug;
  if (!uid) throw new Error('Thiếu UID');
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('Không tìm thấy user');
  const data = snap.data();

  // Xóa slug khỏi managedCourts
  const newManagedCourts = (data.managedCourts || []).filter(c => c !== slug);

  // Nếu vẫn còn managed courts khác thì giữ role manager, ngược lại hạ về customer
  const newRole = newManagedCourts.length > 0 ? 'manager' : 'customer';
  const newCourtId = newManagedCourts.length > 0 ? newManagedCourts[0] : null;

  await setDoc(userRef, {
    role: newRole,
    courtId: newCourtId,
    managedCourts: newManagedCourts,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

/** Gửi Email mời Manager mới */
export async function sendManagerInviteEmail({ toEmail, managerName, courtName, courtSlug, addedByName }) {
  if (!toEmail) return;
  const manageUrl = `https://dat-san-cau-long.web.app/${courtSlug}/manage`;
  const courtUrl  = `https://dat-san-cau-long.web.app/${courtSlug}`;
  const tableData = {
    'Xin Chào': managerName || toEmail.split('@')[0],
    'Thông Báo': `Bạn đã được mời làm Nhân Viên Quản Lý tại sân cầu lông "${courtName || courtSlug}"!`,
    'Tên Sân': courtName || courtSlug,
    'Được Mời Bởi': addedByName || 'Chủ Sân',
    'Trang Sân (Khách)': courtUrl,
    'Trang Quản Lý (Nhân Viên)': manageUrl,
    'Hướng Dẫn': 'Hãy đăng nhập bằng tài khoản Google có email này để vào trang Quản Lý và bắt đầu làm việc!'
  };
  const subject = `[Lời Mời] Bạn được mời làm Nhân Viên tại sân "${courtName || courtSlug}"`;
  await sendEmailViaFormsubmit(toEmail, subject, tableData);
}

/** Kiểm tra user có quyền quản lý sân hiện tại không */
export async function checkStaffAccess(uid, email) {
  if (!uid || !currentCourtSlug) return false;
  const userEmail = email || (auth.currentUser && auth.currentUser.uid === uid ? auth.currentUser.email : null);
  const userData = await getUserRole(uid, userEmail);
  if (!userData) return false;
  if (userData.role === 'super_admin') return true;

  if (userData.role === 'admin' || userData.role === 'manager') {
    if (userData.courtId === currentCourtSlug) return true;
    if (Array.isArray(userData.managedCourts) && userData.managedCourts.includes(currentCourtSlug)) return true;
  }
  return false;
}

/** Kiểm tra user có phải admin của sân không */
export async function checkAdminAccess(uid, email) {
  if (!uid || !currentCourtSlug) return false;
  const userEmail = email || (auth.currentUser && auth.currentUser.uid === uid ? auth.currentUser.email : null);
  const userData = await getUserRole(uid, userEmail);
  if (!userData) return false;
  if (userData.role === 'super_admin') return true;
  if (userData.role === 'admin') {
    if (userData.courtId === currentCourtSlug) return true;
    if (Array.isArray(userData.managedCourts) && userData.managedCourts.includes(currentCourtSlug)) return true;
  }
  return false;
}

// ===== REGISTRATION API =====

/** Nộp đơn đăng ký sân mới */
export async function submitRegistration(data) {
  const regRef = await addDoc(collection(db, 'registrations'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp()
  });

  // Gửi Email thông báo đơn đăng ký mới tới Super Admin (chạy nền)
  sendNewRegistrationNotificationEmail({ regData: data }).catch(e => {
    console.error('[Email] Lỗi gửi thông báo đăng ký mới tới Super Admin:', e);
  });

  return regRef;
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
      courts: ['Sân 1', 'Sân 2', 'Sân 3'],
      startHour: 7,
      endHour: 23,
      priceNormal: 80000,
      pricePeak: 120000,
      peakStart: 17,
      peakEnd: 20,
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

  // Gửi Email thông báo đến Chủ Sân sau khi duyệt đơn
  if (email) {
    sendRegistrationApprovedEmail({
      toEmail: email,
      displayName: displayName || 'Quý Khách',
      courtName: courtName || slug,
      courtSlug: slug
    }).catch(e => console.error('[Email] Lỗi gửi mail duyệt đơn:', e));
  }
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
