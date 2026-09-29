# Project: Portal Guru Voice Grade Enhancement

## Architecture
The Voice Grade feature in Portal Guru follows a clean Ports & Adapters (Hexagonal) architecture:
- **Speech Parsing Utility** (`src/utils/indonesianSpeechParser.ts`): Pure algorithmic parser that normalizes Indonesian speech text, tokenizes phonetic words, parses compound numbers, handles decimals/fractions and correction keywords, and extracts (studentName, score) pairs.
- **Voice Ports & Adapters** (`src/components/pages/mass-input/engine/voicePorts.ts`): Defines the `ISpeechRecognitionPort` interface and provides the browser-native `BrowserSpeechRecognitionAdapter` wrapping `webkitSpeechRecognition` / `SpeechRecognition`. Manages low-level recognition lifecycle, restarts, and error callbacks.
- **Engine Controller** (`src/components/pages/mass-input/engine/VoiceGradeController.ts`): State machine managing the student roster, active student index, scores map, recognition modes (Urut Absen vs Mode Bebas), recently saved grace periods for corrections, audio cue feedback, and undo history.
- **React Adapter Hook** (`src/components/pages/mass-input/engine/useVoiceGradeEngine.ts`): Binds the controller instance to React component state.
- **UI Modal Presentation** (`src/components/pages/mass-input/components/VoiceGradeModal.tsx`): Renders mic indicators, audio activity wave, interim & final transcripts, roster table, navigation controls, and handles keyboard shortcuts.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1. Decimals & Fractions Recognition | Spoken words ("koma", "setengah", "seperempat", "tiga per empat") and numeric decimals ("8.5", "8,5") parsed to valid floating-point numbers without integer magnification. | M1 | survey_1 |
| 2 | F2. Regional Dialects & Slang Numbers | Javanese 21-29 (-likur series: `selikur`..`songolikur`, `slawe`), tens prefixes (`rong`, `telung`, `wolung` puluh), Hokkien slang (`gocap`, `cepek`), and unspaced STT tokens (`delapanpuluh`, `duabelas`). | M1 | survey_1 |
| 3 | F3. Natural Conversational Corrections | Mid-sentence and conversational ralat patterns (`"eh bukan, 90"`, `"75 ralat 80"`). Eliminate 450ms race condition so delayed ralat reliably targets the previously graded student. | M1 | survey_1, survey_2 |
| 4 | F4. Web Speech Adapter Safety & Error Handling | Stop restart crash loop on fatal mic errors (`not-allowed`, `audio-capture`, `service-not-allowed`). Prevent duplicate `onEnd` callbacks. Informative Indonesian error guidance. | M2 | survey_2 |
| 5 | F5. Mic Lifecycle Silence & Context Preservation | Auto reconnect on browser silence timeouts (`no-speech` -> `onend`) without dropping student roster, scores, active student, or undo history. | M2 | survey_2 |
| 6 | F6. Global Keyboard Navigation | Space to toggle listening (jeda/mulai), ArrowLeft/ArrowRight to navigate students, Ctrl+Z to undo/ralat. Ignored when typing in input fields. | M3 | survey_1, survey_2, survey_3 |
| 7 | F7. Antislop & WCAG AA Accessibility | Touch targets $\ge 44 \times 44\text{ px}$, visible `:focus-visible` rings on all interactive elements, WCAG AA contrast ratio $\ge 4.5:1$ across all light/dark text pairings. Float scores in Mode Bebas. | M3 | survey_3 |
| 8 | F8. Dynamic Audio Activity & Transcript Visuals | Animated multi-bar sound wave during listening, clear high-contrast interim text, persistent recognized transcript badges. | M3 | survey_3 |
| 9 | F9. Comprehensive Test Suite & Typecheck Gate | Complete Vitest unit & integration test coverage for all voice features (parser, controller, modal). Zero TypeScript errors on `npx tsc --noEmit`. Clean forensic audit. | M4 | survey_1, survey_2, survey_3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Parsing Engine & Lexical Recognition | Decimals/fractions, regional dialects (-likur, tens), conversational ralat regex, and controller grace period ralat fix | none | IN_PROGRESS |
| M2 | Microphone Lifecycle & Robustness | Web Speech adapter error handling, crash loop prevention, silence reconnect, and context retention | M1 | PLANNED |
| M3 | Visual Feedback, Accessibility & Keyboard | Keyboard shortcuts (Space, Arrow keys, Undo), touch targets >= 44px, focus rings, WCAG AA contrast, sound wave indicator | M1, M2 | PLANNED |
| M4 | Final Acceptance & Quality Gates | Comprehensive test suite execution, 100% Vitest pass, clean TypeScript exit 0, forensic audit verification | M1, M2, M3 | PLANNED |

## Interface Contracts
### `indonesianSpeechParser` ↔ `VoiceGradeController`
- `parseIndonesianNumber(text: string): number | null`: Supports integers and decimals (e.g. `80.5`, `7.5`). Returns `null` if unparseable.
- `parseSpokenInput(text: string, options?: ParseSpokenInputOptions): SpokenInputResult`:
  - `result.type`: `'grade_only' | 'correction' | 'student_and_grade' | 'navigation' | 'unknown'`
  - `result.value`: number (integer or float, e.g. `85.5`)
  - `result.action`: `'next' | 'prev' | 'clear' | 'unknown'`
  - `result.studentName`: string (if student matched)
  - `result.isCorrection`: boolean

### `voicePorts.ts` ↔ `VoiceGradeController`
- `ISpeechRecognitionPort`:
  - `start(): void`
  - `stop(): void`
  - `abort(): void`
  - `isAvailable(): boolean`
  - `isListening(): boolean`
  - `setHandlers(handlers: SpeechRecognitionHandlers): void`
- `SpeechRecognitionHandlers`:
  - `onResult(text: string, isFinal: boolean): void`
  - `onError(error: string, message?: string): void`
  - `onEnd(): void`

### `VoiceGradeController` ↔ `VoiceGradeModal`
- Controller methods:
  - `toggleListening(): void`
  - `nextStudent(): void`
  - `prevStudent(): void`
  - `undoLastChange(): void`
  - `updatePairScore(index: number, score: number): void`
- State emitted via `onStateChange`:
  - `isListening: boolean`
  - `interimText: string`
  - `errorMessage: string | null`
  - `activeStudent: Student | null`
  - `scores: Record<string, number>`

## Code Layout
- `src/utils/indonesianSpeechParser.ts` — Speech parser functions and vocabulary constants
- `src/components/pages/mass-input/engine/voicePorts.ts` — Web Speech API port and browser adapter
- `src/components/pages/mass-input/engine/VoiceGradeController.ts` — Voice grading business logic & state machine
- `src/components/pages/mass-input/engine/useVoiceGradeEngine.ts` — React hook integration
- `src/components/pages/mass-input/components/VoiceGradeModal.tsx` — UI modal and presentation
- `tests/unit/indonesianSpeechParser.test.ts` — Parser unit tests
- `tests/unit/VoiceGradeController.test.ts` — Controller unit tests
- `tests/unit/VoiceGradeModal.test.tsx` — UI modal unit tests
