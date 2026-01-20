import React from 'react';
import {
    Home,
    Users,
    Calendar,
    Clipboard,
    LogOut,
    Sun,
    Moon,
    ArrowLeft,
    ArrowRight,
    CheckCircle,
    XCircle,
    Edit,
    AlertCircle,
    FileText,
    Settings,
    GraduationCap,
    Plus,
    Pencil,
    Trash,
    Sparkles,
    User,
    UserCheck,
    UserPlus,
    UserMinus,
    BarChart,
    BookOpen,
    Clock,
    Palette,
    Bell,
    Shield,
    ShieldAlert,
    ShieldPlus,
    Camera,
    BrainCircuit,
    TrendingUp,
    CloudDownload,
    Link,
    AlertTriangle,
    LayoutGrid,
    List,
    Search,
    CheckSquare,
    Printer,
    ClipboardPen,
    ClipboardPaste,
    Mail,
    Lock,
    Eye,
    EyeOff,
    KeyRound,
    Copy,
    CopyCheck,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Send,
    Share2,
    Check,
    Undo2,
    MoreVertical,
    ChevronDown,
    ChevronUp,
    Heart,
    Info,
    RefreshCw,
    Activity,
    Filter,
    Database,
    UploadCloud,
    Save,
    MoreHorizontal,
    Inbox,
    PlayCircle,
    Download,
    X,
    Upload,
    FileSpreadsheet,
    Loader2,
    Keyboard,
    WifiOff,
    Image as ImageIconLucide,
    Award,
    Target,
    Minus,
    TrendingDown,
    Star
} from 'lucide-react';

// Re-export Lucide icons with original names for backward compatibility
export const HomeIcon = Home;
export const UsersIcon = Users;
export const CalendarIcon = Calendar;
export const ClipboardIcon = Clipboard;
export const LogoutIcon = LogOut;
export const SunIcon = Sun;
export const MoonIcon = Moon;
export const ArrowLeftIcon = ArrowLeft;
export const CheckCircleIcon = CheckCircle;
export const XCircleIcon = XCircle;
export const EditIcon = Edit;
export const AlertCircleIcon = AlertCircle;
export const FileTextIcon = FileText;
export const SettingsIcon = Settings;
export const GraduationCapIcon = GraduationCap;
export const PlusIcon = Plus;
export const PencilIcon = Pencil;
export const TrashIcon = Trash;
export const SparklesIcon = Sparkles;
export const UserCircleIcon = User; // Lucide doesn't have exact UserCircle, User is close
export const UserCheckIcon = UserCheck;
export const UserPlusIcon = UserPlus;
export const UserMinusIcon = UserMinus;
export const BarChartIcon = BarChart;
export const BookOpenIcon = BookOpen;
export const ClockIcon = Clock;
export const PaletteIcon = Palette;
export const BellIcon = Bell;
export const ShieldIcon = Shield;
export const ShieldAlertIcon = ShieldAlert;
export const ShieldPlusIcon = ShieldPlus;
export const CameraIcon = Camera;
export const BrainCircuitIcon = BrainCircuit;
export const TrendingUpIcon = TrendingUp;
export const DownloadCloudIcon = CloudDownload;
export const LinkIcon = Link;
export const AlertTriangleIcon = AlertTriangle;
export const LayoutGridIcon = LayoutGrid;
export const ListIcon = List;
export const SearchIcon = Search;
export const CheckSquareIcon = CheckSquare;
export const PrinterIcon = Printer;
export const ClipboardPenIcon = ClipboardPen;
export const ClipboardPasteIcon = ClipboardPaste;
export const MailIcon = Mail;
export const LockIcon = Lock;
export const EyeIcon = Eye;
export const EyeOffIcon = EyeOff;
export const KeyRoundIcon = KeyRound;
export const CopyIcon = Copy;
export const CopyCheckIcon = CopyCheck;
export const ChevronLeftIcon = ChevronLeft;
export const ChevronRightIcon = ChevronRight;
export const MessageSquareIcon = MessageSquare;
export const SendIcon = Send;
export const Share2Icon = Share2;
export const CheckIcon = Check;
export const Undo2Icon = Undo2;
export const MoreVerticalIcon = MoreVertical;
export const ChevronDownIcon = ChevronDown;
export const ChevronUpIcon = ChevronUp;
export const HeartIcon = Heart;
export const InfoIcon = Info;
export const RefreshCwIcon = RefreshCw;
export const ActivityIcon = Activity;
export const FilterIcon = Filter;
export const DatabaseIcon = Database;
export const UploadCloudIcon = UploadCloud;
export const SaveIcon = Save;
export const MoreHorizontalIcon = MoreHorizontal;
export const InboxIcon = Inbox;
export const ArrowRightIcon = ArrowRight;
export const PlayCircleIcon = PlayCircle;
export const DownloadIcon = Download;
export const XIcon = X;
export const UploadIcon = Upload;
export const FileSpreadsheetIcon = FileSpreadsheet;
export const Loader2Icon = Loader2;
export const KeyboardIcon = Keyboard;
export const WifiOffIcon = WifiOff;
export const ImageIcon = ImageIconLucide;

// Custom Icons that don't have direct equivalents or need specific styling
export const IconH: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor" stroke="none" style={{ fontFamily: 'sans-serif' }}>H</text>
    </svg>
);

export const IconI: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor" stroke="none" style={{ fontFamily: 'sans-serif' }}>I</text>
    </svg>
);

export const IconS: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor" stroke="none" style={{ fontFamily: 'sans-serif' }}>S</text>
    </svg>
);

export const IconA: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor" stroke="none" style={{ fontFamily: 'sans-serif' }}>A</text>
    </svg>
);

export const IconL: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor" stroke="none" style={{ fontFamily: 'sans-serif' }}>L</text>
    </svg>
);

// New icon exports
export const AwardIcon = Award;
export const TargetIcon = Target;
export const MinusIcon = Minus;
export const TrendingDownIcon = TrendingDown;
export const StarIcon = Star;
