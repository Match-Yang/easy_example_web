// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBVQe2tZ-LieqpPJ7lYV1UgFOKpFaALVwg",
  authDomain: "choui-zego-call.firebaseapp.com",
  projectId: "choui-zego-call",
  storageBucket: "choui-zego-call.appspot.com",
  messagingSenderId: "342421168483",
  appId: "1:342421168483:web:461ecd1a46fc0945553356",
  measurementId: "G-Y62X594ZRM",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
