/**
 * Bilingual (Arabic / English) string table for Enjazaty.
 * Arabic is the primary language (RTL-first), English is the LTR fallback.
 */

export type Language = 'ar' | 'en';

export const translations = {
  ar: {
    appName: 'إنجازاتي',
    tagline: 'مساحتك الذكية لإدارة الإنجازات',

    // Language screen
    chooseLanguage: 'اختر اللغة',
    arabic: 'العربية',
    english: 'الإنجليزية',
    continue: 'متابعة',

    // Auth
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    fullName: 'الاسم الكامل',
    confirmPassword: 'تأكيد كلمة المرور',
    forgotPassword: 'نسيت كلمة المرور؟',
    noAccount: 'ليس لديك حساب؟',
    haveAccount: 'لديك حساب بالفعل؟',
    userType: 'نوع المستخدم',
    admin: 'مسؤول',
    employee: 'موظف',
    jobTitle: 'المسمى الوظيفي',
    phone: 'رقم الجوال',
    department: 'القسم',
    completeProfile: 'استكمال الملف الوظيفي',
    loggingIn: 'جاري تسجيل الدخول...',
    creatingAccount: 'جاري إنشاء الحساب...',

    // Bottom navigation
    workspace: 'مساحة العمل',
    files: 'الملفات',
    activity: 'النشاط',
    notifications: 'الإشعارات',
    analytics: 'التحليلات',
    account: 'الحساب',

    // Workspace / home
    welcome: 'مرحباً',
    yourUserId: 'معرّف المستخدم',
    quickActions: 'إجراءات سريعة',
    addAchievement: 'إضافة إنجاز',
    myAchievements: 'إنجازاتي',
    manageEmployees: 'إدارة الموظفين',
    createFolder: 'إنشاء مجلد',
    recentAchievements: 'أحدث الإنجازات',
    noAchievements: 'لا توجد إنجازات بعد',
    stats: 'إحصائيات',
    total: 'الإجمالي',
    approved: 'معتمد',
    pending: 'قيد المراجعة',

    // Files / folders
    foldersAndFiles: 'المجلدات والملفات',
    newFolder: 'مجلد جديد',
    folderName: 'اسم المجلد',
    folderDescription: 'وصف المجلد',
    emptyFolders: 'لا توجد مجلدات. أنشئ أول مجلد لك.',
    open: 'فتح',

    // Achievement
    achievement: 'إنجاز',
    achievementTitle: 'عنوان الإنجاز',
    achievementDescription: 'وصف الإنجاز',
    achievementDate: 'تاريخ الإنجاز',
    selectFolder: 'اختر مجلداً',
    attachments: 'المرفقات',
    addImage: 'إضافة صورة',
    addVideo: 'إضافة فيديو',
    addFile: 'إضافة ملف',
    addLink: 'إضافة رابط',
    addVoiceNote: 'ملاحظة صوتية',
    linkUrl: 'رابط (URL)',
    save: 'حفظ',
    saving: 'جاري الحفظ...',
    details: 'التفاصيل',
    status: 'الحالة',
    draft: 'مسودة',
    submitted: 'مُرسل',
    rejected: 'مرفوض',
    submitForReview: 'إرسال للمراجعة',
    delete: 'حذف',
    edit: 'تعديل',

    // Employees
    employees: 'الموظفون',
    addEmployee: 'إضافة موظف',
    employeeProfile: 'ملف الموظف',
    noEmployees: 'لا يوجد موظفون بعد',
    viewProfile: 'عرض الملف',
    achievementsCount: 'عدد الإنجازات',

    // Notes & evaluation
    notesAndEvaluation: 'الملاحظات والتقييم',
    notes: 'الملاحظات',
    addNote: 'إضافة ملاحظة',
    textNote: 'ملاحظة نصية',
    voiceNote: 'ملاحظة صوتية',
    imageNote: 'صورة',
    sticker: 'ملصق تشجيعي',
    evaluation: 'التقييم',
    rating: 'التقييم',
    comment: 'تعليق',
    submitEvaluation: 'إرسال التقييم',
    noNotes: 'لا توجد ملاحظات',

    // Notifications
    noNotifications: 'لا توجد إشعارات',
    markAllRead: 'تعليم الكل كمقروء',

    // Account
    settings: 'الإعدادات',
    profile: 'الملف الشخصي',
    language: 'اللغة',
    logout: 'تسجيل الخروج',
    role: 'الدور',
    save_changes: 'حفظ التغييرات',
    darkInfo: 'معلومات الحساب',

    // Generic
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    success: 'تم بنجاح',
    required: 'هذا الحقل مطلوب',
    retry: 'إعادة المحاولة',
    add: 'إضافة',
    close: 'إغلاق',
    search: 'بحث',

    // Account rules
    emailAlreadyRegistered:
      'هذا البريد الإلكتروني مسجّل مسبقاً. كل بريد يُسجَّل بصفة واحدة فقط (موظف أو مسؤول) — للتسجيل بصفة جديدة استخدم بريداً إلكترونياً آخر.',

    // Org tree
    workspaceEmployees: 'الموظفون في مساحة عمله',

    // Embedded document editor
    docEditorTitle: 'تحرير المستند',
    docEditorHint: 'التعديلات تُحفظ تلقائياً في نفس الملف',
    docEditorLoading: 'جاري فتح المستند…',
    docEditorReady: 'المستند جاهز للتحرير',
    docEditorOpenTab: 'فتح المحرر الآن',
    docEditorTabHint:
      'سيُفتح المحرر في تبويب جديد. عدّل المستند ثم أغلق التبويب وارجع إلى التطبيق — التعديلات تُحفظ تلقائياً في نفس الملف.',

    // Role selection screen
    chooseUserType: 'اختر نوع المستخدم',
    chooseUserTypeHint: 'حدّد دورك للمتابعة',
    adminDesc: 'إدارة الموظفين والتقييم ومتابعة الإنجازات',
    employeeDesc: 'إدارة إنجازاتك ومساحة عملك',

    // OTP verification
    verifyEmail: 'تأكيد البريد الإلكتروني',
    otpSentTo: 'أرسلنا رمز تحقّق إلى',
    enterOtp: 'أدخل رمز التحقق',
    otpCode: 'رمز التحقق',
    verify: 'تحقّق',
    verifying: 'جاري التحقق...',
    resendOtp: 'إعادة إرسال الرمز',
    otpInvalid: 'الرمز غير صحيح أو منتهي',

    // Complete profile
    completeYourProfile: 'استكمال البيانات',
    educationalRegion: 'المنطقة التعليمية',
    selectRegion: 'اختر المنطقة التعليمية',
    workCenter: 'مركز العمل',
    administration: 'الإدارة التابع لها',
    saveAndContinue: 'حفظ ومتابعة',

    // Home / dates
    birthDate: 'التاريخ',
    addAchievementType: 'إضافة إنجاز',
    typeFolder: 'مجلد',
    typeFile: 'ملف',
    typeImage: 'صورة',
    typeVideo: 'فيديو',

    // Members / supervisions
    members: 'الأعضاء',
    viewMembers: 'عرض الأعضاء',
    membersHint: 'المسؤولون الذين يمكنهم مشاهدة صفحتك',
    noMembers: 'لا يوجد أعضاء بعد',
    addByUserId: 'الإضافة عبر معرّف المستخدم',
    enterUserId: 'أدخل معرّف المستخدم',
    classification: 'التصنيف',
    placeInWorkspace: 'مساحة العمل (الرئيسية)',
    placeInFolder: 'داخل مجلد',
    userNotFound: 'لم يتم العثور على مستخدم بهذا المعرّف',
    employeeAdded: 'تمت إضافة الموظف',

    // Evaluation / signature
    eSignature: 'التوقيع الإلكتروني',
    signHint: 'اكتب اسمك الكامل كتوقيع',
    evaluationLocked: 'تم اعتماد التقييم',
    evaluationLockedHint: 'هذا التقييم معتمد ولا يمكن تعديله',
    evaluationReport: 'تقرير التقييم',
    evaluatedBy: 'المُقيّم',
    cannotEvaluateOwn: 'لا يمكنك تقييم ملفاتك الشخصية',

    // Account
    privacy: 'الخصوصية',
    changePhoto: 'تغيير الصورة الشخصية',
    copied: 'تم النسخ',
    copy: 'نسخ',

    // Search
    searchHint: 'ابحث في الإنجازات والموظفين',
    noResults: 'لا توجد نتائج',

    // Folders
    folders: 'المجلدات',
    folderContents: 'محتويات المجلد',
    emptyFolder: 'هذا المجلد فارغ',
    addToFolder: 'إضافة إنجاز للمجلد',
    moveToFolder: 'نقل إلى مجلد',
    noFolder: 'بدون مجلد',
    moved: 'تم النقل',
    employeeFolders: 'مجلدات الموظف',
    subFolders: 'المجلدات الفرعية',
    addSubFolder: 'إضافة مجلد فرعي',
    addItem: 'إضافة',
    fromLibrary: 'من مكتبة الصور',
    fromCamera: 'التقاط صورة بالكاميرا',
    fromFiles: 'من الملفات',
    developedBy: 'تطوير: هنادي المري',
    moveTo: 'نقل إلى',
    deleteFolderConfirm: 'حذف هذا المجلد؟',
    longPressHint: 'اضغط مطولاً للتعديل',
    rename: 'إعادة تسمية',
    newName: 'الاسم الجديد',

    // About app
    aboutApp: 'حول التطبيق',
    termsOfUse: 'شروط الاستخدام',
    privacyPolicy: 'سياسة الخصوصية',
    contactUs: 'تواصل معنا',
    version: 'الإصدار',

    // Contact form
    contactHeader: 'نسعد بتواصلكم',
    contactDesc:
      'شاركنا اقتراحاتك أو ملاحظاتك حول تطبيق إنجازاتي. نقرأ كل رسالة ونحرص على الرد في أقرب وقت.',
    yourSuggestion: 'اقتراحك أو ملاحظتك',
    writeMessageHere: 'اكتب رسالتك هنا...',
    send: 'إرسال',
    messageSent: 'تم إرسال رسالتك، شكراً لك!',

    // Delete account
    deleteAccount: 'حذف الحساب',
    deleteAccountConfirm:
      'هل أنت متأكد من حذف حسابك؟ سيتم حذف جميع بياناتك نهائياً ولا يمكن التراجع.',

    // Reports
    reports: 'التقارير',
    myReport: 'تقرير إنجازاتي',
    generateReport: 'إعداد تقرير',
    printReport: 'طباعة',
    share: 'مشاركة',
    reportFor: 'تقرير الإنجازات الخاص بـ',
    reportDate: 'تاريخ التقرير',
    noData: 'لا توجد بيانات',

    // Signature pad
    drawSignature: 'وقّع هنا',
    clear: 'مسح',
    signatureRequired: 'التوقيع مطلوب',

    // Saved signatures library
    signatures: 'التواقيع',
    mySignatures: 'تواقيعي',
    savedSignatures: 'التواقيع المحفوظة',
    newSignature: 'توقيع جديد',
    saveSignature: 'حفظ التوقيع',
    drawNew: 'رسم جديد',
    useSaved: 'توقيع محفوظ',
    noSignatures: 'لا توجد تواقيع محفوظة',
    signatureName: 'اسم التوقيع (اختياري)',
    selectSignature: 'اختر توقيعاً',
    signaturesHint: 'أنشئ تواقيعك بالإصبع أو القلم لاستخدامها في الاعتماد',

    // Document markup / approval
    signDocument: 'اعتماد بالتوقيع',
    approveDocument: 'اعتماد المستند',
    approve: 'اعتماد',
    dragToPlace: 'حرّك التوقيع، واستخدم المقبض للتكبير والتدوير',
    saving_doc: 'جاري الاعتماد...',
    pdfSignNote: 'اعتماد ملفات PDF قيد التطوير — يمكنك اعتماد الصور حالياً',
    signedDocument: 'مستند موقّع',

    // Folder employees
    folderEmployees: 'الموظفون في المجلد',
  },

  en: {
    appName: 'Enjazaty',
    tagline: 'Your smart workspace for achievements',

    chooseLanguage: 'Choose language',
    arabic: 'Arabic',
    english: 'English',
    continue: 'Continue',

    login: 'Log in',
    signup: 'Sign up',
    email: 'Email',
    password: 'Password',
    fullName: 'Full name',
    confirmPassword: 'Confirm password',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    userType: 'User type',
    admin: 'Admin',
    employee: 'Employee',
    jobTitle: 'Job title',
    phone: 'Phone number',
    department: 'Department',
    completeProfile: 'Complete your profile',
    loggingIn: 'Logging in...',
    creatingAccount: 'Creating account...',

    workspace: 'Workspace',
    files: 'Files',
    activity: 'Activity',
    notifications: 'Notifications',
    analytics: 'Analytics',
    account: 'Account',

    welcome: 'Welcome',
    yourUserId: 'User ID',
    quickActions: 'Quick actions',
    addAchievement: 'Add achievement',
    myAchievements: 'My achievements',
    manageEmployees: 'Manage employees',
    createFolder: 'Create folder',
    recentAchievements: 'Recent achievements',
    noAchievements: 'No achievements yet',
    stats: 'Statistics',
    total: 'Total',
    approved: 'Approved',
    pending: 'Pending',

    foldersAndFiles: 'Folders & files',
    newFolder: 'New folder',
    folderName: 'Folder name',
    folderDescription: 'Folder description',
    emptyFolders: 'No folders yet. Create your first folder.',
    open: 'Open',

    achievement: 'Achievement',
    achievementTitle: 'Achievement title',
    achievementDescription: 'Achievement description',
    achievementDate: 'Achievement date',
    selectFolder: 'Select a folder',
    attachments: 'Attachments',
    addImage: 'Add image',
    addVideo: 'Add video',
    addFile: 'Add file',
    addLink: 'Add link',
    addVoiceNote: 'Voice note',
    linkUrl: 'Link (URL)',
    save: 'Save',
    saving: 'Saving...',
    details: 'Details',
    status: 'Status',
    draft: 'Draft',
    submitted: 'Submitted',
    rejected: 'Rejected',
    submitForReview: 'Submit for review',
    delete: 'Delete',
    edit: 'Edit',

    employees: 'Employees',
    addEmployee: 'Add employee',
    employeeProfile: 'Employee profile',
    noEmployees: 'No employees yet',
    viewProfile: 'View profile',
    achievementsCount: 'Achievements',

    notesAndEvaluation: 'Notes & evaluation',
    notes: 'Notes',
    addNote: 'Add note',
    textNote: 'Text note',
    voiceNote: 'Voice note',
    imageNote: 'Image',
    sticker: 'Encouragement sticker',
    evaluation: 'Evaluation',
    rating: 'Rating',
    comment: 'Comment',
    submitEvaluation: 'Submit evaluation',
    noNotes: 'No notes',

    noNotifications: 'No notifications',
    markAllRead: 'Mark all as read',

    settings: 'Settings',
    profile: 'Profile',
    language: 'Language',
    logout: 'Log out',
    role: 'Role',
    save_changes: 'Save changes',
    darkInfo: 'Account information',

    cancel: 'Cancel',
    confirm: 'Confirm',
    loading: 'Loading...',
    error: 'An error occurred',
    success: 'Success',
    required: 'This field is required',
    retry: 'Retry',
    add: 'Add',
    close: 'Close',
    search: 'Search',

    emailAlreadyRegistered:
      'This email is already registered. Each email holds exactly one role (employee or admin) — use a different email to register a new role.',

    workspaceEmployees: 'Employees in their workspace',

    docEditorTitle: 'Edit Document',
    docEditorHint: 'Changes are saved automatically to the same file',
    docEditorLoading: 'Opening the document…',
    docEditorReady: 'The document is ready to edit',
    docEditorOpenTab: 'Open the editor now',
    docEditorTabHint:
      'The editor opens in a new tab. Edit the document, close the tab, and come back — changes are saved automatically to the same file.',

    chooseUserType: 'Choose user type',
    chooseUserTypeHint: 'Select your role to continue',
    adminDesc: 'Manage employees, evaluate and track achievements',
    employeeDesc: 'Manage your achievements and workspace',

    verifyEmail: 'Verify your email',
    otpSentTo: 'We sent a verification code to',
    enterOtp: 'Enter the verification code',
    otpCode: 'Verification code',
    verify: 'Verify',
    verifying: 'Verifying...',
    resendOtp: 'Resend code',
    otpInvalid: 'The code is invalid or expired',

    completeYourProfile: 'Complete your details',
    educationalRegion: 'Educational region',
    selectRegion: 'Select educational region',
    workCenter: 'Work center',
    administration: 'Administration',
    saveAndContinue: 'Save and continue',

    birthDate: 'Date',
    addAchievementType: 'Add achievement',
    typeFolder: 'Folder',
    typeFile: 'File',
    typeImage: 'Image',
    typeVideo: 'Video',

    members: 'Members',
    viewMembers: 'View members',
    membersHint: 'Supervisors who can view your page',
    noMembers: 'No members yet',
    addByUserId: 'Add by User ID',
    enterUserId: 'Enter User ID',
    classification: 'Classification',
    placeInWorkspace: 'Workspace (home)',
    placeInFolder: 'Inside a folder',
    userNotFound: 'No user found with this ID',
    employeeAdded: 'Employee added',

    eSignature: 'Electronic signature',
    signHint: 'Type your full name as signature',
    evaluationLocked: 'Evaluation approved',
    evaluationLockedHint: 'This evaluation is approved and cannot be changed',
    evaluationReport: 'Evaluation report',
    evaluatedBy: 'Evaluated by',
    cannotEvaluateOwn: 'You cannot evaluate your own files',

    privacy: 'Privacy',
    changePhoto: 'Change profile photo',
    copied: 'Copied',
    copy: 'Copy',

    searchHint: 'Search achievements and employees',
    noResults: 'No results',

    folders: 'Folders',
    folderContents: 'Folder contents',
    emptyFolder: 'This folder is empty',
    addToFolder: 'Add achievement to folder',
    moveToFolder: 'Move to folder',
    noFolder: 'No folder',
    moved: 'Moved',
    employeeFolders: 'Employee folders',
    subFolders: 'Sub-folders',
    addSubFolder: 'Add sub-folder',
    addItem: 'Add',
    fromLibrary: 'From photo library',
    fromCamera: 'Take a photo',
    fromFiles: 'From files',
    developedBy: 'Developed by Hanadi Almarri',
    moveTo: 'Move to',
    deleteFolderConfirm: 'Delete this folder?',
    longPressHint: 'Long-press to edit',
    rename: 'Rename',
    newName: 'New name',

    aboutApp: 'About the app',
    termsOfUse: 'Terms of Use',
    privacyPolicy: 'Privacy Policy',
    contactUs: 'Contact us',
    version: 'Version',

    contactHeader: 'We love to hear from you',
    contactDesc:
      'Share your suggestions or feedback about Enjazaty. We read every message and reply as soon as we can.',
    yourSuggestion: 'Your suggestion or feedback',
    writeMessageHere: 'Write your message here...',
    send: 'Send',
    messageSent: 'Your message has been sent, thank you!',

    deleteAccount: 'Delete account',
    deleteAccountConfirm:
      'Are you sure you want to delete your account? All your data will be permanently deleted and cannot be recovered.',

    reports: 'Reports',
    myReport: 'My achievements report',
    generateReport: 'Generate report',
    printReport: 'Print',
    share: 'Share',
    reportFor: 'Achievements report for',
    reportDate: 'Report date',
    noData: 'No data',

    drawSignature: 'Sign here',
    clear: 'Clear',
    signatureRequired: 'Signature is required',

    signatures: 'Signatures',
    mySignatures: 'My signatures',
    savedSignatures: 'Saved signatures',
    newSignature: 'New signature',
    saveSignature: 'Save signature',
    drawNew: 'Draw new',
    useSaved: 'Saved signature',
    noSignatures: 'No saved signatures',
    signatureName: 'Signature name (optional)',
    selectSignature: 'Select a signature',
    signaturesHint: 'Create signatures with finger or pen to use when approving',

    signDocument: 'Sign & approve',
    approveDocument: 'Approve document',
    approve: 'Approve',
    dragToPlace: 'Drag the signature; use the handle to resize and rotate',
    saving_doc: 'Approving...',
    pdfSignNote: 'PDF signing is coming soon — you can sign images now',
    signedDocument: 'Signed document',

    folderEmployees: 'Employees in folder',
  },
} as const;

/** All translation keys (derived from the Arabic table). */
export type TranslationKey = keyof (typeof translations)['ar'];
