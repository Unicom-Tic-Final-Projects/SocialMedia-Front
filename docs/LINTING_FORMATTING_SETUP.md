# Linting and Formatting Setup

## ✅ Phase 1 Complete: Tooling Setup

### Installed Packages

- **ESLint** (v8.57.1) - JavaScript/TypeScript linter
- **Prettier** (v3.7.4) - Code formatter
- **@angular-eslint/eslint-plugin** - Angular-specific ESLint rules
- **@angular-eslint/template-parser** - Angular template parser
- **@angular-eslint/eslint-plugin-template** - Angular template linting rules
- **@typescript-eslint/eslint-plugin** - TypeScript ESLint rules
- **@typescript-eslint/parser** - TypeScript parser for ESLint
- **eslint-config-prettier** - Disables ESLint rules that conflict with Prettier
- **eslint-plugin-prettier** - Runs Prettier as an ESLint rule

### Configuration Files Created

1. **`.eslintrc.json`** - ESLint configuration with Angular and TypeScript rules
2. **`.prettierrc`** - Prettier formatting rules
3. **`.prettierignore`** - Files/directories to ignore when formatting
4. **`.editorconfig`** - Updated with comprehensive editor settings

### NPM Scripts Added

```json
{
  "lint": "eslint . --ext .ts,.html",
  "lint:fix": "eslint . --ext .ts,.html --fix",
  "format": "prettier --write \"src/**/*.{ts,html,css,scss,json}\"",
  "format:check": "prettier --check \"src/**/*.{ts,html,css,scss,json}\"",
  "check:size": "powershell -Command \"Get-ChildItem -Path src -Recurse -Filter *.ts | ForEach-Object { $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines; [PSCustomObject]@{Lines=$lines;File=$_.FullName} } | Sort-Object Lines -Descending | Select-Object -First 20 | Format-Table -AutoSize\""
}
```

### Code Formatting

✅ **All source files have been formatted** using Prettier:
- 200+ TypeScript files formatted
- 200+ HTML templates formatted
- CSS files formatted
- JSON configuration files formatted

## Usage

### Format Code
```bash
npm run format
```
Formats all TypeScript, HTML, CSS, and JSON files in the `src/` directory.

### Check Formatting
```bash
npm run format:check
```
Checks if files are formatted correctly without making changes (useful for CI/CD).

### Lint Code
```bash
npm run lint
```
Runs ESLint on all TypeScript and HTML files, reporting errors and warnings.

### Auto-fix Linting Issues
```bash
npm run lint:fix
```
Automatically fixes linting issues where possible (e.g., formatting, simple rule violations).

### Check File Sizes
```bash
npm run check:size
```
Lists the 20 largest TypeScript files in the project (helps identify files that need refactoring).

## ESLint Rules Configured

### TypeScript Rules
- ✅ Enforces `prefer-const` (use `const` instead of `let` when possible)
- ✅ Disallows `var` declarations
- ✅ Warns on `any` types
- ✅ Errors on unused variables (except those prefixed with `_`)
- ✅ Warns on `console.log` (allows `console.warn` and `console.error`)

### Angular Rules
- ✅ Component selectors must use `app-` prefix with kebab-case
- ✅ Directive selectors must use `app` prefix with camelCase
- ✅ Prefers `inject()` function over constructor injection
- ✅ Enforces button type attributes in templates
- ✅ Prefers Angular's built-in control flow (`@if`, `@for`) over structural directives

### Prettier Integration
- ✅ Prettier runs as an ESLint plugin
- ✅ Prettier formatting is enforced through ESLint
- ✅ Conflicts between ESLint and Prettier are resolved

## Prettier Configuration

- **Print Width**: 100 characters (120 for HTML/CSS)
- **Tab Width**: 2 spaces
- **Semicolons**: Required
- **Quotes**: Single quotes
- **Trailing Commas**: ES5 compatible
- **Arrow Parens**: Avoid when possible
- **End of Line**: LF (Unix-style)

## Next Steps

### Phase 2: Fix Linting Errors
**Status**: In Progress (Admin pages completed ✅)

Run `npm run lint` to see current linting errors. Common issues:
- Missing `type` attributes on buttons
- Using `*ngIf`/`*ngFor` instead of `@if`/`@for`
- Constructor injection instead of `inject()` function
- `any` types that should be more specific

**Progress**: See `LINTING_PHASE2_PROGRESS.md` for detailed progress and patterns.

### Phase 3: Refactor Large Components
- Split `social-account-page.ts` (418 lines) into smaller components
- Extract OAuth handling to a service
- Create reusable components

### Phase 4: Refactor Large Services
- Split `social-accounts.service.ts` (437 lines) into focused services
- Extract OAuth logic
- Extract manual connect logic

## IDE Integration

### VS Code
Install these extensions:
- **ESLint** (dbaeumer.vscode-eslint)
- **Prettier** (esbenp.prettier-vscode)

Add to `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[html]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### WebStorm/IntelliJ
- Enable ESLint: Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
- Enable Prettier: Settings → Languages & Frameworks → JavaScript → Prettier
- Enable "Run on save" for both

## CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Check formatting
  run: npm run format:check

- name: Lint code
  run: npm run lint
```

## Troubleshooting

### ESLint not finding plugins
If you see "plugin not found" errors:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install`
3. Verify packages are in `devDependencies`

### Prettier conflicts with ESLint
The `eslint-config-prettier` package should handle this automatically. If you see conflicts:
1. Ensure `prettier` is last in the `extends` array
2. Run `npm run lint:fix` to auto-resolve

### Format on save not working
1. Check IDE settings for format on save
2. Ensure Prettier is set as default formatter
3. Restart IDE after installing extensions

## Summary

✅ **Phase 1 Complete!**
- All tooling installed and configured
- All source files formatted
- Ready for Phase 2: Fix linting errors and refactor large components

