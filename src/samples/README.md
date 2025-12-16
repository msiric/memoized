# Sample Content for Contributors

This directory contains sample educational content that contributors can use to get started with the Memoized platform.

## 🎯 What's in here?

Sample courses that demonstrate the content structure and showcase the platform's capabilities:

### 📚 **JavaScript Track** (`js-track/`)

- **Core Fundamentals**: Variables lesson (FREE access)
- **TypeScript Introduction**: TypeScript basics lesson (PREMIUM access sample)

### 📈 **Data Structures & Algorithms Track** (`dsa-track/`)

- **Built-in Data Structures**: Basic overview (FREE access)

## 🚀 Quick Start

1. **Copy samples to working directory**:

   ```bash
   yarn setup:content
   ```

2. **Sync to database**:

   ```bash
   yarn sync:all:dev
   ```

3. **Start development**:
   ```bash
   yarn dev
   ```

## 📖 Content Structure (JSON-Based)

We use a **modern JSON configuration system** for better maintainability:

### Lesson Metadata (`_lessons.json`)

```json
{
  "lessons": [
    {
      "id": "/variables",
      "title": "Variables",
      "description": "Learn about variable declarations, scoping, and hoisting",
      "order": 1,
      "access": "FREE",
      "problems": [
        {
          "title": "Variable Declaration Challenge",
          "href": "https://leetcode.com/problems/...",
          "difficulty": "EASY",
          "question": "Practice variable declarations...",
          "answer": "Solution explanation...",
          "type": "fundamentals"
        }
      ]
    }
  ]
}
```

### Lesson Content (MDX Files)

```mdx
# Variables in JavaScript

Learn about variable declarations with `let`, `const`, and `var`.

## Declaration Types

### `let` Declarations

- Block scoped
- Can be reassigned
- Cannot be redeclared

### `const` Declarations

- Block scoped
- Cannot be reassigned
- Must be initialized

## Code Examples

\`\`\`javascript
let userName = "Alice";
const API_KEY = "secret123";
\`\`\`
```

## 🛠️ Adding New Content

### 1. **Add lesson to JSON config**:

Edit the appropriate `_lessons.json` file:

```json
{
  "lessons": [
    {
      "id": "/your-new-lesson",
      "title": "Your New Lesson",
      "description": "What students will learn",
      "order": 2,
      "access": "FREE"
    }
  ]
}
```

### 2. **Create the lesson file**:

Create `your-new-lesson/page.mdx`:

```mdx
# Your New Lesson

Educational content goes here with:

- Clear explanations
- Code examples
- Practice exercises
- Visual aids
```

### 3. **Test your content**:

```bash
yarn setup:content  # Copy your changes
yarn sync:all:dev   # Update database
yarn dev            # Test locally
```

## 📋 Content Guidelines

### ✅ **Do Include**:

- **Clear explanations** of concepts
- **Practical code examples**
- **Progressive difficulty** - start simple
- **Interactive elements** - problems and exercises
- **Real-world applications**
- **Best practices** and common pitfalls

### ❌ **Don't Include**:

- Copyrighted material
- Overly complex examples for beginners
- Outdated or deprecated techniques
- Personal opinions without justification
- Content not suitable for all ages

### 🎨 **Style Guide**:

- Use **clear, concise language**
- Include **code comments** in examples
- Add **visual breaks** with headings and lists
- Use **consistent terminology** throughout
- **Test all code examples** before submitting

## 📁 Directory Structure

```
src/samples/
├── README.md                    # This file
├── js-track/
│   ├── page.mdx                # Course overview
│   ├── core-fundamentals/
│   │   ├── page.mdx           # Section overview
│   │   ├── _lessons.json      # Lesson configurations
│   │   └── variables/
│   │       └── page.mdx       # Lesson content
│   └── typescript-introduction/
│       ├── page.mdx
│       ├── _lessons.json
│       └── ts-basics/
│           └── page.mdx
└── dsa-track/
    ├── page.mdx
    └── built-in-data-structures/
        ├── page.mdx
        └── arrays/
            └── page.mdx
```

## 🤝 Contributing

1. **Fork the repository**
2. **Edit files in `src/samples/`** (not `src/content/`)
3. **Test your changes** with `yarn setup:content && yarn sync:all:dev && yarn dev`
4. **Submit a pull request** with clear description

## 🆘 Need Help?

- 📖 Check [CONTRIBUTING.md](../../CONTRIBUTING.md) for detailed guidelines
- 🐛 Open an issue for questions or problems
- 💬 Look at existing sample files for formatting examples
- 🔍 Review the [content working directory](../content/README.md) documentation
