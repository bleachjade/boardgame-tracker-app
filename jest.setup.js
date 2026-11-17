import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => {
  const icons = [
    "Library", "Sparkles", "FolderOpen", "Users", "Trash2", "Plus", "Copy", 
    "ClipboardPaste", "LogOut", "X", "UserCheck", "CalendarDays", "Globe",
    "Check", "Trophy", "FolderPlus", "Puzzle", "Shuffle", "BookOpen", 
    "ListChecks", "Filter", "ArrowDownAZ", "Sun", "Moon", "LayoutGrid", 
    "LayoutList", "UserPlus", "Heart", "Search", "Loader2", "HeartHandshake", 
    "Unlink", "UserMinus", "QrCode", "ScanLine", "MapPin", "CheckCircle2", 
    "XCircle", "Clock", "PartyPopper", "Link", "Image", "Calculator", 
    "History", "Mic", "MicOff", "Circle", "Send", "Layers", "PiggyBank", 
    "Edit3", "Languages", "Box", "Info", "Bot", "Calendar", "CameraOff", 
    "ScanLine"
  ];
  
  const mockIcons: Record<string, any> = {};
  icons.forEach(name => {
    mockIcons[name] = ({ children, ...props }: any) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
  });
  
  return {
    __esModule: true,
    ...mockIcons,
  };
});

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: () => null,
}));

// Mock canvas-confetti
jest.mock("canvas-confetti", () => jest.fn());

// Mock QRCode
jest.mock("qrcode", () => ({
  toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,mock"),
}));

// Mock jsqr
jest.mock("jsqr", () => jest.fn());

// Mock @lottiefiles/dotlottie-react
jest.mock("@lottiefiles/dotlottie-react", () => ({
  DotLottieReact: ({ children, ...props }: any) => (
    <div data-testid="lottie" {...props} />
  ),
}));

// Mock Google GenAI
jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn().mockResolvedValue({ text: "Mock AI response" }),
    },
  })),
}));

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
  initReactI18next: { type: "3rdParty" },
}));

// Mock i18next-browser-languagedetector
jest.mock("i18next-browser-languagedetector", () => ({
  __esModule: true,
  default: { type: "3rdParty" },
}));

// Mock fast-xml-parser
jest.mock("fast-xml-parser", () => ({
  XMLParser: jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockReturnValue({ items: { item: [] } }),
  })),
}));

// Mock DOMParser for XML parsing
global.DOMParser = class DOMParser {
  parseFromString() {
    return {
      getElementsByTagName: () => [],
    };
  }
};

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.("Warning: ReactDOM.render is no longer supported")) return;
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});