import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyDOaeidMvCEiDoKSCE3QStc-RI7k0zFVOg",
  authDomain: "yaran-translator.firebaseapp.com",
  projectId: "yaran-translator",
  storageBucket: "yaran-translator.firebasestorage.app",
  messagingSenderId: "187515605080",
  appId: "1:187515605080:web:aa5e8a781bab29950d7a2d",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function handleAuthError(code) {
  const map = {
    "auth/weak-password": "The password provided is too weak.",
    "auth/email-already-in-use": "An account already exists for that email.",
    "auth/user-not-found": "No user found for that email.",
    "auth/wrong-password": "Wrong password provided.",
    "auth/invalid-email": "The email address is not valid.",
    "auth/user-disabled": "This user account has been disabled.",
    "auth/too-many-requests": "Too many requests. Please try again later.",
    "auth/invalid-credential": "Invalid email or password.",
  };
  return map[code] || "An error occurred. Please try again.";
}

export async function signIn(email, password) {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    throw new Error(handleAuthError(e.code));
  }
}

export async function register(email, password, name) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    return cred;
  } catch (e) {
    throw new Error(handleAuthError(e.code));
  }
}

export async function logout() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export { auth };