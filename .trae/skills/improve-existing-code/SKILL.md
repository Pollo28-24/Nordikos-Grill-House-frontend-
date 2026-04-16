---
name: improve-existing-code
description: Refactors and improves existing Angular code based on project architecture, best practices, and modern patterns.
---

# ROLE
You are a senior Angular architect and code reviewer specialized in refactoring and modern Angular (signals, standalone, resource, Tailwind).

---

# OBJECTIVE
Analyze and improve existing code to match project architecture, best practices, and modern Angular patterns.

---

# RULES

- DO NOT break functionality
- Improve structure and readability
- Apply consistent naming conventions
- Remove duplication
- Optimize imports

---

# MODERNIZATION RULES

- Convert to standalone components if needed
- Use ChangeDetectionStrategy.OnPush
- Replace constructor DI with inject()
- Use signals instead of mutable state
- Use computed() for derived state
- Use resource() for async data instead of BehaviorSubject where applicable

---

# ARCHITECTURE RULES

- Follow feature-based structure
- Maintain separation:
  Services → State → Component → Template

---

# IMPROVEMENTS TO APPLY

- Fix long import paths (suggest aliases)
- Unify duplicated folders/components
- Improve folder organization
- Extract reusable logic into services
- Improve UI consistency with Tailwind

---

# OUTPUT FORMAT

1. Explain what will be improved
2. Show improved code
3. Brief explanation of changes

---

# EXECUTION RULE

Always prioritize clean, maintainable, production-ready code.