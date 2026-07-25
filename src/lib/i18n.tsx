import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'en' | 'zh';

const STORAGE_KEY = 'finance-app-language';

const dict = {
  en: {
    appTitle: '💰 AI Finance Analyzer',
    signOut: 'Sign out',
    tab_dashboard: 'Dashboard',
    tab_upload: 'Upload',
    tab_budget: 'Budget',
    baseCurrency: 'Base currency',

    // Auth
    signIn: 'Sign in',
    checkEmail: 'Check your email for a login link.',
    emailPlaceholder: 'you@example.com',
    sendMagicLink: 'Send magic link',
    continueWithGoogle: 'Continue with Google',
    orContinueWithEmail: 'or continue with email',
    introTitle: 'Track your spending. Understand your habits.',
    introSubtitle: "A free, private tool that accumulates your monthly CSV exports into one growing history — so you can finally see trends month over month, get an AI-generated budget, and understand your patterns. Works with Spendee or any other budgeting app's export.",
    introStep1Title: '1. Upload a CSV',
    introStep1Desc: "Export a month of transactions from Spendee (or any budgeting app) and upload it under the Upload tab.",
    introStep2Title: '2. It accumulates',
    introStep2Desc: 'Every upload adds to your history — nothing is overwritten, and duplicates are skipped automatically.',
    introStep3Title: '3. See your dashboard',
    introStep3Desc: 'Spending trends, category breakdown, and budget vs. actual — all in one visual view.',
    introStep4Title: '4. Get an AI budget & insights',
    introStep4Desc: 'A budget benchmark and spending insights generated from your own data, fully editable anytime.',
    introPrivacyNote: 'Your data is private to your account — no one else, including other users of this app, can see it.',
    guideButton: 'Guide',
    closeGuide: 'Close',

    // Upload
    importing: 'Importing…',
    uploadHint: "Upload a CSV export from Spendee or any other budgeting app. Re-uploading a file you've already imported is safe — duplicates are skipped automatically.",
    imported: 'Imported',
    transactions: 'transactions',
    skippedDuplicate: 'Skipped as duplicate',
    skippedInvalid: 'Skipped as invalid',
    newCategoriesCreated: 'New categories created',
    viewDashboard: 'View dashboard →',

    // Column mapper
    unrecognizedFormat: "We don't recognize this format",
    mapHint: "isn't a Spendee export. Tell us which column is which — we'll remember this for next time so you won't be asked again for files from the same app.",
    dateColumn: 'Date column *',
    amountColumn: 'Amount column *',
    categoryColumn: 'Category column *',
    noteColumn: 'Note / memo column',
    walletColumn: 'Wallet / account column',
    currencyColumn: 'Currency column',
    selectColumn: 'Select column…',
    none: 'None',
    currencyOfFile: "This file's currency (e.g. USD, HKD)",
    amountSignQuestion: 'How are expenses shown in the Amount column?',
    negativeOption: 'Negative numbers (e.g. -45.00)',
    positiveOption: 'Positive numbers (e.g. 45.00)',
    dateFormatLabel: 'Date format',
    autoDetect: 'Auto-detect (works for most ISO-style dates)',
    sourceNameLabel: 'Name this source (so you recognize the saved mapping later)',
    sourceNamePlaceholder: 'e.g. Mint, Bank of America',
    preview: 'Preview (first',
    rows: 'rows)',
    importWithMapping: 'Import with this mapping',
    cancel: 'Cancel',

    // Dashboard
    loadingData: 'Loading your data…',
    couldntLoad: "Couldn't load transactions:",
    nothingHereYet: 'Nothing here yet',
    uploadToSeeSpending: 'Upload a CSV to see your spending come to life.',
    ratesWarning: "Couldn't fetch live exchange rates — showing unconverted amounts.",

    // Pulse strip
    runningTotal: 'running total',
    vsSamePoint: 'vs. same point last month',
    thisMonth: 'this month',
    lastMonth: 'last month',

    // Category ledger
    byCategory: 'By category',
    over: 'over',
    under: 'under',
    noExpenses: 'No expenses recorded yet.',

    // Trend chart
    monthOverMonth: 'Month over month',
    monthOverMonthDesc: "This is the view Spendee doesn't give you — every month you've uploaded, side by side.",
    uploadAnotherMonth: "Upload another month's CSV to start seeing the trend take shape.",

    // Budget summary
    budgetThisMonth: 'Budget this month',
    overBy: 'Over by',
    remaining: 'remaining',
    spent: 'spent',
    budget: 'budget',
    noBudgetSet: 'No budget set yet — head to the Budget tab to generate one.',

    // Benchmark setup
    setBudgetBenchmark: 'Set your budget benchmark',
    benchmarkDesc: "Based on {months} month(s) of your actual spending, an open-weight AI model will propose a monthly budget — overall and per category — with brief reasoning. You can edit anything before saving.",
    generateWithAI: 'Generate with AI',
    askingAI: 'Asking the AI…',
    quickEstimateInstead: 'Quick estimate instead',
    yourBudget: 'Your budget',
    totalMonthlyBudget: 'Total monthly budget',
    saveBudget: 'Save budget',
    saving: 'Saving…',
    regenerateWithAI: 'Regenerate with AI',
    resetToQuickEstimate: 'Reset to quick estimate',
    savedBudgetLabel: 'Your saved budget',
    aiGeneratedLabel: 'AI-generated',
    quickEstimateLabel: 'Quick estimate',
    averageSpend: 'Average spend:',
    uploadFirst: 'Upload at least one month of transactions first.',

    // Insights
    insights: 'Insights',
    regenerate: 'Regenerate',
    thinking: 'Thinking…',
    quickEstimate: 'Quick estimate',
    insightsPlaceholder: "Generate a read on your spending patterns — what's trending, what to watch for next month, and what's worth doing next.",
    useQuickEstimateInstead: 'Use quick estimate instead',
  },
  zh: {
    appTitle: '💰 AI 理財分析',
    signOut: '登出',
    tab_dashboard: '總覽',
    tab_upload: '上傳',
    tab_budget: '預算',
    baseCurrency: '基準貨幣',

    signIn: '登入',
    checkEmail: '請查看你的電郵以取得登入連結。',
    emailPlaceholder: 'you@example.com',
    sendMagicLink: '傳送登入連結',
    continueWithGoogle: '使用 Google 帳戶登入',
    orContinueWithEmail: '或使用電郵登入',
    introTitle: '記錄消費，理解你的花錢習慣。',
    introSubtitle: '一個免費、私密的工具，將你每月匯出的 CSV 紀錄累積成一份不斷增長的歷史紀錄——讓你終於能看到月與月之間的趨勢，取得 AI 產生的預算建議，並理解自己的消費模式。適用於 Spendee 或其他記帳應用程式匯出的檔案。',
    introStep1Title: '1. 上傳 CSV 檔案',
    introStep1Desc: '從 Spendee（或其他記帳應用程式）匯出一個月的交易紀錄，於「上傳」分頁上傳。',
    introStep2Title: '2. 資料會累積',
    introStep2Desc: '每次上傳都會加入你的歷史紀錄——不會覆蓋舊資料，重複的紀錄會自動略過。',
    introStep3Title: '3. 查看你的總覽',
    introStep3Desc: '消費趨勢、類別分佈、預算與實際支出比較——全部以視覺化方式呈現。',
    introStep4Title: '4. 取得 AI 預算與洞察建議',
    introStep4Desc: '根據你自己的資料產生的預算基準與消費洞察，隨時可自由修改。',
    introPrivacyNote: '你的資料僅屬於你的帳戶——包括本應用程式的其他使用者在內，任何人都無法看到。',
    guideButton: '使用指南',
    closeGuide: '關閉',

    importing: '匯入中…',
    uploadHint: '上傳 Spendee 或其他記帳應用程式匯出的 CSV 檔案。重複上傳已匯入的檔案是安全的——系統會自動略過重複的紀錄。',
    imported: '已匯入',
    transactions: '筆交易',
    skippedDuplicate: '已略過（重複）',
    skippedInvalid: '已略過（無效）',
    newCategoriesCreated: '新增類別',
    viewDashboard: '查看總覽 →',

    unrecognizedFormat: '無法識別此格式',
    mapHint: '並非 Spendee 匯出的檔案。請告訴我們每個欄位代表什麼——我們會記住設定，下次同一來源的檔案將不會再詢問。',
    dateColumn: '日期欄位 *',
    amountColumn: '金額欄位 *',
    categoryColumn: '類別欄位 *',
    noteColumn: '備註欄位',
    walletColumn: '錢包／帳戶欄位',
    currencyColumn: '貨幣欄位',
    selectColumn: '請選擇欄位…',
    none: '無',
    currencyOfFile: '此檔案的貨幣（例如 USD、HKD）',
    amountSignQuestion: '金額欄位中，支出是如何顯示的？',
    negativeOption: '負數（例如 -45.00）',
    positiveOption: '正數（例如 45.00）',
    dateFormatLabel: '日期格式',
    autoDetect: '自動偵測（適用於大部分 ISO 格式日期）',
    sourceNameLabel: '為此來源命名（方便日後辨認已儲存的設定）',
    sourceNamePlaceholder: '例如：Mint、中國銀行',
    preview: '預覽（前',
    rows: '列）',
    importWithMapping: '以此設定匯入',
    cancel: '取消',

    loadingData: '正在載入資料…',
    couldntLoad: '無法載入交易紀錄：',
    nothingHereYet: '這裡還沒有資料',
    uploadToSeeSpending: '上傳 CSV 檔案，即可查看你的消費狀況。',
    ratesWarning: '無法取得即時匯率——顯示未換算的金額。',

    runningTotal: '累計總額',
    vsSamePoint: '與上月同期比較',
    thisMonth: '本月',
    lastMonth: '上月',

    byCategory: '按類別',
    over: '超支',
    under: '未超支',
    noExpenses: '暫無支出紀錄。',

    monthOverMonth: '月度比較',
    monthOverMonthDesc: '這是 Spendee 無法提供的視角——並列顯示你上傳過的每個月份。',
    uploadAnotherMonth: '上傳另一個月份的 CSV，即可開始看到趨勢。',

    budgetThisMonth: '本月預算',
    overBy: '超支',
    remaining: '剩餘',
    spent: '已花費',
    budget: '預算',
    noBudgetSet: '尚未設定預算——請前往「預算」分頁產生預算建議。',

    setBudgetBenchmark: '設定你的預算基準',
    benchmarkDesc: '根據你 {months} 個月的實際消費紀錄，開源 AI 模型將提出每月預算建議——包含總額及各類別，並附上簡短理由。儲存前你可以自由修改。',
    generateWithAI: '以 AI 產生建議',
    askingAI: '正在詢問 AI…',
    quickEstimateInstead: '改用快速估算',
    yourBudget: '你的預算',
    totalMonthlyBudget: '每月總預算',
    saveBudget: '儲存預算',
    saving: '儲存中…',
    regenerateWithAI: '以 AI 重新產生',
    resetToQuickEstimate: '重設為快速估算',
    savedBudgetLabel: '已儲存的預算',
    aiGeneratedLabel: 'AI 產生',
    quickEstimateLabel: '快速估算',
    averageSpend: '平均消費：',
    uploadFirst: '請先上傳至少一個月的交易紀錄。',

    insights: '洞察',
    regenerate: '重新產生',
    thinking: '思考中…',
    quickEstimate: '快速估算',
    insightsPlaceholder: '產生你的消費模式分析——趨勢、下月需留意事項，以及接下來值得做的事。',
    useQuickEstimateInstead: '改用快速估算',
  },
} as const;

export type TranslationKey = keyof typeof dict.en;

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'zh' || saved === 'en' ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
  }

  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    let text: string = dict[language][key] ?? dict.en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  }

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
