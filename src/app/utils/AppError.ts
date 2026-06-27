// class AppError extends Error {
//   public data: null;
//   public success: boolean;

//   constructor(
//     public statusCode: number,
//     public message: string = 'Something went wrong!',
//     // public stack = ''
//     public meta: Record<string, unknown> = {},
//     // // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     // public errors: any[] = [],
//   ) {
//     super(message);
//     this.statusCode = statusCode;
//     this.data = null;
//     this.success = false;

//     this.meta = meta;
//     // this.errors = errors;

//     if (process.env.NODE_ENV === 'development') {
//       Error.captureStackTrace(this, this.constructor);
//     }
//   }
// }

// export default AppError;

// class AppError extends Error {
//   // ১. ক্লাসের প্রপার্টি ডিক্লেয়ারেশন:
//   // যখন আমরা কনস্ট্রাক্টরের ভেতরে 'public' কিওয়ার্ড ব্যবহার করি না, তখন এই ভেরিয়েবলগুলো উপরে আলাদাভাবে ডিক্লেয়ার করতে হয়।
//   public data: null = null;
//   public success: boolean = false;
//   public statusCode: number;
//   public meta: Record<string, unknown>;

//   constructor(
//     statusCode: number, // এটি একটি সাধারণ প্যারামিটার (প্যারামিটারের আগে 'public' নেই বলে এটি অটো-অ্যাসাইন হবে না, ম্যানুয়াল অ্যাসাইনমেন্ট করতে হবে)
//     // এখানে ডিফল্ট ভ্যালু সেট করা হয়েছে। যদি এরর থ্রো করার সময় কোনো মেসেজ না পাঠানো হয়,
//     // তবে এই ডিফল্ট মেসেজটই ব্যবহৃত হবে। এটি সরাসরি super() এ চলে যাবে বলে নিচে আর আলাদা করে assign করার দরকার নেই।
//     message: string = 'Something went wrong!',
//     meta: Record<string, unknown> = {}, // এটি একটি সাধারণ প্যারামিটার (প্যারামিটারের আগে 'public' নেই বলে এটি অটো-অ্যাসাইন হবে না, ম্যানুয়াল অ্যাসাইনমেন্ট করতে হবে)
//   ) {
//     // ২. মেইন Error ক্লাসকে মেসেজ পাঠানো
//     // আমরা যে মেসেজটি পাচ্ছি (বা ডিফল্ট যেটা আছে), সেটাকে super() এর মাধ্যমে মেইন Error ক্লাসে পাঠিয়ে দিচ্ছি।
//     // এর ফলে 'this.message = message' ম্যানুয়ালি আর লিখতে হয় না।
//     super(message);

//     // ৩. ম্যানুয়াল অ্যাসাইনমেন্ট (Manual Assignment):
//     // যদি আমরা প্যারামিটারে 'public' লিখতাম, তবে টাইপস্ক্রিপ্ট নিজে থেকেই 'this.statusCode = statusCode' করে নিত।
//     // যেহেতু আমরা তা করিনি, তাই এখানে ম্যানুয়ালি মানগুলো সেট করতে হচ্ছে।
//     this.statusCode = statusCode;
//     this.meta = meta;

//     // ৪. স্ট্যাটিক প্রপার্টি সেট করা:
//     // 'data' এবং 'success' আমরা কনস্ট্রাক্টর থেকে নিচ্ছি না কারণ এগুলো এররের ক্ষেত্রে সবসময় একই (null এবং false) থাকবে।
//     // উপরে ডিফল্ট ভ্যালু দেওয়া থাকলেও এখানে পুনরায় অ্যাসাইন করা নিশ্চিত করে যে অবজেক্টটি সবসময় সঠিক স্ট্রাকচার বজায় রাখবে।
//     this.data = null;
//     this.success = false;

//     // ৫. স্ট্যাক ট্রেস (Stack Trace):
//     // এররটি কোডের ঠিক কোন ফাইল এবং কত নম্বর লাইনে হয়েছে তা ট্র্যাকিং করার জন্য এটি ব্যবহার করা হয়।
//     // নিরাপত্তার খাতিরে এটি শুধুমাত্র 'development' এনভায়রনমেন্টে রান করা হয়।
//     if (process.env.NODE_ENV === 'development') {
//       Error.captureStackTrace(this, this.constructor);
//     }
//   }
// }

// export default AppError;

// ------------------------------   --------------------------------------

// class AppError extends Error {
//   // ১. ক্লাসের প্রপার্টি ডিক্লেয়ারেশন:
//   // এখানে সরাসরি ভ্যালু দেওয়া মানে হলো—এই ক্লাসের প্রতিটি অবজেক্ট এই মানগুলো নিয়েই জন্মাবে।
//   public data: null = null;
//   public success: boolean = false;

//   constructor(
//     // প্যারামিটারের আগে 'public' ব্যবহারের ফলে টাইপস্ক্রিপ্ট নিজে থেকেই 'statusCode' এবং 'meta' কে ক্লাসের প্রপার্টি হিসেবে ডিক্লেয়ার করে দিবে।
//     public statusCode: number,
//     message: string = 'Something went wrong!',
//     public meta: Record<string, unknown> = {},
//   ) {
//     // ২. মেইন Error ক্লাসকে মেসেজ পাঠানো
//     // এটি বিল্ট-ইন Error ক্লাসে মেসেজ সেট করে দেয়, তাই 'this.message = message' লিখতে হয় না।
//     super(message);

//     // ৩. অটো-অ্যাসাইনমেন্ট (Auto Assignment):
//     // যেহেতু আমরা কনস্ট্রাক্টরের প্যারামিটারে 'public' লিখেছি, তাই নিচে আর আলাদা করে:
//     // this.statusCode = statusCode; -- (এটি না দিলেও হয়)
//     // this.meta = meta; -- (এটি না দিলেও হয়)
//     // টাইপস্ক্রিপ্ট পর্দার আড়ালে এই অ্যাসাইনমেন্টগুলো নিজেই করে নেয়।

//     // ৪. স্ট্যাটিক প্রপার্টি নিশ্চিত করা:
//     // এমনকি 'data' এবং 'success' উপরে ডিক্লেয়ার করা আছে বলে সেগুলোও এখানে আর লিখতে হচ্ছে না।
//     // this.data = null; -- (এটি না দিলেও হয়)
//     // this.success = false; -- (এটি না দিলেও হয়)

//     // ৫. স্ট্যাক ট্রেস (Stack Trace):
//     if (process.env.NODE_ENV === 'development') {
//       Error.captureStackTrace(this, this.constructor);
//     }
//   }
// }

// export default AppError;

// class Example {
//   public statusCode: number; // ১. উপরে জায়গা খালি করলাম (Declaration)

//   constructor(statusCode: number) {
//     // ২. বাইরে থেকে ভ্যালু নিলাম (Parameter)
//     this.statusCode = statusCode; // ৩. হাত দিয়ে বক্সে ভ্যালু ভরলাম (Assignment)
//   }
// }

// class Example {
//   // ১. উপরে কিছু লিখতে হবে না
//   constructor(public statusCode: number) {
//     // ২. ও ৩. এখানেও কিছু লিখতে হবে না।
//     // টাইপস্ক্রিপ্ট নিজে থেকেই উপরে ড্রয়ার বানাবে এবং তাতে ভ্যালু ভরে দিবে।
//   }
// }

// ------------------------------   --------------------------------------

import config from '../config';

class AppError extends Error {
  public data: null = null;
  public success: boolean = false;

  constructor(
    public statusCode: number,
    message: string = 'Something went wrong!',
    public meta: Record<string, unknown> = {},
  ) {
    super(message);

    // Development মোডে স্ট্যাক ট্রেস ক্যাপচার করার জন্য
    if (config.NODE_ENV === 'development') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;

// constructor(public statusCode: number) {
//   // এখানে টাইপস্ক্রিপ্ট জানে যে statusCode একটি আলাদা জিনিস।
//   // সে অটোমেটিক this.statusCode = statusCode; করে দেয়।
// }

// ------------------------------   --------------------------------------

// class AppError extends Error {
//   public data: null = null;
//   public success: boolean = false;
//   public statusCode: number;
//   public meta: Record<string, unknown>;

//   constructor({
//     statusCode,
//     message = 'Something went wrong!',
//     meta = {},
//   }: {
//     statusCode: number;
//     message?: string;
//     meta?: Record<string, unknown>;
//   }) {
//     super(message);
//     this.statusCode = statusCode;
//     this.meta = meta;

//     if (process.env.NODE_ENV === 'development') {
//       Error.captureStackTrace(this, this.constructor);
//     }
//   }
// }

// export default AppError;

// constructor({ statusCode }: { statusCode: number }) {
//   // এখানে 'public' লেখার কোনো জায়গা নেই।
//   // তাই আপনাকে ম্যানুয়ালি উপরে ডিক্লেয়ার করে ভেতরে অ্যাসাইন করতে হবে।
// }

// ------------------------------   --------------------------------------
