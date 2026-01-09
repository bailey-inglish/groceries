# Contributing to Groceries Inventory Manager

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/groceries.git`
3. Install dependencies: `npm install`
4. Set up Supabase following `SETUP.md`
5. Create `.env.local` with your Supabase credentials
6. Start development server: `npm run dev`

## Project Structure

```
groceries/
├── app/                    # Next.js app directory
│   ├── inventory/         # Inventory page
│   ├── recommendations/   # Shopping recommendations page
│   ├── scan/             # Barcode scanning page
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
│   └── BarcodeScanner.tsx
├── lib/                   # Utility libraries
│   └── supabase.ts       # Supabase client and functions
├── public/               # Static assets
│   ├── manifest.json     # PWA manifest
│   └── icon-info.txt     # Icon generation guide
├── DATABASE.md           # Database schema documentation
├── FEATURES.md          # Feature documentation
├── SETUP.md             # Setup guide
└── README.md            # Main documentation
```

## Coding Standards

### TypeScript

- Use TypeScript for all new files
- Define proper types and interfaces
- Avoid `any` type when possible
- Use strict mode

### React/Next.js

- Use functional components with hooks
- Use 'use client' directive for client components
- Follow Next.js 14 App Router conventions
- Keep components focused and reusable

### Styling

- Use Tailwind CSS utility classes
- Follow existing color scheme and spacing
- Ensure responsive design (mobile-first)
- Test on multiple screen sizes

### Code Quality

- Run `npm run lint` before committing
- Fix all ESLint errors
- Follow existing code style
- Add comments for complex logic

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Use descriptive branch names:
- `feature/` for new features
- `fix/` for bug fixes
- `docs/` for documentation
- `refactor/` for code refactoring

### 2. Make Your Changes

- Keep commits small and focused
- Write clear commit messages
- Test your changes thoroughly
- Update documentation if needed

### 3. Test Your Changes

```bash
# Run linter
npm run lint

# Build the project
npm run build

# Test manually
npm run dev
```

### 4. Submit a Pull Request

1. Push your branch to your fork
2. Create a Pull Request on GitHub
3. Describe your changes clearly
4. Link any related issues
5. Wait for review

## Pull Request Guidelines

### Good PR Description Template

```markdown
## What does this PR do?
Brief description of the changes.

## Why is this change needed?
Explain the problem or feature request.

## How was this tested?
Describe how you tested the changes.

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows project style
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No console errors
- [ ] Works on mobile and desktop
```

## Feature Requests

Have an idea for a new feature?

1. Check existing issues to avoid duplicates
2. Create a new issue with:
   - Clear description of the feature
   - Use case and benefits
   - Possible implementation approach
3. Wait for discussion and approval
4. Start working on it!

## Bug Reports

Found a bug?

1. Check if it's already reported
2. Create a new issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Browser/device information
3. Use the bug report template

## Areas for Contribution

### High Priority

- [ ] Implement service worker for offline support
- [ ] Add PWA icons
- [ ] Improve error handling
- [ ] Add loading states
- [ ] Write tests

### Medium Priority

- [ ] Add product name lookup from UPC database
- [ ] Implement barcode generation for custom items
- [ ] Add export/import functionality
- [ ] Create usage analytics dashboard
- [ ] Add price tracking

### Low Priority

- [ ] Dark mode support
- [ ] Accessibility improvements
- [ ] Internationalization (i18n)
- [ ] Custom themes
- [ ] Voice input

### Documentation

- [ ] Add API documentation
- [ ] Create video tutorials
- [ ] Write blog posts
- [ ] Improve code comments
- [ ] Add more examples

## Development Tips

### Working with Supabase

- Test database queries in Supabase SQL Editor first
- Use TypeScript types that match your database schema
- Handle errors gracefully
- Consider adding indexes for performance

### Testing Barcode Scanner

- Use online barcode generators for testing
- Test with real products when possible
- Try different lighting conditions
- Test on multiple devices

### Debugging

- Use React DevTools
- Check browser console for errors
- Use Supabase logs for database issues
- Test with and without network

## Code Review Process

1. Maintainer reviews your PR
2. Feedback is provided (if needed)
3. You make requested changes
4. PR is approved and merged

Please be patient and respectful during review!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

- Open an issue for questions
- Check existing documentation
- Ask in pull request comments

Thank you for contributing! 🙏
