---
description: Check i18n coverage — missing translations, hardcoded strings
---

Audit internationalization (i18n) coverage for Portal Guru.

## Steps

1. **Find hardcoded user-facing strings:**
   ```bash
   # Look for hardcoded Indonesian/English text in JSX (not in i18n calls)
   grep -rn '>[A-Z][a-z]' src/components/ --include="*.tsx" | grep -v 't(' | grep -v 'className' | head -30
   ```

2. **Check locale file sync:**
   ```bash
   # Compare en and id locale keys
   diff <(grep -oP "'[^']+'" src/locales/en/ -r | sort) <(grep -oP "'[^']+'" src/locales/id/ -r | sort)
   ```

3. **Find unused translation keys:**
   - List all keys in locale files
   - Check if each key is referenced in code
   - Flag orphaned keys

4. **Check translation quality:**
   - Are Indonesian translations natural (not Google Translate artifacts)?
   - Are English translations clear and consistent?
   - Do both locales have the same number of keys?

5. **Check date/number formatting:**
   - Dates should use `date-fns` with locale-aware formatting
   - Numbers should use `Intl.NumberFormat` for Indonesian locale
   - Check `utils/localeFormatting.ts` for consistency

## Output

```
i18n Coverage: X% (Y/Z keys translated)
Missing en→id: X keys
Missing id→en: X keys
Hardcoded strings: X found (list files)
Orphaned keys: X found
```

Fix priority: hardcoded strings > missing translations > orphaned keys > quality.
