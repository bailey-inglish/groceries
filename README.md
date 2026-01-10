# EasyGroceries

Mobile-first grocery PWA with per-item tracking, saved UPC preferences, and predictive shopping lists.

Live app: [easygroceries.vercel.app](https://easygroceries.vercel.app)

## Highlights
- Mobile-only UI with bottom-right toasts and flat iconography
- Per-item inventory (one row per physical unit; quantity is always 1)
- Saved UPC preferences: first scan collects details, later scans auto-add
- Auto-run predictions on page load with lookahead suggestions (alerts a few days before expected depletion)
- Dual auth: email OTP in PWA, magic link on desktop

## Setup
1) Install deps
```bash
npm install
```

2) Env vars (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3) Database
- Run `database-schema.sql` in Supabase SQL editor.
- Email auth enabled (OTP + magic link).

4) Dev server
```bash
npm run dev
```

## Key Tables
- `inventory_items`: one row per unit, `quantity` locked to 1, `scan_out_date` marks usage.
- `inventory_history`: log of every scan in/out.
- `shopping_list`: definite items + suggestions.
- `user_locations`: custom storage locations.
- `user_product_info`: saved per-user UPC preferences (name/category/location).

## App Flows
- **Scan In**: scan → if UPC saved, auto-add; else auto-lookup → form → save prefs for next time.
- **Scan Out**: scan a barcode, oldest unscanned unit is marked out; optional add to list.
- **Shopping List**: predictions run on load; suggestions fire when within ~40% of expected cycle (or 2 days) before run-out.

## Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Deployment
Deploy to Vercel, add env vars, and set Supabase redirect URLs to your domain.

## Notes
- Camera access requires HTTPS.
- Because inventory is per-unit, bulk adds insert multiple rows (quantity input repeats single-unit inserts).
- Verify email provider is enabled in Supabase
- Check Supabase logs for email errors

### No predictions showing
- Need at least 2 complete scan cycles per item
- Click the refresh button in shopping list
- Check that `inventory_history` has data

See [DATABASE.md](DATABASE.md) for more troubleshooting help.

## 🛣️ Roadmap

- [ ] Push notifications for predicted restocks
- [ ] Barcode database integration (auto-fill item names)
- [ ] Receipt scanning with OCR
- [ ] Household sharing (multiple users, shared inventory)
- [ ] Expiration date tracking
- [ ] Price tracking and budget management
- [ ] Recipe integration
- [ ] Export data as CSV

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💬 Support

For issues or questions:
- Open an issue on GitHub
- Check [DATABASE.md](DATABASE.md) for setup help
- Review [Supabase docs](https://supabase.com/docs)

---

Made with ❤️ by [Your Name]
