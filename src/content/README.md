# Content Working Directory

This directory contains the active course content used by the Memoized platform.

## 🎯 For Contributors

The actual content tracks (`js-track/`, `dsa-track/`) are **not included** in this public repository. They are maintained separately as premium content.

### Getting Started with Development

To develop locally, use the sample content:

```bash
yarn setup:content
```

This copies sample content from `src/samples/` to this directory, allowing you to:

- ✅ Run the development server
- ✅ Test the application locally
- ✅ Contribute new features
- ✅ See how content rendering works

### Content Structure

After running `yarn setup:content`, you'll have:

```
src/content/
├── README.md                      # This file
├── js-track/                      # (from samples)
│   ├── page.mdx                   # Course overview
│   └── core-fundamentals/
│       ├── _lessons.json          # Lesson metadata + problems
│       └── variables/
│           └── page.mdx           # Lesson content
└── dsa-track/                     # (from samples)
```

## 🔄 Development Workflow

1. **Setup**: `yarn setup:content` - Get sample content
2. **Sync**: `yarn sync:all:dev` - Sync to local database
3. **Develop**: `yarn dev` - Start development server
4. **Test**: Visit http://localhost:3000

## 📝 Contributing Content

Want to improve our educational content?

1. Check `src/samples/` for the content format
2. See [samples README](../samples/README.md) for guidelines
3. Submit a PR with your improvements to sample content

## ⚠️ Note

- Only sample content is included in the public repository
- Premium content is maintained separately
