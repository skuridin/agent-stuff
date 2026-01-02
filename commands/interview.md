---
description: Interview the user to gather requirements for improving code or understanding a topic
argument-hint: "[goal] [file-path]"
---

# Interview Mode

You are conducting an interactive interview with the user to gather information and requirements.

## Arguments Provided
- **Goal/Topic**: $ARGUMENTS

## Instructions

### 1. Parse the Input

First, analyze the arguments to determine:
- Is there a file path mentioned? (look for paths like `src/...`, `./...`, or file extensions)
- What is the goal? (e.g., "improve", "refactor", "understand", "document", "review")

If a file is mentioned:
- Read the file using the Read tool
- Analyze its structure, patterns, and potential areas for discussion

If no specific input is provided:
- Ask the user what they'd like to discuss (current session context, a specific file, or a topic)

### 2. Conduct the Interview

Use an appropriate tool for asking user questions, if available:
- `AskUserQuestion`, `ask_user`, or similar
- Otherwise, ask questions directly in conversation

Either way, follow these guidelines:

- Ask **one question at a time** (or 2-3 related questions max)
- Provide **2-4 concrete answer options** that represent common choices
- Users can always select "Other" for free-form input
- Keep questions focused and actionable

**Question flow:**

1. **Clarify the goal** (if not clear from arguments)
   - What outcome are you hoping for?
   - What problem are you trying to solve?

2. **Understand constraints** (based on the goal)
   - Are there specific patterns/conventions to follow?
   - Any areas that should NOT be changed?
   - Performance, readability, or maintainability priorities?

3. **Gather specifics** (for code improvements)
   - Which parts feel problematic?
   - What would "better" look like?
   - Are there examples you'd like to emulate?

4. **Validate assumptions**
   - Confirm your understanding before proceeding
   - Check if there's anything you missed

### 3. Track Progress

After each answer, assess:
- Do I have enough information to make a concrete suggestion?
- Are there critical unknowns remaining?

Continue interviewing until you can provide **actionable recommendations**.

### 4. Provide Recommendations

Once you have sufficient information:

1. **Summarize** what you learned from the interview
2. **Present options** with trade-offs (if applicable)
3. **Recommend** a specific approach with justification
4. **Ask for approval** before implementing changes

## Example Question Formats

```
Question: "What's the main issue with this code?"
Options:
- "It's hard to understand/maintain"
- "It has performance problems"
- "It doesn't handle edge cases well"
- "It needs new functionality added"
```

```
Question: "How should we handle the complex state logic?"
Options:
- "Extract to a custom hook"
- "Use useReducer pattern"
- "Split into smaller components"
```

## Important

- Be conversational but efficient - don't ask unnecessary questions
- If the user's answers reveal the solution is obvious, skip remaining questions
- Always explain WHY you're asking something if it's not obvious
- Respect the user's time - aim for 3-6 questions max before making suggestions
